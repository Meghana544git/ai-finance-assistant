"""Shared financial aggregation helpers.

Every calculation in this module is derived from rows in the ``transactions``
table for one authenticated user. No sample or fabricated numbers are used.
"""

from __future__ import annotations

from calendar import month_abbr
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.constants import TransactionType
from app.models.budget import Budget
from app.models.transaction import Transaction

MONTH_NAMES = list(month_abbr)[1:]


def month_bounds(year: int, month: int) -> tuple[date, date]:
    """Return [start, end) dates for a calendar month."""
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end


def shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    index = (year * 12 + (month - 1)) + delta
    return index // 12, index % 12 + 1


def period_label(year: int, month: int) -> str:
    return f"{MONTH_NAMES[month - 1]} {year}"


def to_float(value: Decimal | float | int | None) -> float:
    return round(float(value or 0), 2)


def _scalar_sum(db: Session, user_id: int, tx_type: str, start: date, end: date) -> float:
    total = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == user_id,
            Transaction.transaction_type == tx_type,
            Transaction.transaction_date >= start,
            Transaction.transaction_date < end,
        )
    )
    return to_float(total)


def income_for_period(db: Session, user_id: int, year: int, month: int) -> float:
    start, end = month_bounds(year, month)
    return _scalar_sum(db, user_id, TransactionType.INCOME.value, start, end)


def expenses_for_period(db: Session, user_id: int, year: int, month: int) -> float:
    start, end = month_bounds(year, month)
    return _scalar_sum(db, user_id, TransactionType.EXPENSE.value, start, end)


def total_balance(db: Session, user_id: int) -> float:
    income = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.INCOME.value,
        )
    )
    expenses = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.EXPENSE.value,
        )
    )
    return round(to_float(income) - to_float(expenses), 2)


def transaction_count_for_period(db: Session, user_id: int, year: int, month: int) -> int:
    start, end = month_bounds(year, month)
    return int(
        db.scalar(
            select(func.count(Transaction.id)).where(
                Transaction.user_id == user_id,
                Transaction.transaction_date >= start,
                Transaction.transaction_date < end,
            )
        )
        or 0
    )


def expenses_by_category(
    db: Session, user_id: int, start: date, end: date
) -> dict[str, dict[str, float | int]]:
    rows = db.execute(
        select(
            Transaction.category,
            func.coalesce(func.sum(Transaction.amount), 0),
            func.count(Transaction.id),
        )
        .where(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.EXPENSE.value,
            Transaction.transaction_date >= start,
            Transaction.transaction_date < end,
        )
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    ).all()
    return {
        str(category): {"amount": to_float(amount), "count": int(count)}
        for category, amount, count in rows
    }


def category_breakdown(db: Session, user_id: int, year: int, month: int) -> tuple[float, list[dict]]:
    start, end = month_bounds(year, month)
    grouped = expenses_by_category(db, user_id, start, end)
    total = round(sum(v["amount"] for v in grouped.values()), 2)
    items = [
        {
            "category": category,
            "amount": data["amount"],
            "percentage": round((data["amount"] / total) * 100, 1) if total else 0.0,
            "transaction_count": data["count"],
        }
        for category, data in grouped.items()
    ]
    return total, items


def monthly_series(db: Session, user_id: int, months: int = 6, end_year: int | None = None,
                   end_month: int | None = None) -> list[dict]:
    """Income/expense totals for the last ``months`` calendar months.

    Months without transactions are returned with zeros so charts stay
    chronologically continuous.
    """
    today = date.today()
    end_year = end_year or today.year
    end_month = end_month or today.month
    periods = [shift_month(end_year, end_month, -offset) for offset in range(months - 1, -1, -1)]
    first_year, first_month = periods[0]
    start, _ = month_bounds(first_year, first_month)
    _, end = month_bounds(end_year, end_month)

    rows = db.execute(
        select(
            Transaction.transaction_date,
            Transaction.transaction_type,
            Transaction.amount,
        ).where(
            Transaction.user_id == user_id,
            Transaction.transaction_date >= start,
            Transaction.transaction_date < end,
        )
    ).all()

    buckets: dict[tuple[int, int], dict[str, float]] = {
        period: {"income": 0.0, "expenses": 0.0} for period in periods
    }
    for tx_date, tx_type, amount in rows:
        key = (tx_date.year, tx_date.month)
        if key not in buckets:
            continue
        if tx_type == TransactionType.INCOME.value:
            buckets[key]["income"] += to_float(amount)
        else:
            buckets[key]["expenses"] += to_float(amount)

    series = []
    for year, month in periods:
        income = round(buckets[(year, month)]["income"], 2)
        expenses = round(buckets[(year, month)]["expenses"], 2)
        savings = round(income - expenses, 2)
        series.append(
            {
                "month": f"{year:04d}-{month:02d}",
                "label": period_label(year, month),
                "income": income,
                "expenses": expenses,
                "savings": savings,
                "savings_rate": round((savings / income) * 100, 1) if income > 0 else 0.0,
            }
        )
    return series


def budget_utilisation(budget: Budget, spent: float) -> dict:
    limit = to_float(budget.monthly_limit)
    remaining = round(limit - spent, 2)
    utilization = round((spent / limit) * 100, 1) if limit > 0 else 0.0
    if utilization >= 100:
        status = "exceeded"
    elif utilization >= 80:
        status = "warning"
    else:
        status = "healthy"
    return {
        "spent": round(spent, 2),
        "remaining": remaining,
        "utilization": utilization,
        "status": status,
    }


def budgets_for_period(db: Session, user_id: int, year: int, month: int) -> list[dict]:
    start, end = month_bounds(year, month)
    grouped = expenses_by_category(db, user_id, start, end)
    total_expenses = round(sum(v["amount"] for v in grouped.values()), 2)
    budgets = db.scalars(
        select(Budget)
        .where(Budget.user_id == user_id, Budget.year == year, Budget.month == month)
        .order_by(Budget.category.is_(None).desc(), Budget.category.asc())
    ).all()

    result = []
    for budget in budgets:
        spent = total_expenses if budget.category is None else grouped.get(budget.category, {}).get("amount", 0.0)
        result.append({"budget": budget, **budget_utilisation(budget, float(spent))})
    return result


def budget_summary(db: Session, user_id: int, year: int, month: int) -> dict:
    """Overall budget picture for the dashboard.

    If an explicit "overall" budget exists it takes precedence; otherwise the
    category budgets are summed and compared against all expenses.
    """
    start, end = month_bounds(year, month)
    grouped = expenses_by_category(db, user_id, start, end)
    total_expenses = round(sum(v["amount"] for v in grouped.values()), 2)
    rows = db.scalars(
        select(Budget).where(Budget.user_id == user_id, Budget.year == year, Budget.month == month)
    ).all()

    overall = next((b for b in rows if b.category is None), None)
    if overall is not None:
        limit = to_float(overall.monthly_limit)
        spent = total_expenses
    else:
        limit = round(sum(to_float(b.monthly_limit) for b in rows), 2)
        spent = round(
            sum(
                grouped.get(b.category, {}).get("amount", 0.0)
                for b in rows
                if b.category
            ),
            2,
        )

    remaining = round(limit - spent, 2)
    utilization = round((spent / limit) * 100, 1) if limit > 0 else 0.0
    status = "none"
    if limit > 0:
        status = "exceeded" if utilization >= 100 else "warning" if utilization >= 80 else "healthy"
    return {
        "limit": limit,
        "spent": spent,
        "remaining": remaining,
        "utilization": utilization,
        "status": status,
        "count": len(rows),
    }


def recent_transactions(db: Session, user_id: int, limit: int = 5) -> list[Transaction]:
    return list(
        db.scalars(
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
            .limit(limit)
        ).all()
    )


def monthly_expense_totals(db: Session, user_id: int, max_months: int = 36) -> list[tuple[str, float]]:
    """Continuous list of (YYYY-MM, total expense) from first to last activity."""
    rows = db.execute(
        select(Transaction.transaction_date, Transaction.amount).where(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.EXPENSE.value,
        )
    ).all()
    if not rows:
        return []

    totals: dict[tuple[int, int], float] = {}
    for tx_date, amount in rows:
        key = (tx_date.year, tx_date.month)
        totals[key] = totals.get(key, 0.0) + to_float(amount)

    keys = sorted(totals.keys())
    start_year, start_month = keys[0]
    end_year, end_month = keys[-1]

    series: list[tuple[str, float]] = []
    year, month = start_year, start_month
    while (year, month) <= (end_year, end_month):
        series.append((f"{year:04d}-{month:02d}", round(totals.get((year, month), 0.0), 2)))
        year, month = shift_month(year, month, 1)
    return series[-max_months:]
