# API Documentation

Base URL (local): **`http://localhost:8000`**
Interactive docs: **`/docs`** (Swagger UI) and **`/redoc`**
OpenAPI JSON: **`/openapi.json`**

All application endpoints are under the `/api` prefix except `/health`, which is also
exposed at the root for hosting platforms.

---

## 1. Authentication

The API issues its own JWTs — it does not use Supabase Auth.

- `access_token`: 60 minutes by default, sent as `Authorization: Bearer <token>`.
- `refresh_token`: 7 days by default, exchanged at `/api/auth/refresh`.
- Logout is client-side (JWTs are stateless); the endpoint exists for a single explicit flow.

### Error format

FastAPI validation errors:

```json
{
  "detail": [
    {
      "type": "greater_than",
      "loc": ["body", "amount"],
      "msg": "Input should be greater than 0",
      "input": -5
    }
  ]
}
```

Business errors use a string:

```json
{ "detail": "Transaction not found." }
```

| Status | Meaning |
| --- | --- |
| `200` | Success |
| `201` | Resource created |
| `401` | Missing/invalid/expired token, or bad credentials |
| `403` | Disabled account |
| `404` | Resource not found **or owned by another user** |
| `409` | Duplicate email, duplicate budget, duplicate registration |
| `422` | Validation error |
| `503` | ML model unavailable |

---

## 2. Auth endpoints

### `POST /api/auth/register`

```json
{
  "full_name": "Asha Verma",
  "email": "asha@example.com",
  "password": "StrongPass123"
}
```

Rules: name ≥ 2 characters, valid email, password 8–128 characters containing at least one
letter and one digit. Email is normalized to lowercase. New accounts start with INR.

**201 Created**

```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "full_name": "Asha Verma",
    "email": "asha@example.com",
    "preferred_currency": "INR",
    "is_active": true,
    "created_at": "2026-11-13T12:00:00Z",
    "updated_at": "2026-11-13T12:00:00Z"
  }
}
```

Duplicate email → **409**.

### `POST /api/auth/login`

```json
{ "email": "asha@example.com", "password": "StrongPass123" }
```

Returns the same `TokenResponse`. Wrong credentials → **401** (identical message for unknown
email and wrong password). Disabled account → **403**.

### `POST /api/auth/refresh`

```json
{ "refresh_token": "<refresh token>" }
```

Returns a fresh `TokenResponse`. Invalid/expired token → **401**.

### `POST /api/auth/logout` 🔒

Returns `{ "message": "Signed out successfully. Discard the stored tokens on the client." }`.

### `GET /api/auth/me` 🔒

Returns the current `UserOut`.

### `PUT /api/auth/me` 🔒

```json
{
  "full_name": "Asha V.",
  "email": "asha.v@example.com",
  "preferred_currency": "USD"
}
```

All fields optional, but at least one should be supplied. Allowed currencies: `INR`, `USD`,
`EUR`, `GBP`, `AED`, `JPY`, `CAD`, `AUD`, `SGD`. Email conflicts → **409**.

### `DELETE /api/auth/me` 🔒

Permanently deletes the account plus transactions, budgets, predictions, insights and
feedback. Returns a confirmation message.

---

## 3. Transactions

🔒 All transaction endpoints require a Bearer token and only operate on the caller's rows.

### `GET /api/transactions`

Query parameters:

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `search` | string | — | case-insensitive match on title, description, notes |
| `category` | string | — | one of the 8 categories |
| `transaction_type` | string | — | `income` or `expense` |
| `date_from` | date | — | `YYYY-MM-DD`, inclusive |
| `date_to` | date | — | `YYYY-MM-DD`, inclusive |
| `sort_by` | string | `transaction_date` | `transaction_date`, `amount`, `title`, `created_at`, `category` |
| `sort_order` | string | `desc` | `asc` or `desc` |
| `page` | int | `1` | ≥ 1 |
| `page_size` | int | `10` | 1–100 |

**200 OK**

```json
{
  "items": [
    {
      "id": 42,
      "user_id": 1,
      "title": "Zomato dinner",
      "description": "Family order",
      "amount": 850.0,
      "transaction_type": "expense",
      "category": "Food",
      "transaction_date": "2026-11-12",
      "notes": null,
      "category_source": "ml",
      "created_at": "2026-11-12T18:30:00Z",
      "updated_at": "2026-11-12T18:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "pages": 1,
  "total_income": 0.0,
  "total_expenses": 850.0
}
```

`total_income`/`total_expenses` reflect **all rows matching the filters**, not just the page.

### `POST /api/transactions`

```json
{
  "title": "Zomato dinner",
  "description": "Family order",
  "amount": 850,
  "transaction_type": "expense",
  "category": "Food",
  "transaction_date": "2026-11-12",
  "notes": null,
  "category_source": "ml"
}
```

`category` may be omitted; the server falls back to `Other` with `category_source=default`.
Amounts must be positive; direction is encoded in `transaction_type`. Returns **201** with
the created transaction.

### `GET /api/transactions/{id}`

**200** with the transaction, or **404** if it does not exist **or belongs to someone else**.

### `PUT /api/transactions/{id}`

Partial update; at least one field is required.

```json
{ "category": "Shopping", "category_source": "corrected" }
```

Returns the updated row. Changing a category to something different from the ML suggestion
also records a feedback row for future retraining.

### `DELETE /api/transactions/{id}`

Returns `{ "message": "Transaction deleted successfully." }` → **200**.

### `GET /api/transactions/export`

Streams a UTF-8 CSV (with BOM for Excel) containing every transaction for the user:

```
Date,Title,Description,Amount,Currency,Type,Category,Notes,Category Source
```

Response header: `Content-Disposition: attachment; filename="transactions-YYYY-MM-DD.csv"`.

---

## 4. Budgets

🔒 Bearer token required. `category: null` means an overall monthly budget.

### `GET /api/budgets`

| Parameter | Type | Notes |
| --- | --- | --- |
| `month` | int 1–12 | must be supplied together with `year` |
| `year` | int 2000–2100 | must be supplied together with `month` |

Without `month`/`year`, returns every budget for the user (newest first). With both,
returns that period with live spending.

**200 OK**

```json
{
  "items": [
    {
      "id": 7,
      "user_id": 1,
      "category": "Food",
      "monthly_limit": 5000.0,
      "month": 11,
      "year": 2026,
      "spent": 3200.0,
      "remaining": 1800.0,
      "utilization": 64.0,
      "status": "healthy",
      "created_at": "2026-11-01T08:00:00Z",
      "updated_at": "2026-11-01T08:00:00Z"
    }
  ],
  "total_limit": 5000.0,
  "total_spent": 3200.0,
  "overall_utilization": 64.0
}
```

Status thresholds: `healthy` < 80%, `warning` ≥ 80%, `exceeded` ≥ 100%.

`total_limit`, `total_spent` and `overall_utilization` use the dashboard rule: an explicit
overall budget takes precedence; otherwise category-budget limits are summed and compared
against spending in those categories only (no double counting).

### `POST /api/budgets`

```json
{ "category": "Food", "monthly_limit": 5000, "month": 11, "year": 2026 }
```

Omit `category` for an overall budget. Duplicate (user, month, year, category) → **409**.
Returns **201**.

### `PUT /api/budgets/{id}`

Partial update of `category`, `monthly_limit`, `month`, `year`. Rejects duplicates and
returns the recalculated budget.

### `DELETE /api/budgets/{id}`

Returns a confirmation message.

---

## 5. Dashboard

🔒 Bearer token required.

### `GET /api/dashboard/summary`

Query: `month` (1–12), `year` (2000–2100); both default to the current month.

```json
{
  "month": 11,
  "year": 2026,
  "period_label": "November 2026",
  "total_income": 50000.0,
  "total_expenses": 23400.0,
  "net_savings": 26600.0,
  "savings_rate": 53.2,
  "total_balance": 81000.0,
  "transaction_count": 28,
  "top_category": "Food",
  "budget_limit": 15000.0,
  "budget_spent": 9800.0,
  "budget_remaining": 5200.0,
  "budget_utilization": 65.3,
  "budget_status": "healthy",
  "budget_count": 4,
  "currency": "INR"
}
```

`total_balance` is all-time income minus all-time expenses; the other figures are for the
requested month. Budget fields use the same rule as the budget list: an explicit overall
budget (no category) takes precedence and is compared against all monthly expenses. If no
overall budget exists, category-budget limits are summed and compared against spending in
those categories only, so the same expense is never counted twice.

### `GET /api/dashboard/monthly-trends`

Query: `months` 1–24 (default 6), `end_month`, `end_year`.

```json
{
  "months": 6,
  "trends": [
    {
      "month": "2026-11",
      "label": "Nov 2026",
      "income": 50000.0,
      "expenses": 23400.0,
      "savings": 26600.0,
      "savings_rate": 53.2
    }
  ]
}
```

Months with no records are still present with zeros so charts keep a consistent axis.

### `GET /api/dashboard/category-breakdown`

Query: `month`, `year`.

```json
{
  "month": 11,
  "year": 2026,
  "total_expenses": 23400.0,
  "items": [
    { "category": "Food", "amount": 8200.0, "percentage": 35.0, "transaction_count": 12 }
  ]
}
```

Items are sorted by amount descending.

---

## 6. Insights

### `GET /api/insights` 🔒

Query: `month`, `year`.

```json
{
  "insights": [
    {
      "id": 3,
      "insight_type": "budget_warning",
      "title": "Food budget is almost used",
      "description": "You have used 84.0% of your Food budget for November 2026.",
      "severity": "warning",
      "source": "rule_based",
      "created_at": "2026-11-13T12:00:00Z"
    }
  ],
  "generated_at": "2026-11-13T12:00:00Z",
  "month": 11,
  "year": 2026,
  "currency": "INR",
  "data_points": 28,
  "disclaimer": "Insights are generated by transparent rules from your own records. They are educational and not professional financial advice."
}
```

Insights are regenerated on every request; the stored snapshot is replaced, never duplicated.

---

## 7. Machine learning

### `POST /api/ml/predict-category` (public)

```json
{ "title": "Swiggy lunch order", "description": "food delivery" }
```

```json
{
  "category": "Food",
  "confidence": 0.9047,
  "probabilities": { "Food": 0.9047, "Shopping": 0.0312, "Entertainment": 0.0211 },
  "model_name": "TF-IDF + Logistic Regression",
  "model_version": "1.0.0",
  "source": "ml"
}
```

`probabilities` is sorted descending and may not include every class; treat missing classes
as lower probability. Title is required.

### `POST /api/ml/predict-categories` (public)

```json
{
  "items": [
    { "title": "Uber ride" },
    { "title": "Netflix subscription" }
  ]
}
```

Returns `{ "predictions": [...], "model_name": "...", "model_version": "..." }`.
1–100 items.

### `POST /api/ml/predict-spending` 🔒

No request body required. The model always forecasts the next calendar month.

```json
{
  "status": "ok",
  "message": "This is a statistical estimate based only on your monthly expense totals, not a guarantee of future spending.",
  "prediction_month": "2026-12",
  "predicted_amount": 24630.5,
  "lower_bound": 22100.2,
  "upper_bound": 27160.8,
  "months_used": 8,
  "min_months_required": 4,
  "history": [
    { "month": "2026-04", "amount": 19800.0 },
    { "month": "2026-05", "amount": 20400.0 }
  ],
  "mae": 1120.4,
  "rmse": 1490.7,
  "model_name": "LinearRegression (trend)",
  "currency": "INR"
}
```

Insufficient history:

```json
{
  "status": "insufficient_data",
  "message": "Not enough history to forecast. At least 4 months with expense records are required; you currently have 2. Keep recording expenses to unlock predictions.",
  "prediction_month": null,
  "predicted_amount": null,
  "lower_bound": null,
  "upper_bound": null,
  "months_used": 2,
  "min_months_required": 4,
  "history": [],
  "mae": null,
  "rmse": null,
  "model_name": "LinearRegression (trend)",
  "currency": "INR"
}
```

### `GET /api/ml/model-info` (public)

```json
{
  "model_name": "TF-IDF + Logistic Regression",
  "model_version": "1.0.0",
  "algorithm": "Word + character TF-IDF vectorizers + multinomial Logistic Regression",
  "trained_at": "2026-11-13T17:28:01+00:00",
  "dataset_size": 395,
  "categories": ["Bills", "Education", "Entertainment", "Food", "Health", "Other", "Shopping", "Transport"],
  "accuracy": 0.7722,
  "macro_f1": 0.7753,
  "artifact_available": true
}
```

### `GET /api/ml/evaluation` (public)

Returns the saved evaluation report: accuracy, macro precision/recall/F1, labels,
confusion matrix, per-class metrics and the text classification report. If no report exists,
returns `{ "available": false, "message": "..." }` with **200**.

---

## 8. Chatbot

### `POST /api/chat/message` 🔒

```json
{ "message": "How much did I spend on food?" }
```

```json
{
  "reply": "You spent 8,200.00 INR on Food in November 2026. That is about 35.0% of your 23,400.00 INR total expenses for the month.",
  "intent": "category_spending",
  "data": {
    "category": "Food",
    "amount": 8200.0,
    "percentage": 35.0,
    "total_expenses": 23400.0,
    "month": 11,
    "year": 2026
  },
  "suggestions": ["How much did I spend this month?", "..."],
  "source": "rule_based",
  "disclaimer": "This assistant is a local rule-based helper that reads your own saved transactions. It is educational and not financial advice."
}
```

Supported intents: `greeting`, `usage`, `monthly_spending`, `category_spending`,
`top_category`, `budget_status`, `recent_transactions`, `savings`, `income`, `balance`,
`prediction_help`, `fallback`. The reply is always derived from the user's own records.

### `GET /api/chat/suggestions` (public)

Returns the list of suggested prompts.

---

## 9. System

### `GET /health` and `GET /api/health`

Public health check:

```json
{
  "status": "ok",
  "app": "AI Finance Assistant",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-11-13T12:00:00+00:00",
  "database": { "connected": true, "engine": "sqlite" },
  "machine_learning": {
    "category_model_available": true,
    "auto_train_on_startup": true
  }
}
```

`status` becomes `degraded` if `SELECT 1` fails.

---

## 10. Quick cURL / PowerShell examples

```powershell
# Register
$body = @{ full_name="Asha Verma"; email="asha@example.com"; password="StrongPass123" } | ConvertTo-Json
$auth = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/auth/register `
  -ContentType "application/json" -Body $body
$token = $auth.access_token

# Create a transaction
$tx = @{
  title="Zomato dinner"; amount=850; transaction_type="expense";
  category="Food"; transaction_date="2026-11-12"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/transactions `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" -Body $tx

# Forecast
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/ml/predict-spending `
  -Headers @{ Authorization = "Bearer $token" }

# Ask the assistant
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/chat/message `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" -Body (@{ message="How much budget remains?" } | ConvertTo-Json)
```

A Postman-style collection is not bundled; the OpenAPI schema at `/openapi.json` can be
imported directly into Postman or Insomnia.
