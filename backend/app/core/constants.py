"""Role-neutral constants shared across the application."""

from enum import StrEnum


class TransactionType(StrEnum):
    INCOME = "income"
    EXPENSE = "expense"


class Category(StrEnum):
    FOOD = "Food"
    TRANSPORT = "Transport"
    SHOPPING = "Shopping"
    BILLS = "Bills"
    ENTERTAINMENT = "Entertainment"
    HEALTH = "Health"
    EDUCATION = "Education"
    OTHER = "Other"


CATEGORY_VALUES: list[str] = [c.value for c in Category]
TRANSACTION_TYPE_VALUES: list[str] = [t.value for t in TransactionType]


class CategorySource(StrEnum):
    MANUAL = "manual"
    ML = "ml"
    DEFAULT = "default"
    CORRECTED = "corrected"


class BudgetStatus(StrEnum):
    HEALTHY = "healthy"
    WARNING = "warning"
    EXCEEDED = "exceeded"
