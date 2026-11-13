"""Dashboard aggregates computed entirely from the user's transactions."""

from datetime import date

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.schemas.dashboard import (
    CategoryBreakdown,
    CategoryBreakdownItem,
    DashboardSummary,
    MonthlyTrend,
    MonthlyTrendsResponse,
)
from app.services.analytics import (
    budget_summary,
    category_breakdown,
    expenses_for_period,
    income_for_period,
    monthly_series,
    period_label,
    total_balance,
    transaction_count_for_period,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(
    current_user: CurrentUser,
    db: DbSession,
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
) -> DashboardSummary:
    today = date.today()
    month = month or today.month
    year = year or today.year

    income = income_for_period(db, current_user.id, year, month)
    expenses = expenses_for_period(db, current_user.id, year, month)
    savings = round(income - expenses, 2)
    buckets = budget_summary(db, current_user.id, year, month)
    _, categories = category_breakdown(db, current_user.id, year, month)

    return DashboardSummary(
        month=month,
        year=year,
        period_label=period_label(year, month),
        total_income=income,
        total_expenses=expenses,
        net_savings=savings,
        savings_rate=round((savings / income) * 100, 1) if income > 0 else 0.0,
        total_balance=total_balance(db, current_user.id),
        transaction_count=transaction_count_for_period(db, current_user.id, year, month),
        top_category=categories[0]["category"] if categories else None,
        budget_limit=buckets["limit"],
        budget_spent=buckets["spent"],
        budget_remaining=buckets["remaining"],
        budget_utilization=buckets["utilization"],
        budget_status=buckets["status"],
        budget_count=buckets["count"],
        currency=current_user.preferred_currency,
    )


@router.get("/monthly-trends", response_model=MonthlyTrendsResponse)
def monthly_trends(
    current_user: CurrentUser,
    db: DbSession,
    months: int = Query(default=6, ge=1, le=24),
    end_month: int | None = Query(default=None, ge=1, le=12),
    end_year: int | None = Query(default=None, ge=2000, le=2100),
) -> MonthlyTrendsResponse:
    today = date.today()
    end_month = end_month or today.month
    end_year = end_year or today.year
    series = monthly_series(db, current_user.id, months=months, end_year=end_year, end_month=end_month)
    return MonthlyTrendsResponse(
        trends=[MonthlyTrend(**point) for point in series],
        months=months,
    )


@router.get("/category-breakdown", response_model=CategoryBreakdown)
def category_breakdown_endpoint(
    current_user: CurrentUser,
    db: DbSession,
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
) -> CategoryBreakdown:
    today = date.today()
    month = month or today.month
    year = year or today.year
    total, items = category_breakdown(db, current_user.id, year, month)
    return CategoryBreakdown(
        month=month,
        year=year,
        total_expenses=total,
        items=[CategoryBreakdownItem(**item) for item in items],
    )
