"""TF-IDF + Logistic Regression expense category classifier.

The pipeline is trained on a curated educational dataset and persisted with
Joblib. Predictions always come from the trained model; nothing is hardcoded.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline

from app.core.config import settings
from app.core.constants import CATEGORY_VALUES

logger = logging.getLogger(__name__)

MODEL_NAME = "TF-IDF + Logistic Regression"
MODEL_VERSION = "1.0.0"
RANDOM_STATE = 42
TEST_SIZE = 0.2

_model_lock = threading.Lock()
_cached_pipeline: Pipeline | None = None
_cached_metadata: dict | None = None


class ModelUnavailableError(RuntimeError):
    """Raised when the classifier artifact is missing and cannot be trained."""


def build_pipeline() -> Pipeline:
    """Word + character TF-IDF features feeding a logistic regression.

    Character n-grams help with Indian English and spelling variations
    ("recharge", "re-charge", short bank narrations). ``C=8`` was selected with
    5-fold cross-validation on the training split only; the held-out test set
    is never used for tuning.
    """
    features = FeatureUnion(
        [
            (
                "word_tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    strip_accents="unicode",
                    ngram_range=(1, 2),
                    min_df=1,
                    max_df=0.95,
                    sublinear_tf=True,
                ),
            ),
            (
                "char_tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    strip_accents="unicode",
                    analyzer="char_wb",
                    ngram_range=(3, 5),
                    min_df=1,
                    sublinear_tf=True,
                ),
            ),
        ]
    )
    return Pipeline(
        steps=[
            ("tfidf", features),
            (
                "classifier",
                LogisticRegression(
                    max_iter=3000,
                    C=8.0,
                    class_weight="balanced",
                    random_state=RANDOM_STATE,
                ),
            ),
        ]
    )


def load_dataset(path: str | Path | None = None) -> pd.DataFrame:
    dataset_path = Path(path or settings.TRAINING_DATASET_PATH)
    if not dataset_path.exists():
        raise FileNotFoundError(
            f"Training dataset not found at {dataset_path}. "
            "Restore backend/ml/dataset/transactions_training_data.csv."
        )
    df = pd.read_csv(dataset_path)
    required = {"text", "category"}
    if not required.issubset(df.columns):
        raise ValueError(f"Dataset must contain columns {sorted(required)}.")
    df = df.dropna(subset=["text", "category"]).copy()
    df["text"] = df["text"].astype(str).str.strip()
    df["category"] = df["category"].astype(str).str.strip()
    df = df[df["text"].str.len() > 0]
    unknown = sorted(set(df["category"]) - set(CATEGORY_VALUES))
    if unknown:
        raise ValueError(f"Dataset contains unsupported categories: {unknown}")
    return df.drop_duplicates(subset=["text", "category"]).reset_index(drop=True)


def _evaluate_pipeline(pipeline: Pipeline, X_test, y_test) -> dict:
    predictions = pipeline.predict(X_test)
    labels = sorted(set(y_test))
    accuracy = float(accuracy_score(y_test, predictions))
    macro_f1 = float(f1_score(y_test, predictions, average="macro"))
    report = classification_report(y_test, predictions, labels=labels, output_dict=True, zero_division=0)
    matrix = confusion_matrix(y_test, predictions, labels=labels).tolist()
    return {
        "accuracy": round(accuracy, 4),
        "macro_f1": round(macro_f1, 4),
        "labels": labels,
        "confusion_matrix": matrix,
        "per_class": {
            label: {
                "precision": round(float(report[label]["precision"]), 4),
                "recall": round(float(report[label]["recall"]), 4),
                "f1_score": round(float(report[label]["f1-score"]), 4),
                "support": int(report[label]["support"]),
            }
            for label in labels
        },
        "classification_report": classification_report(
            y_test, predictions, labels=labels, zero_division=0
        ),
        "test_size": int(len(y_test)),
    }


def train_and_save(
    dataset_path: str | Path | None = None,
    model_path: str | Path | None = None,
    metadata_path: str | Path | None = None,
    evaluation_path: str | Path | None = None,
    test_size: float = TEST_SIZE,
) -> dict:
    """Train the classifier and persist model + metadata + evaluation."""
    global _cached_pipeline, _cached_metadata

    df = load_dataset(dataset_path)
    X_train, X_test, y_train, y_test = train_test_split(
        df["text"].tolist(),
        df["category"].tolist(),
        test_size=test_size,
        random_state=RANDOM_STATE,
        stratify=df["category"].tolist(),
    )
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)
    metrics = _evaluate_pipeline(pipeline, X_test, y_test)

    # Honest generalisation estimate computed only on the training split.
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_scores = cross_val_score(
        build_pipeline(), X_train, y_train, cv=cv, scoring="f1_macro"
    )

    trained_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    metadata = {
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "algorithm": "Word + character TF-IDF vectorizers + multinomial Logistic Regression",
        "trained_at": trained_at,
        "dataset_size": int(len(df)),
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
        "categories": sorted(df["category"].unique().tolist()),
        "accuracy": metrics["accuracy"],
        "macro_f1": metrics["macro_f1"],
        "cv_macro_f1_mean": round(float(cv_scores.mean()), 4),
        "cv_macro_f1_std": round(float(cv_scores.std()), 4),
        "random_state": RANDOM_STATE,
    }
    evaluation = {
        "available": True,
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "evaluated_at": trained_at,
        "dataset_size": int(len(df)),
        **metrics,
    }

    model_file = Path(model_path or settings.CATEGORY_MODEL_PATH)
    meta_file = Path(metadata_path or settings.CATEGORY_METADATA_PATH)
    eval_file = Path(evaluation_path or settings.CATEGORY_EVALUATION_PATH)
    for path in (model_file, meta_file, eval_file):
        path.parent.mkdir(parents=True, exist_ok=True)

    joblib.dump(pipeline, model_file)
    meta_file.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    eval_file.write_text(json.dumps(evaluation, indent=2), encoding="utf-8")

    with _model_lock:
        _cached_pipeline = pipeline
        _cached_metadata = metadata

    logger.info("Trained category classifier on %s rows (accuracy=%.4f)", len(df), metrics["accuracy"])
    return {"metadata": metadata, "evaluation": evaluation}


def _read_metadata(metadata_path: Path) -> dict | None:
    try:
        if metadata_path.exists():
            return json.loads(metadata_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        logger.warning("Could not read classifier metadata at %s", metadata_path)
    return None


def ensure_model() -> tuple[Pipeline, dict]:
    """Load the persisted model, training it once if the artifact is absent."""
    global _cached_pipeline, _cached_metadata

    model_path = Path(settings.CATEGORY_MODEL_PATH)
    metadata_path = Path(settings.CATEGORY_METADATA_PATH)

    with _model_lock:
        if _cached_pipeline is not None:
            return _cached_pipeline, _cached_metadata or {}

        if model_path.exists():
            try:
                _cached_pipeline = joblib.load(model_path)
                _cached_metadata = _read_metadata(metadata_path) or {}
                logger.info("Loaded expense category classifier from %s", model_path)
                return _cached_pipeline, _cached_metadata
            except Exception:  # pragma: no cover - corrupted artifact path
                logger.exception("Failed to load classifier artifact; retraining.")

        if not settings.AUTO_TRAIN_ON_STARTUP:
            raise ModelUnavailableError(
                "Category model is not trained. Run 'python ml/train_model.py' in the backend folder."
            )

        logger.info("Classifier artifact missing - training from the bundled dataset.")
        try:
            result = train_and_save()
        except Exception as exc:  # pragma: no cover - dataset missing
            raise ModelUnavailableError(
                "Category model is unavailable and automatic training failed. "
                "Run 'python ml/train_model.py' and check the dataset."
            ) from exc
        return _cached_pipeline, result["metadata"]  # type: ignore[return-value]


def reload_model() -> None:
    global _cached_pipeline, _cached_metadata
    with _model_lock:
        _cached_pipeline = None
        _cached_metadata = None


def predict_category(title: str, description: str | None = None) -> dict:
    pipeline, metadata = ensure_model()
    text = " ".join(part for part in [title.strip(), (description or "").strip()] if part)
    if not text:
        raise ValueError("Provide a title or description for category prediction.")

    probabilities = pipeline.predict_proba([text])[0]
    classes = pipeline.classes_
    prediction = str(pipeline.predict([text])[0])
    confidence = float(max(probabilities))
    prob_map = {
        str(label): round(float(prob), 4)
        for label, prob in sorted(zip(classes, probabilities), key=lambda item: item[1], reverse=True)
    }
    return {
        "category": prediction,
        "confidence": round(confidence, 4),
        "probabilities": prob_map,
        "model_name": metadata.get("model_name", MODEL_NAME),
        "model_version": metadata.get("model_version", MODEL_VERSION),
        "source": "ml",
    }


def get_model_info() -> dict:
    model_path = Path(settings.CATEGORY_MODEL_PATH)
    metadata = _read_metadata(Path(settings.CATEGORY_METADATA_PATH)) or {}
    return {
        "model_name": metadata.get("model_name", MODEL_NAME),
        "model_version": metadata.get("model_version", MODEL_VERSION),
        "algorithm": metadata.get(
            "algorithm", "Word + character TF-IDF vectorizers + multinomial Logistic Regression"
        ),
        "trained_at": metadata.get("trained_at"),
        "dataset_size": metadata.get("dataset_size"),
        "categories": metadata.get("categories", CATEGORY_VALUES),
        "accuracy": metadata.get("accuracy"),
        "macro_f1": metadata.get("macro_f1"),
        "artifact_available": model_path.exists(),
    }


def get_evaluation() -> dict:
    eval_path = Path(settings.CATEGORY_EVALUATION_PATH)
    if not eval_path.exists():
        return {
            "available": False,
            "message": (
                "No evaluation report found. Run 'python ml/train_model.py' "
                "(or 'python ml/evaluate_model.py') in the backend folder."
            ),
        }
    try:
        data = json.loads(eval_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"available": False, "message": "Evaluation report is unreadable. Re-run training."}
    data.setdefault("available", True)
    data.setdefault("message", "Evaluation metrics produced by a reproducible train/test split.")
    return data
