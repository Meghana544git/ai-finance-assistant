# AI Finance Assistant

A full-stack personal-finance tracker built as a B.Tech (AI & ML) project. It combines a
React + TypeScript dashboard with a FastAPI backend, a **real Scikit-learn category
classifier** (TF-IDF + Logistic Regression) and a **Linear Regression spending forecast**.
Every number shown in the UI comes from records the signed-in user actually entered — there
is no seeded demo data and no fabricated financial advice.

![Stack](https://img.shields.io/badge/backend-FastAPI-009688)
![Stack](https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-3178C6)
![Stack](https://img.shields.io/badge/ML-Scikit--learn-F7931E)
![DB](https://img.shields.io/badge/database-SQLite%20%7C%20PostgreSQL-336791)

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Quick start (Windows)](#quick-start-windows)
- [Manual setup](#manual-setup)
- [Environment configuration](#environment-configuration)
- [Machine learning](#machine-learning)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Security notes](#security-notes)
- [Known limitations](#known-limitations)

---

## Features

### Authentication & account
- Email + password registration and login with **Argon2** password hashing.
- JWT access tokens (60 min) and refresh tokens (7 days), with automatic access-token
  renewal in the Axios client.
- Protected routes, persistent sessions, profile update, account deletion.
- Honest forgot-password screen: this project has no email service, so it explains how to
  recover locally instead of pretending an email was sent.

### Transactions
- Full CRUD for income and expenses, with validation and ownership checks.
- Search across title/description/notes, filter by category, type and date range.
- Sortable, paginated list with income/expense totals for the active filters.
- **ML category suggestion** while typing a title, with a confidence score and one-click
  manual correction (corrections are stored for a future retraining workflow).
- CSV export including the user's currency.

### Budgets
- Overall or per-category monthly limits, with live spent/remaining/utilization.
- Status thresholds: `healthy` below 80%, `warning` from 80%, `exceeded` at 100%+.
- Duplicate-budget protection per user/month/year/category.

### Dashboard, analytics & insights
- Month picker, income vs expense cards, savings rate, all-time balance, budget progress.
- Recharts visualisations: monthly trend, category breakdown, savings trend.
- Rule-based insights (`source: rule_based`) such as overspending categories, budget
  warnings, savings-rate observations and unusual single transactions.

### ML predictions
- Category classifier exposed through single and batch endpoints plus a model-info page.
- Next-month expense forecast with walk-forward MAE/RMSE and a confidence band.
- Explicit `insufficient_data` response when fewer than 4 months of expense history exist.
- Evaluation page showing the confusion matrix and per-class precision/recall/F1 from a
  reproducible train/test split.

### Local AI assistant
- Deterministic rule-based chatbot with no paid API key.
- Answers questions about this month's spending, a specific category, top category, budget
  status, recent transactions, savings, income and balance.
- Says "no data" rather than inventing numbers, and labels itself as educational.

---

## Architecture

```mermaid
flowchart LR
    subgraph Client["Browser"]
        UI["React 18 + TypeScript<br/>Vite + Tailwind + shadcn-style UI"]
        Charts["Recharts<br/>Dashboard / Analytics"]
        Store["Auth context<br/>localStorage tokens"]
    end

    subgraph API["FastAPI backend"]
        Auth["/api/auth<br/>JWT + Argon2"]
        Tx["/api/transactions<br/>CRUD, filters, CSV"]
        Budget["/api/budgets"]
        Dash["/api/dashboard"]
        Insights["/api/insights"]
        ML["/api/ml"]
        Chat["/api/chat"]
        Health["/api/health"]
    end

    subgraph Services["Domain services"]
        Analytics["analytics.py<br/>aggregations"]
        InsightSvc["insights.py<br/>rule engine"]
        ChatSvc["chat.py<br/>intent rules"]
        Security["security.py<br/>JWT / hashing"]
    end

    subgraph MLSub["Machine learning"]
        Classifier["TF-IDF + Logistic Regression<br/>scikit-learn Pipeline"]
        Forecast["Linear Regression<br/>walk-forward validation"]
        Artifacts["Joblib artifact +<br/>metadata / evaluation JSON"]
    end

    DB[("SQLite by default<br/>PostgreSQL / Supabase optional")]
    Files["ML dataset + artifacts"]

    UI --> Store
    Store -->|Axios + Bearer token| Auth
    UI --> Tx
    UI --> Budget
    Charts --> Dash
    UI --> Insights
    UI --> ML
    UI --> Chat
    Auth --> Security
    Auth --> DB
    Tx --> DB
    Budget --> Analytics
    Budget --> DB
    Dash --> Analytics
    Analytics --> DB
    Insights --> InsightSvc
    InsightSvc --> Analytics
    Chat --> ChatSvc
    ChatSvc --> Analytics
    ML --> Classifier
    ML --> Forecast
    Classifier --> Artifacts
    Forecast --> Analytics
    Forecast --> DB
    Artifacts -.-> Files
    Classifier -.-> Files
```

**Request flow:** the browser stores the access/refresh token, Axios attaches the access
token, and a response interceptor retries once with the refresh token after a `401`. Every
database query is scoped by `user_id`, so users can never read or modify each other's rows.

---

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS 3, Radix UI primitives, shadcn-style components, Recharts, Lucide icons, Axios, React Router 6, Sonner |
| Backend | FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, PyJWT, pwdlib (Argon2), Uvicorn |
| ML | Scikit-learn, pandas, NumPy, Joblib |
| Database | SQLite (default), PostgreSQL / Supabase via `DATABASE_URL` |
| Testing | pytest + FastAPI TestClient (36 backend tests) |
| Tooling | npm, PowerShell scripts, Docker Compose (optional PostgreSQL only) |

---

## Quick start (Windows)

**Prerequisites:** Python 3.11+ and Node.js 20+. Docker is not required.

```powershell
cd C:\Users\yaram_pgsjsj8\Downloads\AI-Finance-Assistant

# 1. One-time setup: venv, dependencies, .env, ML training, tests
.\setup.ps1

# 2. Start both servers in separate PowerShell windows
.\run.ps1
```

Then open:

- App: <http://localhost:5173>
- API docs (Swagger UI): <http://localhost:8000/docs>
- Health check: <http://localhost:8000/health>

Register a new account and add a few transactions to populate the dashboard.

### Useful commands

```powershell
# Retrain and evaluate the models, then print the saved metrics
.\train-ml.ps1

# Backend only / frontend only
.\run.ps1 -BackendOnly
.\run.ps1 -FrontendOnly

# Run the backend test suite
cd backend
.\.venv\Scripts\python -m pytest

# Production frontend build (type-checks first)
cd frontend
npm.cmd run build
```

> **PowerShell tip:** if `npm install` fails with an execution-policy error, use
> `npm.cmd` instead of `npm`. All provided scripts already do this.

---

## Manual setup

```powershell
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env      # then set a strong SECRET_KEY
python ml/train_model.py
python -m uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

The backend creates `backend/finance.db` and its tables automatically on first start.
`AUTO_TRAIN_ON_STARTUP=true` also trains the classifier if no saved artifact exists.

---

## Environment configuration

Backend variables live in `backend/.env` (never commit it):

| Variable | Default | Purpose |
| --- | --- | --- |
| `SECRET_KEY` | dev-only placeholder | JWT signing key — **must be replaced** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Access-token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh-token lifetime |
| `DATABASE_URL` | `sqlite:///backend/finance.db` | Database connection string |
| `AUTO_CREATE_TABLES` | `true` | Create tables on startup (use Alembic in production) |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed browser origins |
| `AUTO_TRAIN_ON_STARTUP` | `true` | Train the classifier when the artifact is missing |
| `MIN_FORECAST_MONTHS` | `4` | Minimum distinct expense months for a forecast |

Frontend variable (`frontend/.env`):

```env
VITE_API_URL=http://localhost:8000/api
```

### PostgreSQL / Supabase

```powershell
cd backend
.\.venv\Scripts\python -m pip install "psycopg[binary]"

# SQLite -> PostgreSQL schema migration (fresh database)
$env:DATABASE_URL = "postgresql+psycopg://finance:finance@localhost:5432/ai_finance"
.\.venv\Scripts\python -m alembic upgrade head
```

For Supabase, copy the connection string from **Project Settings → Database**, URL-encode
special characters in the password, and set `AUTO_CREATE_TABLES=false` after running
migrations. See [`docs/DATABASE.md`](docs/DATABASE.md) for details.

---

## Machine learning

### 1. Expense category classification

- **Dataset:** 395 labelled transaction descriptions across 8 categories
  (`Food`, `Transport`, `Shopping`, `Bills`, `Entertainment`, `Health`, `Education`, `Other`).
- **Pipeline:** `FeatureUnion` of word-level TF-IDF (1–2 grams) and character-level TF-IDF
  (3–5 grams, `char_wb`) → multinomial Logistic Regression (`C=8`).
- **Validation:** stratified 80/20 train–test split (`random_state=42`) plus 5-fold
  cross-validation on the training split only.
- **Saved metrics (this repository's trained artifact):**

| Metric | Value |
| --- | --- |
| Test accuracy | **0.7722** |
| Macro F1 | **0.7753** |
| 5-fold CV macro F1 | **0.6636 ± 0.0641** |
| Test rows | 79 of 395 |

- **Artifacts:** `backend/ml/artifacts/category_classifier.joblib`,
  `category_model_metadata.json`, `category_evaluation.json`.
- Metrics are read from the saved JSON at runtime — they are not hardcoded in the UI.

### 2. Next-month spending forecast

- Per-user **Linear Regression** on continuous monthly expense totals (months with no
  spending count as zero, so gaps do not distort the time axis).
- Requires at least **4** months of expense history; otherwise the API returns a clear
  `insufficient_data` message.
- Accuracy is measured with **chronological expanding-window walk-forward validation**
  (never training on future months), reporting MAE and RMSE.
- A 95% band is derived from walk-forward residual spread, with a 5% minimum width so a
  perfectly linear history is not presented with false certainty.

Commands: `.\train-ml.ps1` or, from `backend`, `python ml/train_model.py` and
`python ml/evaluate_model.py`. Full methodology: [`docs/ML_DOCUMENTATION.md`](docs/ML_DOCUMENTATION.md).

---

## Testing

```powershell
cd backend
.\.venv\Scripts\python -m pytest
```

The suite covers:

- registration/login/refresh/logout, duplicate email, weak password, profile updates;
- transaction CRUD, validation, ownership isolation, filters, sorting, pagination, CSV;
- budget creation, duplicate protection, status thresholds, double-count-free period totals, user isolation;
- dashboard aggregates against known transactions;
- ML category prediction, batch prediction, insufficient-data forecast, forecast isolation;
- insights and chatbot answers grounded in real records;
- health endpoints and security headers.

**Result in this workspace:** `36 passed` (only third-party Starlette deprecation warnings).

A production frontend build is verified with `npm.cmd run build` (`tsc -b && vite build`).

---

## Project structure

```
AI-Finance-Assistant/
├── backend/
│   ├── app/
│   │   ├── api/routes/        auth, transactions, budgets, dashboard, insights, ml, chat, system
│   │   ├── core/              config, constants, security, dependencies
│   │   ├── database/          SQLAlchemy base/session
│   │   ├── models/            users, transactions, budgets, predictions, insights, feedback
│   │   ├── schemas/           Pydantic request/response models
│   │   └── services/          analytics, insights, chat, formatting
│   ├── migrations/            Alembic environment + initial migration
│   ├── ml/
│   │   ├── dataset/           training CSV
│   │   ├── artifacts/         joblib model + metrics JSON
│   │   ├── classifier.py      training / prediction / metadata
│   │   ├── forecasting.py     linear-regression forecast
│   │   ├── train_model.py
│   │   └── evaluate_model.py
│   ├── tests/                 36 pytest tests
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/        UI primitives, layout, feature components
│   │   ├── contexts/          auth provider
│   │   ├── hooks/             data + auth hooks
│   │   ├── lib/               axios client, utils
│   │   ├── pages/             landing, auth, dashboard, transactions, budgets, analytics,
│   │   │                      insights, predictions, assistant, profile
│   │   ├── services/          typed API services
│   │   └── types/             shared TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE.md
│   └── ML_DOCUMENTATION.md
├── docker-compose.yml         optional PostgreSQL only
├── setup.ps1
├── run.ps1
├── train-ml.ps1
└── README.md
```

---

## Documentation

- [API reference](docs/API_DOCUMENTATION.md) — endpoints, payloads, status codes.
- [Database guide](docs/DATABASE.md) — schema, ER diagram, SQLite/PostgreSQL/Supabase, Alembic.
- [ML documentation](docs/ML_DOCUMENTATION.md) — dataset, pipeline, evaluation, forecasting, limitations.

---

## Security notes

- Passwords are hashed with Argon2 via `pwdlib`; plaintext passwords are never stored or logged.
- JWT tokens are signed with `SECRET_KEY`; replace the development key before any deployment.
- Every transaction/budget/forecast query is filtered by the authenticated `user_id`.
- CORS is restricted to configured origins; security headers (`nosniff`, `DENY`, referrer
  policy) are added to responses.
- Request logs contain method/path/status only — no amounts, emails or tokens.
- `.env` files and local databases are git-ignored.
- This is an educational project, not a licensed financial adviser. Forecasts and insights
  are statistical observations, not guarantees.

---

## Known limitations

- No email delivery, so password reset is a documented local-recovery flow rather than a
  self-service email link.
- The chatbot is intentionally rule-based (no LLM) and only answers the supported intents.
- The classifier is trained on a small synthetic-but-realistic English dataset; accuracy on
  unusual merchant names will be lower. User corrections are stored but do not retrain the
  model automatically.
- The forecast models a linear monthly trend only; it does not account for salary changes,
  festivals or one-off large purchases.
- Currency is a display preference (no live FX conversion).
- No public deployment or CI pipeline is included; everything runs locally.

---

Built for learning: React/TypeScript on the front, FastAPI + SQLAlchemy in the middle, and
transparent, reproducible Scikit-learn models on top of the user's own data.
