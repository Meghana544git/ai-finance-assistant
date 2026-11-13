"""Finance assistant chatbot endpoint (local rule-based engine)."""

from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat import SUGGESTIONS, handle_message

router = APIRouter(prefix="/chat", tags=["Finance Assistant"])


@router.post("/message", response_model=ChatResponse)
def chat(payload: ChatRequest, current_user: CurrentUser, db: DbSession) -> ChatResponse:
    result = handle_message(
        db, current_user.id, payload.message, currency=current_user.preferred_currency
    )
    return ChatResponse(
        reply=result["reply"],
        intent=result.get("intent", "unknown"),
        data=result.get("data"),
        suggestions=result.get("suggestions", SUGGESTIONS),
        source="rule_based",
    )


@router.get("/suggestions", response_model=list[str])
def suggestions() -> list[str]:
    return SUGGESTIONS
