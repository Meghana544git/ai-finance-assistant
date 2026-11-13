"""Transaction CRUD, filtering, pagination and CSV export."""

from __future__ import annotations

import csv
import io
import math
from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import asc, desc, func, or_, select

from app.core.constants import CategorySource, TransactionType
from app.core.deps import CurrentUser, DbSession
from app.models.category_feedback import CategoryFeedback
from app.models.transaction import Transaction
from app.schemas.common import Message
from app.schemas.transaction import (
    TransactionCreate,
    TransactionList,
    TransactionOut,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])

SORT_FIELDS = {
    "transaction_date": Transaction.transaction_date,
    "amount": Transaction.amount,
    "title": Transaction.title,
    "created_at": Transaction.created_at,
    "category": Transaction.category,
}


def _get_owned(db, user_id: int, transaction_id: int) -> Transaction:
    transaction = db.scalar(
        select(Transaction).where(
            Transaction.id == transaction_id, Transaction.user_id == user_id
        )
    )
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )
    return transaction


@router.get("", response_model=TransactionList)
def list_transactions(
    current_user: CurrentUser,
    db: DbSession,
    search: str | None = Query(default=None, max_length=120),
    category: str | None = Query(default=None),
    transaction_type: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    sort_by: str = Query(default="transaction_date"),
    sort_order: Literal["asc", "desc"] = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> TransactionList:
    if sort_by not in SORT_FIELDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid sort_by. Choose from: {', '.join(SORT_FIELDS)}",
        )
    if transaction_type is not None and transaction_type not in {
        TransactionType.INCOME.value,
        TransactionType.EXPENSE.value,
    }:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="transaction_type must be 'income' or 'expense'.",
        )
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="date_from cannot be after date_to.",
        )

    filters = [Transaction.user_id == current_user.id]
    if search:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                Transaction.title.ilike(term),
                Transaction.description.ilike(term),
                Transaction.notes.ilike(term),
            )
        )
    if category:
        filters.append(Transaction.category == category)
    if transaction_type:
        filters.append(Transaction.transaction_type == transaction_type)
    if date_from:
        filters.append(Transaction.transaction_date >= date_from)
    if date_to:
        filters.append(Transaction.transaction_date <= date_to)

    total = int(db.scalar(select(func.count(Transaction.id)).where(*filters)) or 0)

    totals_rows = db.execute(
        select(Transaction.transaction_type, func.coalesce(func.sum(Transaction.amount), 0))
        .where(*filters)
        .group_by(Transaction.transaction_type)
    ).all()
    totals = {row[0]: float(row[1] or 0) for row in totals_rows}

    order_column = SORT_FIELDS[sort_by]
    order = desc(order_column) if sort_order == "desc" else asc(order_column)
    tiebreak = desc(Transaction.id) if sort_order == "desc" else asc(Transaction.id)

    items = db.scalars(
        select(Transaction)
        .where(*filters)
        .order_by(order, tiebreak)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return TransactionList(
        items=[TransactionOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 0,
        total_income=round(totals.get(TransactionType.INCOME.value, 0.0), 2),
        total_expenses=round(totals.get(TransactionType.EXPENSE.value, 0.0), 2),
    )


@router.get("/export")
def export_transactions(current_user: CurrentUser, db: DbSession) -> StreamingResponse:
    """Download every transaction owned by the current user as CSV."""
    rows = db.scalars(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
    ).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "Date", "Title", "Description", "Amount", "Currency", "Type",
            "Category", "Notes", "Category Source",
        ]
    )
    for row in rows:
        writer.writerow(
            [
                row.transaction_date.isoformat(),
                row.title,
                row.description or "",
                f"{float(row.amount):.2f}",
                current_user.preferred_currency,
                row.transaction_type,
                row.category,
                row.notes or "",
                row.category_source,
            ]
        )

    # UTF-8 BOM keeps the rupee symbol readable in Excel on Windows.
    content = "\ufeff" + buffer.getvalue()
    filename = f"transactions-{date.today().isoformat()}.csv"
    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate, current_user: CurrentUser, db: DbSession
) -> TransactionOut:
    category = payload.category.value if payload.category else None
    category_source = CategorySource.MANUAL.value

    if payload.transaction_type == TransactionType.EXPENSE and not category:
        # Backend-side convenience: auto-categorise when the client omits a
        # category. The UI normally calls /api/ml/predict-category first so
        # the user can review the suggestion before saving.
        try:
            from ml.classifier import predict_category

            result = predict_category(payload.title, payload.description)
            category = result["category"]
            category_source = CategorySource.ML.value
        except Exception:
            category = "Other"
            category_source = CategorySource.DEFAULT.value
    elif category:
        category_source = (
            payload.category_source.value
            if payload.category_source
            else CategorySource.MANUAL.value
        )
        if category_source not in {c.value for c in CategorySource}:
            category_source = CategorySource.MANUAL.value

    transaction = Transaction(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        amount=payload.amount,
        transaction_type=payload.transaction_type.value,
        category=category or "Other",
        transaction_date=payload.transaction_date,
        notes=payload.notes,
        category_source=category_source,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return TransactionOut.model_validate(transaction)


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(transaction_id: int, current_user: CurrentUser, db: DbSession) -> TransactionOut:
    return TransactionOut.model_validate(_get_owned(db, current_user.id, transaction_id))


@router.put("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> TransactionOut:
    transaction = _get_owned(db, current_user.id, transaction_id)
    updates = payload.model_dump(exclude_unset=True)

    new_category = updates.pop("category", None)
    previous_category = transaction.category
    was_ml = transaction.category_source == CategorySource.ML.value

    for field, value in updates.items():
        if field == "transaction_type" and value is not None:
            value = value.value if hasattr(value, "value") else value
        setattr(transaction, field, value)

    if new_category is not None:
        category_value = new_category.value if hasattr(new_category, "value") else new_category
        if category_value != previous_category:
            transaction.category = category_value
            if was_ml:
                # Preserve the user's correction for an explicit future
                # retraining workflow; never retrain the live model here.
                text = " ".join(
                    part for part in [transaction.title, transaction.description or ""] if part
                )
                db.add(
                    CategoryFeedback(
                        user_id=current_user.id,
                        transaction_id=transaction.id,
                        text=text,
                        predicted_category=previous_category,
                        corrected_category=category_value,
                    )
                )
                transaction.category_source = CategorySource.CORRECTED.value

    db.commit()
    db.refresh(transaction)
    return TransactionOut.model_validate(transaction)


@router.delete("/{transaction_id}", response_model=Message)
def delete_transaction(
    transaction_id: int, current_user: CurrentUser, db: DbSession
) -> Message:
    transaction = _get_owned(db, current_user.id, transaction_id)
    db.delete(transaction)
    db.commit()
    return Message(message="Transaction deleted successfully.")
