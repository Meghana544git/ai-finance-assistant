from datetime import datetime

from pydantic import BaseModel


class InsightOut(BaseModel):
    id: int | None = None
    insight_type: str
    title: str
    description: str
    severity: str = "info"
    source: str = "rule_based"
    created_at: datetime | None = None


class InsightsResponse(BaseModel):
    insights: list[InsightOut]
    generated_at: datetime
    month: int
    year: int
    currency: str
    data_points: int
    disclaimer: str
