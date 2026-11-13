"""Budget CRUD with live spent/remaining/utilization calculations."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, DbSession
from app.models.budget import Budget
from app.schemas.budget import BudgetCreate, BudgetListResponse, BudgetOut, BudgetUpdate
from app.schemas.common import Message
from app.services.analytics import (
    budget_summary,
    budgets_for_period,
    expenses_by_category,
    month_bounds,
)

router = APIRouter(prefix="/budgets", tags=["Budgets"])


def _serialize(budget: Budget, spent: float) -> BudgetOut:
    limit = float(budget.monthly_limit)
    remaining = round(limit - spent, 2)
    utilization = round((spent / limit) * 100, 1) if limit > 0 else 0.0
    if utilization >= 100:
        state = "exceeded"
    elif utilization >= 80:
        state = "warning"
    else:
        state = "healthy"
    return BudgetOut(
        id=budget.id,
        user_id=budget.user_id,
        category=budget.category,
        monthly_limit=round(limit, 2),
        month=budget.month,
        year=budget.year,
        spent=round(spent, 2),
        remaining=remaining,
        utilization=utilization,
        status=state,
        created_at=budget.created_at,
        updated_at=budget.updated_at,
    )


def _get_owned(db: Session, user_id: int, budget_id: int) -> Budget:
    budget = db.scalar(select(Budget).where(Budget.id == budget_id, Budget.user_id == user_id))
    if budget is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found.")
    return budget


def _duplicate_exists(
    db: Session,
    user_id: int,
    year: int,
    month: int,
    category: str | None,
    exclude_id: int | None = None,
) -> bool:
    filters = [
        Budget.user_id == user_id,
        Budget.year == year,
        Budget.month == month,
        Budget.category.is_(None) if category is None else Budget.category == category,
    ]
    if exclude_id is not None:
        filters.append(Budget.id != exclude_id)
    return db.scalar(select(Budget.id).where(*filters)) is not None


def _spent_for(db: Session, user_id: int, budget: Budget) -> float:
    start, end = month_bounds(budget.year, budget.month)
    grouped = expenses_by_category(db, user_id, start, end)
    if budget.category is None:
        return round(sum(item["amount"] for item in grouped.values()), 2)
    return round(float(grouped.get(budget.category, {}).get("amount", 0.0)), 2)


@router.get("", response_model=BudgetListResponse)
def list_budgets(
    current_user: CurrentUser,
    db: DbSession,
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
) -> BudgetListResponse:
    if (month is None) != (year is None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide both month and year, or neither.",
        )

    if month is not None and year is not None:
        entries = budgets_for_period(db, current_user.id, year, month)
        items = [_serialize(entry["budget"], entry["spent"]) for entry in entries]
        # Match the dashboard: an overall budget takes precedence, otherwise the
        # category limits are combined. Never double-count an overall budget
        # together with the category budgets it already covers.
        summary = budget_summary(db, current_user.id, year, month)
        total_limit = round(summary["limit"], 2)
        total_spent = round(summary["spent"], 2)
        overall_utilization = summary["utilization"]
    else:
        budgets = db.scalars(
            select(Budget)
            .where(Budget.user_id == current_user.id)
            .order_by(Budget.year.desc(), Budget.month.desc(), Budget.category.is_(None).desc())
        ).all()
        items = [_serialize(budget, _spent_for(db, current_user.id, budget)) for budget in budgets]
        total_limit = round(sum(item.monthly_limit for item in items), 2)
        total_spent = round(sum(item.spent for item in items), 2)
        overall_utilization = round((total_spent / total_limit) * 100, 1) if total_limit else 0.0

    return BudgetListResponse(
        items=items,
        total_limit=total_limit,
        total_spent=total_spent,
        overall_utilization=overall_utilization,
    )


@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def create_budget(
    payload: BudgetCreate, current_user: CurrentUser, db: DbSession
) -> BudgetOut:
    category = payload.category.value if payload.category else None
    if _duplicate_exists(db, current_user.id, payload.year, payload.month, category):
        label = category or "Overall"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"A {label} budget already exists for "
                f"{payload.month:02d}/{payload.year}. Edit the existing budget instead."
            ),
        )
    budget = Budget(
        user_id=current_user.id,
        category=category,
        monthly_limit=payload.monthly_limit,
        month=payload.month,
        year=payload.year,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return _serialize(budget, _spent_for(db, current_user.id, budget))


@router.put("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: int, payload: BudgetUpdate, current_user: CurrentUser, db: DbSession
) -> BudgetOut:
    budget = _get_owned(db, current_user.id, budget_id)
    updates = payload.model_dump(exclude_unset=True)

    new_category = updates.pop("category", "__unset__")
    new_month = updates.get("month", budget.month)
    new_year = updates.get("year", budget.year)

    effective_category = budget.category
    if new_category != "__unset__":
        effective_category = new_category.value if new_category else None

    if _duplicate_exists(
        db, current_user.id, new_year, new_month, effective_category, exclude_id=budget.id
    ):
        label = effective_category or "Overall"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A {label} budget already exists for {new_month:02d}/{new_year}.",
        )

    if new_category != "__unset__":
        budget.category = effective_category
    for field in ("monthly_limit", "month", "year"):
        if field in updates and updates[field] is not None:
            setattr(budget, field, updates[field])

    db.commit()
    db.refresh(budget)
    return _serialize(budget, _spent_for(db, current_user.id, budget))


@router.delete("/{budget_id}", response_model=Message)
def delete_budget(budget_id: int, current_user: CurrentUser, db: DbSession) -> Message:
    budget = _get_owned(db, current_user.id, budget_id)
    db.delete(budget)
    db.commit()
    return Message(message="Budget deleted successfully.")
