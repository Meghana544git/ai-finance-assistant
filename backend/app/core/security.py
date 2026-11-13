"""Password hashing and JWT token utilities."""

from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core.config import settings

# Argon2id is the password hashing algorithm. pwdlib verifies hashes in
# constant time and automatically upgrades parameters when needed.
password_hash = PasswordHash((Argon2Hasher(),))

TokenType = Literal["access", "refresh"]


class TokenError(Exception):
    """Raised when a JWT is invalid, expired, or of the wrong type."""


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return password_hash.verify(plain_password, hashed_password)
    except Exception:
        # Unknown/corrupted hash format must not crash the request.
        return False


def _create_token(subject: str, token_type: TokenType, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
        "iss": settings.APP_NAME,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(subject: str) -> str:
    return _create_token(
        subject, "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )


def create_refresh_token(subject: str) -> str:
    return _create_token(subject, "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            issuer=settings.APP_NAME,
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("Token has expired. Please sign in again.") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError("Invalid authentication token.") from exc

    if payload.get("type") != expected_type:
        raise TokenError(f"Expected a {expected_type} token.")
    if not payload.get("sub"):
        raise TokenError("Token is missing a subject.")
    return payload
