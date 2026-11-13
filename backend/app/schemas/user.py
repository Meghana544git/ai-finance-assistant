from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr

    @field_validator("full_name")
    @classmethod
    def _trim_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Full name must contain at least 2 characters.")
        return value


class RegisterRequest(UserBase):
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def _password_strength(cls, value: str) -> str:
        if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one letter and one number.")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    preferred_currency: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    preferred_currency: str | None = Field(default=None, min_length=3, max_length=3)

    @field_validator("preferred_currency")
    @classmethod
    def _currency_code(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.upper()
        allowed = {"INR", "USD", "EUR", "GBP", "AED", "JPY", "CAD", "AUD", "SGD"}
        if value not in allowed:
            raise ValueError(f"Currency must be one of: {', '.join(sorted(allowed))}")
        return value


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token lifetime in seconds.")
    user: UserOut
