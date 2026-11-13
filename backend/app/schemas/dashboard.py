from pydantic import BaseModel


class DashboardSummary(BaseModel):
    month: int
    year: int
    period_label: str
    total_income: float
    total_expenses: float
    net_savings: float
    savings_rate: float
    total_balance: float
    transaction_count: int
    top_category: str | None
    budget_limit: float
    budget_spent: float
    budget_remaining: float
    budget_utilization: float
    budget_status: str
    budget_count: int
    currency: str


class MonthlyTrend(BaseModel):
    month: str
    label: str
    income: float
    expenses: float
    savings: float
    savings_rate: float


class MonthlyTrendsResponse(BaseModel):
    trends: list[MonthlyTrend]
    months: int


class CategoryBreakdownItem(BaseModel):
    category: str
    amount: float
    percentage: float
    transaction_count: int


class CategoryBreakdown(BaseModel):
    month: int
    year: int
    total_expenses: float
    items: list[CategoryBreakdownItem]
