from app.models.category_feedback import CategoryFeedback
from tests.conftest import make_transaction


def test_create_list_update_delete_transaction(client, user):
    created = make_transaction(
        client, user["headers"], "Swiggy dinner order", 450.5, "expense", "Food", "2026-11-05"
    )
    assert created["category"] == "Food"
    assert created["category_source"] == "manual"
    assert created["amount"] == 450.5

    listed = client.get("/api/transactions", headers=user["headers"])
    assert listed.status_code == 200
    body = listed.json()
    assert body["total"] == 1
    assert body["total_expenses"] == 450.5
    assert body["items"][0]["title"] == "Swiggy dinner order"

    updated = client.put(
        f"/api/transactions/{created['id']}",
        json={"amount": 500, "notes": "Birthday dinner"},
        headers=user["headers"],
    )
    assert updated.status_code == 200
    assert updated.json()["amount"] == 500
    assert updated.json()["notes"] == "Birthday dinner"

    deleted = client.delete(f"/api/transactions/{created['id']}", headers=user["headers"])
    assert deleted.status_code == 200
    assert client.get(f"/api/transactions/{created['id']}", headers=user["headers"]).status_code == 404


def test_ml_autocategorisation_when_category_omitted(client, user):
    created = make_transaction(
        client, user["headers"], "Uber cab to airport", 380, "expense", None, "2026-11-06"
    )
    assert created["category"] == "Transport"
    assert created["category_source"] == "ml"


def test_ml_correction_records_feedback(client, user, db_session):
    created = make_transaction(
        client, user["headers"], "Flipkart headphones purchase", 1999, "expense", None, "2026-11-07"
    )
    assert created["category_source"] == "ml"
    original = created["category"]

    corrected = client.put(
        f"/api/transactions/{created['id']}",
        json={"category": "Entertainment"},
        headers=user["headers"],
    )
    assert corrected.status_code == 200
    if original != "Entertainment":
        assert corrected.json()["category_source"] == "corrected"
        feedback = (
            db_session.query(CategoryFeedback)
            .filter(CategoryFeedback.transaction_id == created["id"])
            .one_or_none()
        )
        assert feedback is not None
        assert feedback.corrected_category == "Entertainment"


def test_filters_search_sort_and_pagination(client, user):
    make_transaction(client, user["headers"], "Metro recharge", 200, "expense", "Transport", "2026-11-01")
    make_transaction(client, user["headers"], "Monthly salary", 50000, "income", "Other", "2026-11-02")
    make_transaction(client, user["headers"], "Grocery shopping", 1200, "expense", "Food", "2026-11-03")
    make_transaction(client, user["headers"], "Old movie ticket", 300, "expense", "Entertainment", "2026-10-15")

    search = client.get("/api/transactions?search=metro", headers=user["headers"])
    assert search.json()["total"] == 1

    income = client.get("/api/transactions?transaction_type=income", headers=user["headers"])
    assert income.json()["total"] == 1
    assert income.json()["total_income"] == 50000

    category = client.get("/api/transactions?category=Food", headers=user["headers"])
    assert category.json()["total"] == 1

    dated = client.get(
        "/api/transactions?date_from=2026-11-01&date_to=2026-11-30", headers=user["headers"]
    )
    assert dated.json()["total"] == 3

    paged = client.get("/api/transactions?page=1&page_size=2&sort_by=amount&sort_order=desc",
                       headers=user["headers"])
    body = paged.json()
    assert len(body["items"]) == 2
    assert body["pages"] == 2
    assert body["items"][0]["amount"] == 50000

    invalid = client.get("/api/transactions?sort_by=password", headers=user["headers"])
    assert invalid.status_code == 422


def test_user_data_isolation(client, user, second_user):
    mine = make_transaction(
        client, user["headers"], "My private expense", 100, "expense", "Other", "2026-11-08"
    )
    other_list = client.get("/api/transactions", headers=second_user["headers"])
    assert other_list.json()["total"] == 0

    assert (
        client.get(f"/api/transactions/{mine['id']}", headers=second_user["headers"]).status_code
        == 404
    )
    assert (
        client.put(
            f"/api/transactions/{mine['id']}",
            json={"amount": 1},
            headers=second_user["headers"],
        ).status_code
        == 404
    )
    assert (
        client.delete(f"/api/transactions/{mine['id']}", headers=second_user["headers"]).status_code
        == 404
    )


def test_csv_export(client, user):
    make_transaction(client, user["headers"], "Export me", 123.45, "expense", "Other", "2026-11-09")
    response = client.get("/api/transactions/export", headers=user["headers"])
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]
    assert "Export me" in response.text
    assert "123.45" in response.text
    assert "Currency" in response.text
    assert "INR" in response.text


def test_validation_errors(client, user):
    bad_amount = client.post(
        "/api/transactions",
        json={"title": "Zero", "amount": 0, "transaction_type": "expense"},
        headers=user["headers"],
    )
    assert bad_amount.status_code == 422
    bad_category = client.post(
        "/api/transactions",
        json={
            "title": "Bad category",
            "amount": 10,
            "transaction_type": "expense",
            "category": "Crypto",
        },
        headers=user["headers"],
    )
    assert bad_category.status_code == 422
