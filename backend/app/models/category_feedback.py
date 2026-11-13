from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.transaction import Transaction
    from app.models.user import User


class CategoryFeedback(TimestampMixin, Base):
    """User corrections of ML category predictions.

    Stored for a future, explicit retraining workflow. Production models are
    never retrained automatically from this table.
    """

    __tablename__ = "category_feedback"
    __table_args__ = (Index("ix_feedback_user_created", "user_id", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    transaction_id: Mapped[int | None] = mapped_column(
        ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    predicted_category: Mapped[str] = mapped_column(String(32), nullable=False)
    corrected_category: Mapped[str] = mapped_column(String(32), nullable=False)

    user: Mapped[User] = relationship()
    transaction: Mapped[Transaction | None] = relationship()
