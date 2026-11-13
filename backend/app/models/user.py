from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.budget import Budget
    from app.models.insight import Insight
    from app.models.prediction import Prediction
    from app.models.transaction import Transaction


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    preferred_currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    transactions: Mapped[list[Transaction]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    budgets: Mapped[list[Budget]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    predictions: Mapped[list[Prediction]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    insights: Mapped[list[Insight]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<User id={self.id} email={self.email!r}>"
