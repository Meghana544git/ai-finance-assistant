"""Pytest fixtures. Uses an isolated temporary SQLite database per test run."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

# Environment must be configured BEFORE importing application modules because
# settings are cached at import time.
_TEMP_DIR = Path(tempfile.mkdtemp(prefix="ai_finance_tests_"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_TEMP_DIR / 'test.db').as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key-with-more-than-32-characters"
os.environ["ENVIRONMENT"] = "test"
os.environ["AUTO_TRAIN_ON_STARTUP"] = "true"
os.environ["AUTO_CREATE_TABLES"] = "true"
os.environ["MIN_FORECAST_MONTHS"] = "4"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database.base import Base  # noqa: E402
from app.database.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


def _register(client: TestClient, email: str | None = None) -> dict:
    import uuid

    email = email or f"user_{uuid.uuid4().hex[:10]}@example.com"
    response = client.post(
        "/api/auth/register",
        json={"full_name": "Test Student", "email": email, "password": "Password123"},
    )
    assert response.status_code == 201, response.text
    payload = response.json()
    payload["email"] = email
    return payload


@pytest.fixture
def user(client) -> dict:
    data = _register(client)
    return {
        "email": data["email"],
        "token": data["access_token"],
        "refresh": data["refresh_token"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
        "id": data["user"]["id"],
    }


@pytest.fixture
def second_user(client) -> dict:
    data = _register(client)
    return {
        "email": data["email"],
        "token": data["access_token"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
        "id": data["user"]["id"],
    }


@pytest.fixture
def register_user(client):
    def _factory(email: str | None = None) -> dict:
        data = _register(client, email)
        return {
            "email": data["email"],
            "token": data["access_token"],
            "refresh": data["refresh_token"],
            "headers": {"Authorization": f"Bearer {data['access_token']}"},
            "id": data["user"]["id"],
        }

    return _factory


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def make_transaction(
    client: TestClient,
    headers: dict,
    title: str,
    amount: float,
    transaction_type: str = "expense",
    category: str | None = None,
    transaction_date: str | None = None,
) -> dict:
    body = {
        "title": title,
        "amount": amount,
        "transaction_type": transaction_type,
        "transaction_date": transaction_date or "2026-11-10",
    }
    if category is not None:
        body["category"] = category
    response = client.post("/api/transactions", json=body, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()
