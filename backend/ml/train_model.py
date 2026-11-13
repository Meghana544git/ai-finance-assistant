"""Train the expense category classifier.

Usage (from the backend folder):
    python ml/train_model.py
    python ml/train_model.py --dataset ml/dataset/transactions_training_data.csv
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings  # noqa: E402
from ml.classifier import get_evaluation, train_and_save  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Train the TF-IDF + Logistic Regression classifier.")
    parser.add_argument("--dataset", default=settings.TRAINING_DATASET_PATH, help="CSV with text,category columns")
    parser.add_argument("--test-size", type=float, default=0.2, help="Fraction reserved for testing")
    args = parser.parse_args()

    print("=" * 70)
    print("AI Finance Assistant - Expense Category Model Training")
    print("=" * 70)
    print(f"Dataset : {args.dataset}")
    print("Algorithm: TF-IDF (1-2 grams) + Logistic Regression")
    print(f"Random seed: 42 | Test split: {args.test_size:.0%}")
    print("-" * 70)

    result = train_and_save(dataset_path=args.dataset, test_size=args.test_size)
    metadata = result["metadata"]
    evaluation = result["evaluation"]

    print(f"Training rows : {metadata['train_size']}")
    print(f"Test rows     : {metadata['test_size']}")
    print(f"Accuracy      : {metadata['accuracy']:.4f}")
    print(f"Macro F1      : {metadata['macro_f1']:.4f}")
    print(
        f"5-fold CV F1  : {metadata['cv_macro_f1_mean']:.4f} "
        f"+/- {metadata['cv_macro_f1_std']:.4f} (training split only)"
    )
    print(f"Model saved   : {settings.CATEGORY_MODEL_PATH}")
    print(f"Metadata saved: {settings.CATEGORY_METADATA_PATH}")
    print(f"Evaluation    : {settings.CATEGORY_EVALUATION_PATH}")
    print("-" * 70)
    print(evaluation["classification_report"])
    print("Training complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
