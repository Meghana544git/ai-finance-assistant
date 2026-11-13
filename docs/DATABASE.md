# Database Guide

AI Finance Assistant ships with **SQLite** for zero-configuration local use and supports
**PostgreSQL / Supabase** through the `DATABASE_URL` environment variable. The same
SQLAlchemy models and Alembic migrations are used for both.

---

## 1. Default local database

| Item | Value |
| --- | --- |
| Engine | SQLite 3 |
| File | `backend/finance.db` |
| Created by | FastAPI lifespan when `AUTO_CREATE_TABLES=true` |
| Driver | Python standard-library `sqlite3` (no extra install) |
| Concurrent writers | One; fine for a single-developer educational app |

No environment variable is needed. `DATABASE_URL` defaults to an absolute path built from
`backend/app/core/config.py`, so starting Uvicorn from a different folder still resolves the
same file.

---

## 2. Entity-relationship diagram

```mermaid
erDiagram
    USERS ||--o{ TRANSACTIONS : owns
    USERS ||--o{ BUDGETS : sets
    USERS ||--o{ PREDICTIONS : receives
    USERS ||--o{ INSIGHTS : receives
    USERS ||--o{ CATEGORY_FEEDBACK : submits
    TRANSACTIONS ||--o{ CATEGORY_FEEDBACK : "may reference"

    USERS {
        int id PK
        string full_name
        string email UK
        string hashed_password
        string preferred_currency "ISO 4217, default INR"
        bool is_active
        datetime created_at
        datetime updated_at
    }

    TRANSACTIONS {
        int id PK
        int user_id FK
        string title
        text description
        numeric amount "14,2 - always positive"
        string transaction_type "income | expense"
        string category "8 allowed values"
        date transaction_date
        text notes
        string category_source "manual | ml | default | corrected"
        datetime created_at
        datetime updated_at
    }

    BUDGETS {
        int id PK
        int user_id FK
        string category "NULL = overall budget"
        numeric monthly_limit "14,2"
        int month "1-12"
        int year "2000-2100"
        datetime created_at
        datetime updated_at
    }

    PREDICTIONS {
        int id PK
        int user_id FK
        numeric predicted_amount "14,2"
        date prediction_month
        string model_name
        datetime created_at
        datetime updated_at
    }

    INSIGHTS {
        int id PK
        int user_id FK
        string insight_type
        string title
        text description
        datetime created_at
        datetime updated_at
    }

    CATEGORY_FEEDBACK {
        int id PK
        int user_id FK
        int transaction_id FK "nullable, SET NULL"
        text text
        string predicted_category
        string corrected_category
        datetime created_at
        datetime updated_at
    }
```

---

## 3. Tables

### `users`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK | autoincrement |
| `full_name` | varchar(120) | required |
| `email` | varchar(255) | unique, indexed, stored lowercase |
| `hashed_password` | varchar(255) | Argon2 hash — never plaintext |
| `preferred_currency` | varchar(3) | display preference, default `INR` |
| `is_active` | boolean | default true |
| `created_at`, `updated_at` | timestamptz | server defaults |

Deleting a user cascades to every owned table (transactions, budgets, predictions, insights,
feedback records).

### `transactions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK | |
| `user_id` | FK → `users.id` | `ON DELETE CASCADE` |
| `title` | varchar(160) | required, trimmed |
| `description` | text | optional |
| `amount` | numeric(14,2) | **positive**; direction comes from `transaction_type` |
| `transaction_type` | varchar(16) | `income` or `expense` (CHECK) |
| `category` | varchar(32) | one of the 8 project categories |
| `transaction_date` | date | user-supplied business date |
| `notes` | text | optional |
| `category_source` | varchar(16) | `manual`, `ml`, `default`, `corrected` |
| `created_at`, `updated_at` | timestamptz | audit fields |

Indexes: `(user_id)`, `(transaction_date)`, `(user_id, transaction_date)`,
`(user_id, transaction_type)`, `(user_id, category)`. These match the dashboard and
filter queries.

### `budgets`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK | |
| `user_id` | FK → `users.id` | `ON DELETE CASCADE` |
| `category` | varchar(32), nullable | `NULL` means an overall monthly budget |
| `monthly_limit` | numeric(14,2) | CHECK `> 0` |
| `month` | integer | CHECK `1..12` |
| `year` | integer | CHECK `2000..2100` |

Uniqueness of `(user_id, year, month, category)` is enforced in the service layer because
SQL unique indexes treat `NULL` values as distinct. Index: `(user_id, year, month)`.

### `predictions`

One row per `(user_id, prediction_month)`; repeated forecast requests update the existing
snapshot instead of inserting duplicates. Stores the point estimate and model name for
auditability. Forecast history is recomputed from transactions, not from this table.

### `insights`

Derived, disposable data. Each `GET /api/insights` replaces the user's previous snapshot so
the table never accumulates duplicates. The response labels items `source: rule_based`.

### `category_feedback`

Stores user corrections of ML category suggestions (`predicted_category` vs
`corrected_category`, plus the original text). It exists for a future explicit retraining
workflow — the production model is **not** retrained automatically from these rows.

---

## 4. Data isolation

Every query that returns financial data includes `WHERE user_id = :current_user_id`.
Helpers in the routers (`_get_owned` in transactions/budgets) raise `404` when a row exists
but belongs to another user, so ownership is not leaked. Tests cover cross-user access for
transactions, budgets and forecasts.

The application never accepts `user_id` in a request body; it always comes from the verified
JWT subject.

---

## 5. Alembic migrations

The initial migration is `backend/migrations/versions/0001_initial.py` and creates all six
tables, constraints and indexes.

```powershell
cd backend

# Apply all migrations
.\.venv\Scripts\python -m alembic upgrade head

# Current revision
.\.venv\Scripts\python -m alembic current

# Roll back one revision
.\.venv\Scripts\python -m alembic downgrade -1

# Create a new migration after changing models
.\.venv\Scripts\python -m alembic revision --autogenerate -m "describe change"
```

### `AUTO_CREATE_TABLES` vs Alembic

- `AUTO_CREATE_TABLES=true` (default): FastAPI calls `Base.metadata.create_all()` on startup.
  Great for SQLite development; it does **not** alter existing columns.
- Production / PostgreSQL: set `AUTO_CREATE_TABLES=false` and run `alembic upgrade head`
  as a deployment step. Alembic is the source of truth for schema changes.

`alembic.ini` reads `DATABASE_URL` from the application settings, so the same `.env` value
drives both the app and migrations.

---

## 6. PostgreSQL (local, optional)

A ready-to-use compose file is included at the repository root:

```powershell
docker compose up -d
```

It starts PostgreSQL 16 with database `ai_finance`, user `finance`, password `finance` on
port 5432 and a named volume.

```powershell
cd backend
.\.venv\Scripts\python -m pip install "psycopg[binary]"

# backend/.env
# DATABASE_URL=postgresql+psycopg://finance:finance@localhost:5432/ai_finance
# AUTO_CREATE_TABLES=false

.\.venv\Scripts\python -m alembic upgrade head
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

The settings layer normalizes plain `postgres://` and `postgresql://` URLs to the
`postgresql+psycopg://` driver automatically, which is convenient when copying a managed
provider's connection string.

---

## 7. Supabase

1. Create a Supabase project and open **Project Settings → Database**.
2. Copy the connection string. Prefer the **session pooler** (port `5432`) for a long-lived
   API server, or the transaction pooler (port `6543`) for serverless deployments.
3. URL-encode special characters in the password (for example `@` → `%40`).
4. Set `DATABASE_URL` in `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres.<project-ref>:<encoded-password>@aws-1-<region>.pooler.supabase.com:5432/postgres
AUTO_CREATE_TABLES=false
```

5. Install the driver and run migrations:

```powershell
cd backend
.\.venv\Scripts\python -m pip install "psycopg[binary]"
.\.venv\Scripts\python -m alembic upgrade head
```

**Note:** this project uses its own JWT authentication (FastAPI-issued tokens), not Supabase
Auth. Supabase is used only as a managed PostgreSQL host. Do not enable Supabase Row Level
Security expectations for these tables unless you also move authentication to Supabase;
access control is enforced by the API's `user_id` filters.

---

## 8. Moving data from SQLite to PostgreSQL

Alembic migrates the **schema**, not the rows. To move existing local data:

```powershell
# Simple option: export transactions to CSV from the Profile page, then re-enter/import
# the rows through the API after switching databases.

# Or use a one-off script with pandas + SQLAlchemy and preserve hashed_password values.
```

If you copy rows manually, keep the `users` table first (foreign keys), preserve `id`
values, and reset PostgreSQL sequences afterwards:

```sql
SELECT setval(pg_get_serial_sequence('transactions', 'id'), COALESCE(MAX(id), 1)) FROM transactions;
```

---

## 9. Backup and reset

### SQLite

```powershell
# Backup (stop the backend first, or use SQLite's online backup API)
Copy-Item backend\finance.db backend\finance.backup.db

# Full local reset - deletes ALL users and financial records
Remove-Item backend\finance.db
# The file and empty tables are recreated on the next backend start.
```

### PostgreSQL

```powershell
docker exec ai-finance-postgres pg_dump -U finance ai_finance > backup.sql
docker exec -i ai-finance-postgres psql -U finance ai_finance < backup.sql
```

---

## 10. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `database is locked` | Two writers on SQLite. Stop extra Uvicorn workers or switch to PostgreSQL. |
| Tables missing after model change | `create_all` does not alter columns. Create and apply an Alembic migration. |
| `ModuleNotFoundError: psycopg` | Install `psycopg[binary]` in the backend venv. |
| Supabase connection timeout | Use the pooler host and the correct region/port; check the URL-encoded password. |
| `SECRET_KEY must be at least 16 characters` | Generate one: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| Data visible across accounts | Should be impossible (all queries filter by `user_id`). Report it as a bug with the failing request. |
