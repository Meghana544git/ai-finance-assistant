"""API router aggregation."""

from fastapi import APIRouter

from app.api.routes import auth, budgets, chat, dashboard, insights, ml, system, transactions

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(transactions.router)
api_router.include_router(budgets.router)
api_router.include_router(dashboard.router)
api_router.include_router(insights.router)
api_router.include_router(ml.router)
api_router.include_router(chat.router)
api_router.include_router(system.router)
