from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import CategorySource, TransactionType
from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Transaction(TimestampMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_transactions_amount_positive"),
        CheckConstraint(
            "transaction_type IN ('income', 'expense')",
            name="ck_transactions_type_valid",
        ),
        Index("ix_transactions_user_date", "user_id", "transaction_date"),
        Index("ix_transactions_user_type", "user_id", "transaction_type"),
        Index("ix_transactions_user_category", "user_id", "category"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    transaction_type: Mapped[str] = mapped_column(
        String(16), default=TransactionType.EXPENSE.value, nullable=False
    )
    category: Mapped[str] = mapped_column(String(32), default="Other", nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    category_source: Mapped[str] = mapped_column(
        String(16), default=CategorySource.MANUAL.value, nullable=False
    )

    user: Mapped[User] = relationship(back_populates="transactions")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Transaction id={self.id} title={self.title!r} amount={self.amount}>"
