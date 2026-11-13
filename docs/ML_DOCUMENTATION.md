# Machine Learning Documentation

AI Finance Assistant uses two genuinely trained Scikit-learn models. Neither is a mock,
and the API never hardcodes a category or forecast value.

1. **Expense category classifier** — TF-IDF features + Logistic Regression.
2. **Monthly spending forecaster** — Linear Regression on monthly expense totals.

All training code, the dataset, the trained artifact and the evaluation report live in
`backend/ml/`.

---

## 1. Category classifier

### 1.1 Problem

Given a transaction title and optional description, predict one of eight categories:

`Food`, `Transport`, `Shopping`, `Bills`, `Entertainment`, `Health`, `Education`, `Other`.

The UI calls the model while the user types, shows the suggested category with a confidence
score, and lets the user override it. A manual override is saved with
`category_source = "corrected"`.

### 1.2 Dataset

| Item | Value |
| --- | --- |
| File | `backend/ml/dataset/transactions_training_data.csv` |
| Columns | `text`, `category` |
| Rows | **395** after duplicate removal |
| Classes | 8 |
| Language | English merchant descriptions with Indian-context examples |
| Source | Curated educational dataset created for this project |

Class distribution:

| Category | Rows |
| --- | ---: |
| Food | 54 |
| Shopping | 51 |
| Other | 50 |
| Health | 49 |
| Bills | 48 |
| Education | 48 |
| Transport | 48 |
| Entertainment | 47 |

The classes are balanced enough that a stratified split is reliable. Examples include
"Swiggy order dinner chicken biryani", "Zomato lunch delivered to office",
"Electricity bill payment", "Uber ride to office" and "Coursera course subscription".

### 1.3 Preprocessing and features

`build_pipeline()` in `backend/ml/classifier.py` creates a Scikit-learn `Pipeline`:

```
FeatureUnion
├── TfidfVectorizer(
│     lowercase=True,
│     strip_accents="unicode",
│     ngram_range=(1, 2),      # unigrams + bigrams
│     min_df=1,
│     max_df=0.95,
│     sublinear_tf=True
│   )
└── TfidfVectorizer(
      lowercase=True,
      strip_accents="unicode",
      analyzer="char_wb",       # character n-grams inside word boundaries
      ngram_range=(3, 5),
      min_df=1,
      sublinear_tf=True
    )
→ LogisticRegression(
      max_iter=3000,
      C=8.0,
      class_weight="balanced",
      random_state=42
    )
```

Rationale:

- **Word n-grams** capture phrases such as "electricity bill" or "uber ride".
- **Character n-grams** make the model robust to spelling variants and short bank narrations
  ("recharge", "re-charge", "swiggy").
- `sublinear_tf` reduces the influence of repeated words.
- `class_weight="balanced"` protects minority classes during optimisation.
- `C=8.0` was selected using 5-fold cross-validation **on the training split only**; the
  held-out test set was not used for tuning.

### 1.4 Training protocol

Implemented in `train_and_save()`:

1. Load and clean the CSV (drop empty text, reject unknown labels, remove duplicates).
2. Stratified train/test split: **80% / 20%**, `random_state=42`.
3. Fit the full pipeline on the training split.
4. Evaluate once on the held-out split.
5. Run `StratifiedKFold(n_splits=5, shuffle=True, random_state=42)` with `f1_macro` on the
   training split to estimate generalisation variance.
6. Persist three files atomically:
   - `backend/ml/artifacts/category_classifier.joblib` (model)
   - `backend/ml/artifacts/category_model_metadata.json` (summary)
   - `backend/ml/artifacts/category_evaluation.json` (detailed report)

### 1.5 Results (saved artifact in this repository)

| Metric | Value |
| --- | ---: |
| Test accuracy | **0.7722** |
| Macro F1 | **0.7753** |
| 5-fold CV macro F1 (train split) | **0.6636 ± 0.0641** |
| Training rows | 316 |
| Test rows | 79 |
| Random seed | 42 |

Per-class test performance:

| Category | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| Bills | 0.8182 | 1.0000 | 0.9000 | 9 |
| Education | 0.5556 | 0.5000 | 0.5263 | 10 |
| Entertainment | 0.7778 | 0.7778 | 0.7778 | 9 |
| Food | 0.6667 | 0.7273 | 0.6957 | 11 |
| Health | 1.0000 | 0.8000 | 0.8889 | 10 |
| Other | 0.8889 | 0.8000 | 0.8421 | 10 |
| Shopping | 0.5455 | 0.6000 | 0.5714 | 10 |
| Transport | 1.0000 | 1.0000 | 1.0000 | 10 |

**Interpretation:** Transport and Bills are learned cleanly; Education and Shopping are the
hardest because descriptions overlap ("book", "course", "Amazon"). These numbers describe a
small curated dataset — they are not a claim about real-world banking data. The UI reads
them from `category_evaluation.json`, so retraining updates the displayed metrics.

### 1.6 Inference

`predict_category(title, description)`:

1. Concatenates title and description, rejecting empty input.
2. Calls `predict_proba` on the loaded pipeline.
3. Returns the highest-probability class, that probability as `confidence`, the full
   probability map, model name/version and `source: "ml"`.

Model loading is cached per process behind a lock. If the Joblib file is missing:

- with `AUTO_TRAIN_ON_STARTUP=true` the service retrains from the bundled dataset;
- otherwise the endpoint returns **503** with a message telling the operator to run
  `python ml/train_model.py`.

Unknown inputs still receive the most likely class plus a low confidence value; the UI
frames it as a suggestion the user can correct.

### 1.7 Feedback

When a user changes the suggested category, the API stores the original text, predicted
label and corrected label in `category_feedback`. This is intentionally **not** an online
learning loop: models are only updated by an explicit retraining run, which keeps evaluation
honest and reproducible.

---

## 2. Spending forecast

### 2.1 Problem

Estimate next month's total expenses for one user from their own monthly history, with an
uncertainty band and an honest error estimate.

### 2.2 Data construction

`monthly_expense_totals(db, user_id)` in `backend/app/services/analytics.py`:

1. Aggregates expense totals by calendar month.
2. Builds a **continuous** series from the first month with data to the last month with
   data, inserting `0` for months with no recorded expenses.
3. Returns `[(YYYY-MM, amount), ...]` in chronological order.

Continuous months prevent gaps from compressing the time axis (for example, treating June
and September as adjacent).

### 2.3 Minimum data requirement

At least **4 distinct months** (`MIN_FORECAST_MONTHS`, configurable) are required. With fewer,
the API returns:

```json
{
  "status": "insufficient_data",
  "message": "Not enough history to forecast. At least 4 months with expense records are required; ...",
  "predicted_amount": null,
  "months_used": 2,
  "min_months_required": 4
}
```

The UI renders this explanation instead of inventing a number.

### 2.4 Model and validation

- **Model:** `sklearn.linear_model.LinearRegression` (ordinary least squares) on
  `X = 0..n-1` and `y = monthly expense totals`.
- **Next step:** predict at `X = n`, clamp negative predictions to `0`.
- **Walk-forward validation** (`_walk_forward_metrics`): for every month after the first
  three, fit on all earlier months and predict the next one. Future data is never used,
  unlike a random train/test split.

Reported metrics:

- **MAE** — mean absolute error in the user's currency.
- **RMSE** — root mean squared error, penalising larger misses.

Both are computed from one-step-ahead walk-forward predictions and rounded to 2 decimals.

### 2.5 Confidence band

```
spread = standard deviation of walk-forward residuals
margin = max(1.96 × spread, 5% of point estimate)
lower  = max(predicted − margin, 0)
upper  = predicted + margin
```

The 5% floor avoids a zero-width interval when a user's history is perfectly linear (which
would imply false certainty). When fewer than two residuals exist, a transparent 15% margin
is used. The API labels the output as an estimate, not a guarantee.

### 2.6 Persistence

Successful forecasts upsert one row per `(user_id, prediction_month)` in `predictions` with
the point estimate and model name. This provides an audit snapshot; the live forecast is
always recomputed from current transactions.

### 2.7 Limitations

- Only a linear trend; ignores seasonality, festivals, salary changes and one-off purchases.
- Needs several months of history; new users see `insufficient_data` by design.
- Zeros for months without records assume genuinely zero spending, not missing data.
- Not a budgeting recommendation or financial advice.

---

## 3. Rule-based components (not ML)

For transparency, these are deterministic and labelled separately:

- **Insights** (`app/services/insights.py`): comparisons, budget warnings, savings-rate
  observations. API label: `source: rule_based`.
- **Chatbot** (`app/services/chat.py`): keyword intent matching over the user's records.
  API label: `source: rule_based`.

The ML forecast is surfaced only through `/api/ml/*` and labelled `source: ML` in the
frontend, so users can tell statistical output from rules.

---

## 4. Reproducibility

### Commands

```powershell
# From the repository root
.\train-ml.ps1
.\train-ml.ps1 -SkipEvaluation

# Or from backend/
cd backend
.\.venv\Scripts\python ml/train_model.py
.\.venv\Scripts\python ml/evaluate_model.py
```

`train_model.py` prints dataset size, train/test sizes, accuracy, macro F1 and the saved
artifact paths. `evaluate_model.py` reloads the persisted model and regenerates the
evaluation report from the same deterministic split.

### Environment

| Package | Version used in this workspace |
| --- | --- |
| Python | 3.14.0 |
| scikit-learn | 1.9.1 |
| pandas | 3.0.6 |
| NumPy | (installed with scikit-learn stack) |
| joblib | (installed with scikit-learn stack) |

The pipeline is unaffected by minor version differences in the ranges pinned by
`backend/requirements.txt`.

### Artifacts

```
backend/ml/artifacts/
├── category_classifier.joblib      # trained Pipeline (git-ignored, reproducible)
├── category_model_metadata.json    # compact metrics + version
└── category_evaluation.json        # confusion matrix + per-class report
```

`AUTO_TRAIN_ON_STARTUP=true` rebuilds a missing Joblib artifact on backend startup, so a
fresh clone works after `.\setup.ps1` or the first API call.

---

## 5. API surface

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST /api/ml/predict-category` | Public in this build | Single title → category + probabilities |
| `POST /api/ml/predict-categories` | Public in this build | Batch (1–100 items) |
| `POST /api/ml/predict-spending` | Bearer token | Per-user next-month forecast |
| `GET /api/ml/model-info` | Public | Saved model metadata |
| `GET /api/ml/evaluation` | Public | Confusion matrix and per-class metrics |

Only the forecast depends on private user data. Category prediction is a general text
classifier and does not read transactions.

---

## 6. Responsible use

- Metrics are reported exactly as produced by the saved evaluation file; the project does
  not claim production-grade accuracy.
- The dataset is educational and synthetic/curated; it does not contain real user data.
- Model corrections stay on the user's account and never silently modify the shared model.
- Forecasts are statistical estimates for learning, not financial advice.
