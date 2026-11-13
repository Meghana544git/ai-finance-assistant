"""FastAPI application entry point.

Run from the ``backend`` folder:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api.router import api_router
from app.api.routes.system import health as system_health
from app.core.config import settings
from app.database.base import Base
from app.database.session import IS_SQLITE, engine, mask_database_url
from app.models import Budget, CategoryFeedback, Insight, Prediction, Transaction, User  # noqa: F401

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("ai_finance_assistant")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Starting %s v%s (%s)", settings.APP_NAME, settings.APP_VERSION, settings.ENVIRONMENT)
    logger.info("Database: %s", mask_database_url(settings.DATABASE_URL))
    if settings.SECRET_KEY.startswith("dev-only-insecure"):
        logger.warning("Using the development SECRET_KEY. Set a strong SECRET_KEY before deployment.")

    if settings.AUTO_CREATE_TABLES:
        # Convenient for local SQLite development. Production/PostgreSQL
        # deployments should run `alembic upgrade head` instead.
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified/created.")

    if settings.AUTO_TRAIN_ON_STARTUP:
        try:
            from ml.classifier import ensure_model, get_model_info

            ensure_model()
            info = get_model_info()
            logger.info(
                "Category classifier ready (version=%s, accuracy=%s)",
                info.get("model_version"),
                info.get("accuracy"),
            )
        except Exception:
            logger.exception(
                "Category classifier could not be loaded. "
                "The rest of the API will still work; run 'python ml/train_model.py'."
            )

    yield
    logger.info("Shutting down %s", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Educational full-stack personal finance API. Track income and expenses, "
        "auto-categorise spending with TF-IDF + Logistic Regression, forecast next "
        "month's expenses with Linear Regression, and read rule-based insights."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")


app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/health", tags=["System"])
def health() -> dict:
    """Un-prefixed health check, convenient for hosting platforms."""
    return system_health()
