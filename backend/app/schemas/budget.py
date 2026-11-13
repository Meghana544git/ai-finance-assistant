from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.constants import Category


class BudgetBase(BaseModel):
    category: Category | None = Field(
        default=None, description="NULL means an overall monthly budget."
    )
    monthly_limit: float = Field(gt=0, le=1_000_000_000)
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2000, le=2100)

    @field_validator("monthly_limit")
    @classmethod
    def _round_limit(cls, value: float) -> float:
        return round(value, 2)


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    category: Category | None = None
    monthly_limit: float | None = Field(default=None, gt=0, le=1_000_000_000)
    month: int | None = Field(default=None, ge=1, le=12)
    year: int | None = Field(default=None, ge=2000, le=2100)

    @model_validator(mode="after")
    def _at_least_one_field(self) -> "BudgetUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        return self


class BudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    category: str | None
    monthly_limit: float
    month: int
    year: int
    spent: float
    remaining: float
    utilization: float
    status: str
    created_at: datetime
    updated_at: datetime


class BudgetListResponse(BaseModel):
    items: list[BudgetOut]
    total_limit: float
    total_spent: float
    overall_utilization: float
