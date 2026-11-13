from datetime import date

from app.services.analytics import shift_month
from tests.conftest import make_transaction


def _date_in(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}-10"


def test_dashboard_summary_uses_recorded_transactions(client, register_user):
    user = register_user()
    today = date.today()
    prev_year, prev_month = shift_month(today.year, today.month, -1)

    make_transaction(client, user["headers"], "Salary", 60000, "income", "Other", _date_in(today.year, today.month))
    make_transaction(client, user["headers"], "Rent", 15000, "expense", "Bills", _date_in(today.year, today.month))
    make_transaction(client, user["headers"], "Groceries", 5000, "expense", "Food", _date_in(today.year, today.month))
    make_transaction(
        client, user["headers"], "Previous month food", 2000, "expense", "Food", _date_in(prev_year, prev_month)
    )

    summary = client.get("/api/dashboard/summary", headers=user["headers"]).json()
    assert summary["month"] == today.month
    assert summary["year"] == today.year
    assert summary["total_income"] == 60000
    assert summary["total_expenses"] == 20000
    assert summary["net_savings"] == 40000
    assert summary["savings_rate"] == 66.7
    assert summary["total_balance"] == 38000
    assert summary["transaction_count"] == 3
    assert summary["top_category"] == "Bills"
    assert summary["budget_limit"] == 0
    assert summary["budget_status"] == "none"
    assert summary["currency"] == "INR"


def test_dashboard_includes_budget_utilisation(client, register_user):
    user = register_user()
    today = date.today()
    make_transaction(
        client, user["headers"], "Big expense", 900, "expense", "Shopping", _date_in(today.year, today.month)
    )
    client.post(
        "/api/budgets",
        json={"monthly_limit": 1000, "month": today.month, "year": today.year},
        headers=user["headers"],
    )
    summary = client.get("/api/dashboard/summary", headers=user["headers"]).json()
    assert summary["budget_limit"] == 1000
    assert summary["budget_spent"] == 900
    assert summary["budget_remaining"] == 100
    assert summary["budget_utilization"] == 90.0
    assert summary["budget_status"] == "warning"


def test_monthly_trends_and_category_breakdown(client, register_user):
    user = register_user()
    today = date.today()
    prev_year, prev_month = shift_month(today.year, today.month, -1)

    make_transaction(client, user["headers"], "Salary now", 40000, "income", "Other", _date_in(today.year, today.month))
    make_transaction(client, user["headers"], "Food now", 1000, "expense", "Food", _date_in(today.year, today.month))
    make_transaction(client, user["headers"], "Transport now", 500, "expense", "Transport", _date_in(today.year, today.month))
    make_transaction(client, user["headers"], "Food prior", 700, "expense", "Food", _date_in(prev_year, prev_month))

    trends = client.get("/api/dashboard/monthly-trends?months=6", headers=user["headers"]).json()
    assert len(trends["trends"]) == 6
    assert trends["trends"][-1]["month"] == f"{today.year:04d}-{today.month:02d}"
    assert trends["trends"][-1]["income"] == 40000
    assert trends["trends"][-1]["expenses"] == 1500
    assert trends["trends"][-2]["expenses"] == 700

    breakdown = client.get("/api/dashboard/category-breakdown", headers=user["headers"]).json()
    assert breakdown["total_expenses"] == 1500
    assert breakdown["items"][0]["category"] == "Food"
    assert breakdown["items"][0]["amount"] == 1000
    assert breakdown["items"][0]["percentage"] == 66.7

    bad = client.get("/api/dashboard/monthly-trends?months=100", headers=user["headers"])
    assert bad.status_code == 422
