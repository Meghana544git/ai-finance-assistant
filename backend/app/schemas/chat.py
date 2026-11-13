from typing import Any

from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)

    @field_validator("message")
    @classmethod
    def _strip_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be empty.")
        return value


class ChatResponse(BaseModel):
    reply: str
    intent: str
    data: dict[str, Any] | None = None
    suggestions: list[str] = Field(default_factory=list)
    source: str = "rule_based"
    disclaimer: str = (
        "This assistant is a local rule-based helper that reads your own saved "
        "transactions. It is educational and not financial advice."
    )
