"""Application configuration loaded from environment variables.

All values have safe local-development defaults. Secrets must be supplied
through a .env file (see .env.example) and never committed to source control.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
ML_DIR = BACKEND_DIR / "ml"
ARTIFACTS_DIR = ML_DIR / "artifacts"
DATASET_PATH = ML_DIR / "dataset" / "transactions_training_data.csv"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(BACKEND_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "AI Finance Assistant"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    API_PREFIX: str = "/api"

    # --- Security -------------------------------------------------------
    # CHANGE THIS in production. Generate with:
    #   python -c "import secrets; print(secrets.token_urlsafe(48))"
    SECRET_KEY: str = "dev-only-insecure-secret-key-change-me-before-deploying"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Database -------------------------------------------------------
    # SQLite by default so the project runs with zero external services.
    # PostgreSQL / Supabase examples:
    #   postgresql+psycopg://user:password@localhost:5432/ai_finance
    #   postgresql+psycopg://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres
    DATABASE_URL: str = f"sqlite:///{(BACKEND_DIR / 'finance.db').as_posix()}"
    # Creates tables automatically on startup (great for SQLite demos).
    # Set to false when managing schema exclusively with Alembic.
    AUTO_CREATE_TABLES: bool = True

    # --- CORS -----------------------------------------------------------
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- Machine learning ----------------------------------------------
    CATEGORY_MODEL_PATH: str = str(ARTIFACTS_DIR / "category_classifier.joblib")
    CATEGORY_METADATA_PATH: str = str(ARTIFACTS_DIR / "category_model_metadata.json")
    CATEGORY_EVALUATION_PATH: str = str(ARTIFACTS_DIR / "category_evaluation.json")
    TRAINING_DATASET_PATH: str = str(DATASET_PATH)
    AUTO_TRAIN_ON_STARTUP: bool = True
    MIN_FORECAST_MONTHS: int = 4

    @field_validator("SECRET_KEY")
    @classmethod
    def _secret_must_not_be_empty(cls, value: str) -> str:
        if not value or len(value) < 16:
            raise ValueError(
                "SECRET_KEY must be at least 16 characters. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
            )
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
