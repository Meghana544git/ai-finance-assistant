from datetime import date

from tests.conftest import make_transaction


def _budget_payload(**overrides):
    payload = {"monthly_limit": 10000, "month": date.today().month, "year": date.today().year}
    payload.update(overrides)
    return payload


def test_budget_crud_and_spent_calculation(client, user):
    make_transaction(client, user["headers"], "Grocery run", 1200, "expense", "Food", date.today().isoformat())
    make_transaction(client, user["headers"], "Metro card", 300, "expense", "Transport", date.today().isoformat())

    created = client.post("/api/budgets", json=_budget_payload(), headers=user["headers"])
    assert created.status_code == 201
    body = created.json()
    assert body["category"] is None
    assert body["spent"] == 1500
    assert body["remaining"] == 8500
    assert body["utilization"] == 15.0
    assert body["status"] == "healthy"

    listed = client.get(
        f"/api/budgets?month={date.today().month}&year={date.today().year}",
        headers=user["headers"],
    )
    assert listed.status_code == 200
    assert listed.json()["items"][0]["id"] == body["id"]

    updated = client.put(
        f"/api/budgets/{body['id']}",
        json={"monthly_limit": 1600},
        headers=user["headers"],
    )
    assert updated.status_code == 200
    assert updated.json()["utilization"] == 93.8
    assert updated.json()["status"] == "warning"

    deleted = client.delete(f"/api/budgets/{body['id']}", headers=user["headers"])
    assert deleted.status_code == 200
    assert client.get("/api/budgets", headers=user["headers"]).json()["items"] == []


def test_category_budget_thresholds(client, user):
    created = client.post(
        "/api/budgets", json=_budget_payload(category="Food", monthly_limit=1000), headers=user["headers"]
    )
    assert created.status_code == 201
    budget_id = created.json()["id"]

    make_transaction(client, user["headers"], "Food expense", 850, "expense", "Food", date.today().isoformat())
    warning = client.get(
        f"/api/budgets?month={date.today().month}&year={date.today().year}",
        headers=user["headers"],
    ).json()["items"][0]
    assert warning["utilization"] == 85.0
    assert warning["status"] == "warning"

    make_transaction(client, user["headers"], "More food", 200, "expense", "Food", date.today().isoformat())
    exceeded = client.get(
        f"/api/budgets?month={date.today().month}&year={date.today().year}",
        headers=user["headers"],
    ).json()["items"][0]
    assert exceeded["status"] == "exceeded"
    assert exceeded["remaining"] < 0

    assert client.delete(f"/api/budgets/{budget_id}", headers=user["headers"]).status_code == 200


def test_budget_list_totals_avoid_double_counting(client, user):
    make_transaction(client, user["headers"], "Lunch", 800, "expense", "Food", date.today().isoformat())
    make_transaction(client, user["headers"], "Bus", 200, "expense", "Transport", date.today().isoformat())

    assert client.post(
        "/api/budgets", json=_budget_payload(monthly_limit=5000), headers=user["headers"]
    ).status_code == 201
    assert client.post(
        "/api/budgets", json=_budget_payload(category="Food", monthly_limit=1000), headers=user["headers"]
    ).status_code == 201

    body = client.get(
        f"/api/budgets?month={date.today().month}&year={date.today().year}",
        headers=user["headers"],
    ).json()
    # The overall limit wins; the category budget is a breakdown, not extra money.
    assert body["total_limit"] == 5000
    assert body["total_spent"] == 1000
    assert body["overall_utilization"] == 20.0


def test_duplicate_budget_rejected(client, user):
    payload = _budget_payload(category="Shopping", monthly_limit=5000)
    assert client.post("/api/budgets", json=payload, headers=user["headers"]).status_code == 201
    duplicate = client.post("/api/budgets", json=payload, headers=user["headers"])
    assert duplicate.status_code == 409
    assert "already exists" in duplicate.json()["detail"]


def test_budget_validation_and_month_zero(client, user):
    assert client.post("/api/budgets", json=_budget_payload(monthly_limit=0), headers=user["headers"]).status_code == 422
    assert client.post("/api/budgets", json=_budget_payload(month=13), headers=user["headers"]).status_code == 422
    assert client.get("/api/budgets?month=11", headers=user["headers"]).status_code == 422


def test_budget_isolation(client, user, second_user):
    created = client.post("/api/budgets", json=_budget_payload(), headers=user["headers"])
    budget_id = created.json()["id"]
    assert client.get("/api/budgets", headers=second_user["headers"]).json()["items"] == []
    assert client.put(
        f"/api/budgets/{budget_id}", json={"monthly_limit": 5}, headers=second_user["headers"]
    ).status_code == 404
    assert client.delete(f"/api/budgets/{budget_id}", headers=second_user["headers"]).status_code == 404
