"""Evaluate the persisted category classifier on a reproducible test split.

Usage (from the backend folder):
    python ml/evaluate_model.py
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import joblib  # noqa: E402
from sklearn.metrics import classification_report  # noqa: E402

from app.core.config import settings  # noqa: E402
from ml.classifier import (  # noqa: E402
    RANDOM_STATE,
    TEST_SIZE,
    _evaluate_pipeline,
    build_pipeline,
    get_evaluation,
    load_dataset,
    train_and_save,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate the saved expense category classifier.")
    parser.add_argument("--dataset", default=settings.TRAINING_DATASET_PATH)
    parser.add_argument("--retrain", action="store_true", help="Retrain before evaluating")
    args = parser.parse_args()

    model_path = Path(settings.CATEGORY_MODEL_PATH)
    if args.retrain or not model_path.exists():
        print("Model artifact missing or --retrain supplied: training first...")
        train_and_save(dataset_path=args.dataset)
        report = get_evaluation()
    else:
        from sklearn.model_selection import train_test_split

        df = load_dataset(args.dataset)
        _, X_test, _, y_test = train_test_split(
            df["text"].tolist(),
            df["category"].tolist(),
            test_size=TEST_SIZE,
            random_state=RANDOM_STATE,
            stratify=df["category"].tolist(),
        )
        pipeline = joblib.load(model_path)
        report = _evaluate_pipeline(pipeline, X_test, y_test)

    print("=" * 70)
    print("AI Finance Assistant - Category Classifier Evaluation")
    print("=" * 70)
    print(f"Accuracy    : {report['accuracy']:.4f}")
    print(f"Macro F1    : {report['macro_f1']:.4f}")
    print(f"Test samples: {report['test_size']}")
    print("-" * 70)
    print(report["classification_report"])
    print("-" * 70)
    print("Confusion matrix (rows = actual, columns = predicted)")
    print("Labels:", report["labels"])
    for label, row in zip(report["labels"], report["confusion_matrix"]):
        print(f"{label:<15} {row}")
    print("-" * 70)
    print(f"Full report saved at: {settings.CATEGORY_EVALUATION_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
