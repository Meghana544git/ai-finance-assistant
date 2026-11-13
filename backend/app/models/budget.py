from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Budget(TimestampMixin, Base):
    """A monthly spending limit, optionally scoped to one category.

    ``category`` is NULL for an overall monthly budget covering every category.
    Uniqueness of (user, month, year, category) is enforced in the service
    layer because SQL treats NULLs as distinct in unique indexes.
    """

    __tablename__ = "budgets"
    __table_args__ = (
        CheckConstraint("monthly_limit > 0", name="ck_budgets_limit_positive"),
        CheckConstraint("month BETWEEN 1 AND 12", name="ck_budgets_month_valid"),
        CheckConstraint("year BETWEEN 2000 AND 2100", name="ck_budgets_year_valid"),
        Index("ix_budgets_user_period", "user_id", "year", "month"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str | None] = mapped_column(String(32), nullable=True)
    monthly_limit: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)

    user: Mapped[User] = relationship(back_populates="budgets")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Budget id={self.id} {self.month}/{self.year} {self.category or 'Overall'}>"
