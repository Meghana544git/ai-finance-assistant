"""SQLAlchemy engine/session configuration.

Supports SQLite (default, zero-setup local development) and PostgreSQL /
Supabase PostgreSQL through the DATABASE_URL environment variable.
"""

import logging
from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)


def normalize_database_url(url: str) -> str:
    """Normalise common PostgreSQL URL schemes to the psycopg (v3) driver."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and "+" not in url.split("://", 1)[0]:
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


DATABASE_URL = normalize_database_url(settings.DATABASE_URL)
IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine_kwargs: dict = {"pool_pre_ping": True, "future": True}
if IS_SQLITE:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update({"pool_size": 5, "max_overflow": 10, "pool_recycle": 1800})

engine: Engine = create_engine(DATABASE_URL, **engine_kwargs)

if IS_SQLITE:

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record):  # pragma: no cover
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def mask_database_url(url: str) -> str:
    """Return a log-safe database URL with credentials removed."""
    if "@" not in url:
        return url
    scheme, rest = url.split("://", 1)
    return f"{scheme}://***:***@{rest.split('@', 1)[1]}"
