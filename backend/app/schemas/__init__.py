"""Pydantic request/response models."""

from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.budget import BudgetCreate, BudgetOut, BudgetUpdate
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.common import Message
from app.schemas.dashboard import CategoryBreakdown, DashboardSummary, MonthlyTrend
from app.schemas.insight import InsightOut
from app.schemas.ml import (
    CategoryPrediction,
    ModelInfo,
    SpendingForecast,
)
from app.schemas.transaction import (
    TransactionCreate,
    TransactionList,
    TransactionOut,
    TransactionUpdate,
)
from app.schemas.user import UserOut, UserUpdate

__all__ = [
    "LoginRequest",
    "RefreshRequest",
    "RegisterRequest",
    "TokenResponse",
    "BudgetCreate",
    "BudgetOut",
    "BudgetUpdate",
    "ChatRequest",
    "ChatResponse",
    "Message",
    "CategoryBreakdown",
    "DashboardSummary",
    "MonthlyTrend",
    "InsightOut",
    "CategoryPrediction",
    "ModelInfo",
    "SpendingForecast",
    "TransactionCreate",
    "TransactionList",
    "TransactionOut",
    "TransactionUpdate",
    "UserOut",
    "UserUpdate",
]
