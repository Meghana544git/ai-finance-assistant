"""Rule-based insight generation and persistence."""

from datetime import date, datetime, timezone

from fastapi import APIRouter, Query
from sqlalchemy import delete

from app.core.deps import CurrentUser, DbSession
from app.models.insight import Insight
from app.schemas.insight import InsightOut, InsightsResponse
from app.services.insights import DISCLAIMER, build_insights

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("", response_model=InsightsResponse)
def get_insights(
    current_user: CurrentUser,
    db: DbSession,
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
) -> InsightsResponse:
    today = date.today()
    month = month or today.month
    year = year or today.year

    result = build_insights(
        db, current_user.id, year, month, currency=current_user.preferred_currency
    )

    # Insights are fully derived data. Replace the previous snapshot so the
    # table never accumulates duplicate insights from repeated page loads.
    db.execute(delete(Insight).where(Insight.user_id == current_user.id))
    persisted: list[InsightOut] = []
    now = datetime.now(timezone.utc)
    for item in result["insights"]:
        record = Insight(
            user_id=current_user.id,
            insight_type=item["insight_type"],
            title=item["title"],
            description=item["description"],
        )
        db.add(record)
        persisted.append(
            InsightOut(
                **item,
                source="rule_based",
                created_at=now,
            )
        )
    db.commit()

    # Attach database ids after commit.
    saved = (
        db.query(Insight)
        .filter(Insight.user_id == current_user.id)
        .order_by(Insight.id.asc())
        .all()
    )
    for output, record in zip(persisted, saved):
        output.id = record.id
        output.created_at = record.created_at

    return InsightsResponse(
        insights=persisted,
        generated_at=now,
        month=month,
        year=year,
        currency=current_user.preferred_currency,
        data_points=result["data_points"],
        disclaimer=DISCLAIMER,
    )
