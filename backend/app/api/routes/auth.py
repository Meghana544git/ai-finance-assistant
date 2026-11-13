"""Authentication endpoints: register, login, refresh, logout, profile."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import delete, select

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.category_feedback import CategoryFeedback
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from app.schemas.common import Message
from app.schemas.user import UserOut, UserUpdate

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> TokenResponse:
    email = payload.email.lower().strip()
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Try signing in instead.",
        )

    user = User(
        full_name=payload.full_name,
        email=email,
        hashed_password=hash_password(payload.password),
        preferred_currency="INR",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")
    return _token_response(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: DbSession) -> TokenResponse:
    try:
        token_payload = decode_token(payload.refresh_token, "refresh")
    except TokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    try:
        user_id = int(token_payload["sub"])
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token subject."
        ) from exc

    user = db.scalar(select(User).where(User.id == user_id))
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not found or disabled."
        )
    return _token_response(user)


@router.post("/logout", response_model=Message)
def logout(current_user: CurrentUser) -> Message:
    # JWTs are stateless. Logout is completed by the client discarding its
    # tokens; this endpoint exists so the client has a single, explicit flow
    # and can be extended to server-side revocation later.
    return Message(message="Signed out successfully. Discard the stored tokens on the client.")


@router.get("/me", response_model=UserOut)
def read_me(current_user: CurrentUser) -> UserOut:
    return UserOut.model_validate(current_user)


@router.put("/me", response_model=UserOut)
def update_me(payload: UserUpdate, current_user: CurrentUser, db: DbSession) -> UserOut:
    if payload.email is not None:
        email = payload.email.lower().strip()
        if email != current_user.email:
            existing = db.scalar(select(User).where(User.email == email, User.id != current_user.id))
            if existing is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="That email is already used by another account.",
                )
            current_user.email = email
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.preferred_currency is not None:
        current_user.preferred_currency = payload.preferred_currency

    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.delete("/me", response_model=Message)
def delete_me(current_user: CurrentUser, db: DbSession) -> Message:
    """Permanently delete the account and all owned financial data."""
    db.execute(delete(CategoryFeedback).where(CategoryFeedback.user_id == current_user.id))
    db.delete(current_user)
    db.commit()
    return Message(message="Account and all associated financial data were deleted.")
