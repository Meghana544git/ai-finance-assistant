from datetime import date

from tests.conftest import make_transaction


def test_insights_empty_account(client, register_user):
    user = register_user()
    response = client.get("/api/insights", headers=user["headers"])
    assert response.status_code == 200
    body = response.json()
    assert body["data_points"] == 0
    assert body["insights"][0]["insight_type"] == "getting_started"
    assert body["insights"][0]["source"] == "rule_based"
    assert "not professional financial advice" in body["disclaimer"]


def test_insights_from_actual_data(client, register_user):
    user = register_user()
    today = date.today()
    day = today.isoformat()
    make_transaction(client, user["headers"], "Salary", 50000, "income", "Other", day)
    make_transaction(client, user["headers"], "Food order", 4000, "expense", "Food", day)
    make_transaction(client, user["headers"], "Cab ride", 1000, "expense", "Transport", day)
    client.post(
        "/api/budgets",
        json={"category": "Food", "monthly_limit": 4000, "month": today.month, "year": today.year},
        headers=user["headers"],
    )

    body = client.get("/api/insights", headers=user["headers"]).json()
    types = {insight["insight_type"] for insight in body["insights"]}
    assert "top_category" in types
    assert "budget_exceeded" in types
    assert "savings_rate" in types
    assert "suggestion" in types
    top = next(item for item in body["insights"] if item["insight_type"] == "top_category")
    assert "Food" in top["title"]
    assert "₹4,000.00" in top["description"]
    assert all(item["source"] == "rule_based" for item in body["insights"])


def test_chat_answers_use_real_data(client, register_user):
    user = register_user()
    today = date.today().isoformat()
    make_transaction(client, user["headers"], "Salary", 30000, "income", "Other", today)
    make_transaction(client, user["headers"], "Pizza dinner", 800, "expense", "Food", today)
    make_transaction(client, user["headers"], "Bus pass", 200, "expense", "Transport", today)
    client.post(
        "/api/budgets",
        json={"monthly_limit": 1000, "month": date.today().month, "year": date.today().year},
        headers=user["headers"],
    )

    spending = client.post(
        "/api/chat/message", json={"message": "How much did I spend this month?"}, headers=user["headers"]
    ).json()
    assert spending["intent"] == "monthly_spending"
    assert "1,000.00" in spending["reply"]
    assert spending["source"] == "rule_based"

    top = client.post(
        "/api/chat/message",
        json={"message": "Which category has the highest expenses?"},
        headers=user["headers"],
    ).json()
    assert top["intent"] == "top_category"
    assert "Food" in top["reply"]

    budget = client.post(
        "/api/chat/message", json={"message": "How much budget remains?"}, headers=user["headers"]
    ).json()
    assert budget["intent"] == "budget_status"
    assert "remaining" in budget["reply"].lower()

    recent = client.post(
        "/api/chat/message", json={"message": "What were my recent expenses?"}, headers=user["headers"]
    ).json()
    assert recent["intent"] == "recent_transactions"
    assert "Pizza dinner" in recent["reply"]

    usage = client.post(
        "/api/chat/message", json={"message": "How can I use this application?"}, headers=user["headers"]
    ).json()
    assert usage["intent"] == "usage"
    assert "Transactions" in usage["reply"]

    food = client.post(
        "/api/chat/message", json={"message": "How much did I spend on food?"}, headers=user["headers"]
    ).json()
    assert food["intent"] == "category_spending"
    assert food["data"]["category"] == "Food"
    assert "800.00" in food["reply"]


def test_chat_does_not_fabricate_without_data(client, register_user):
    user = register_user()
    reply = client.post(
        "/api/chat/message", json={"message": "How much did I spend this month?"}, headers=user["headers"]
    ).json()
    assert reply["intent"] == "monthly_spending"
    assert "no transactions" in reply["reply"].lower()
    assert reply["data"]["expenses"] == 0

    fallback = client.post(
        "/api/chat/message", json={"message": "Should I buy a motorcycle?"}, headers=user["headers"]
    ).json()
    assert fallback["intent"] == "fallback"
    assert "saved records" in fallback["reply"]
