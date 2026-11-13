from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.constants import Category, CategorySource, TransactionType


class TransactionBase(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    amount: float = Field(gt=0, le=1_000_000_000, description="Positive amount in user's currency.")
    transaction_type: TransactionType = TransactionType.EXPENSE
    category: Category | None = None
    transaction_date: date = Field(default_factory=date.today)
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("title")
    @classmethod
    def _clean_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title cannot be blank.")
        return value

    @field_validator("amount")
    @classmethod
    def _round_amount(cls, value: float) -> float:
        return round(value, 2)

    @field_validator("transaction_date")
    @classmethod
    def _sane_date(cls, value: date) -> date:
        if value.year < 2000 or value.year > 2100:
            raise ValueError("Transaction date must be between years 2000 and 2100.")
        return value


class TransactionCreate(TransactionBase):
    category_source: CategorySource | None = None


class TransactionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    amount: float | None = Field(default=None, gt=0, le=1_000_000_000)
    transaction_type: TransactionType | None = None
    category: Category | None = None
    transaction_date: date | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("title")
    @classmethod
    def _clean_title(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Title cannot be blank.")
        return value

    @field_validator("amount")
    @classmethod
    def _round_amount(cls, value: float | None) -> float | None:
        return None if value is None else round(value, 2)

    @model_validator(mode="after")
    def _at_least_one_field(self) -> "TransactionUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        return self


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    description: str | None
    amount: float
    transaction_type: TransactionType
    category: str
    transaction_date: date
    notes: str | None
    category_source: str
    created_at: datetime
    updated_at: datetime


class TransactionList(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    page_size: int
    pages: int
    total_income: float
    total_expenses: float
