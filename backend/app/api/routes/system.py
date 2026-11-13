"""Health and system information."""

from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.database.session import IS_SQLITE, engine

router = APIRouter(tags=["System"])


@router.get("/health")
def health() -> dict:
    database_ok = True
    database_error: str | None = None
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:  # pragma: no cover - only on a broken database
        database_ok = False
        database_error = "Database connection failed."

    model_path = Path(settings.CATEGORY_MODEL_PATH)
    return {
        "status": "ok" if database_ok else "degraded",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "connected": database_ok,
            "engine": "sqlite" if IS_SQLITE else "postgresql",
            **({"error": database_error} if database_error else {}),
        },
        "machine_learning": {
            "category_model_available": model_path.exists(),
            "auto_train_on_startup": settings.AUTO_TRAIN_ON_STARTUP,
        },
    }
