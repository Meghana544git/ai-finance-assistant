from datetime import date

from app.services.analytics import shift_month
from tests.conftest import make_transaction


def test_predict_category_single(client):
    response = client.post(
        "/api/ml/predict-category",
        json={"title": "Uber cab to airport", "description": "Late night ride"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["category"] in {
        "Food",
        "Transport",
        "Shopping",
        "Bills",
        "Entertainment",
        "Health",
        "Education",
        "Other",
    }
    assert 0 <= body["confidence"] <= 1
    assert abs(sum(body["probabilities"].values()) - 1) < 0.01
    assert body["source"] == "ml"
    assert body["model_name"]


def test_predict_categories_batch(client):
    response = client.post(
        "/api/ml/predict-categories",
        json={
            "items": [
                {"title": "Electricity bill payment"},
                {"title": "Netflix subscription"},
                {"title": "Pharmacy medicines"},
            ]
        },
    )
    assert response.status_code == 200
    assert len(response.json()["predictions"]) == 3
    assert client.post("/api/ml/predict-categories", json={"items": []}).status_code == 422


def test_model_info_and_evaluation(client):
    info = client.get("/api/ml/model-info")
    assert info.status_code == 200
    body = info.json()
    assert body["artifact_available"] is True
    assert 0 <= body["accuracy"] <= 1
    assert len(body["categories"]) == 8

    evaluation = client.get("/api/ml/evaluation")
    assert evaluation.status_code == 200
    metrics = evaluation.json()
    assert metrics["available"] is True
    assert 0 <= metrics["accuracy"] <= 1
    assert 0 <= metrics["macro_f1"] <= 1
    assert len(metrics["confusion_matrix"]) == len(metrics["labels"])
    assert sum(sum(row) for row in metrics["confusion_matrix"]) == metrics["test_size"]


def test_forecast_insufficient_data(client, register_user):
    user = register_user()
    response = client.post("/api/ml/predict-spending", headers=user["headers"])
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "insufficient_data"
    assert body["predicted_amount"] is None
    assert body["months_used"] == 0
    assert body["min_months_required"] == 4
    assert "at least 4 months" in body["message"].lower()


def test_forecast_with_six_months_and_user_isolation(client, register_user):
    user = register_user()
    today = date.today()
    for index in range(6):
        year, month = shift_month(today.year, today.month, -(5 - index))
        make_transaction(
            client,
            user["headers"],
            f"Monthly expense {index}",
            1000 + index * 200,
            "expense",
            "Food",
            f"{year:04d}-{month:02d}-05",
        )

    other = register_user()
    response = client.post("/api/ml/predict-spending", headers=user["headers"])
    body = response.json()
    assert response.status_code == 200
    assert body["status"] == "ok"
    assert body["months_used"] == 6
    assert body["predicted_amount"] > 0
    assert body["lower_bound"] <= body["predicted_amount"] <= body["upper_bound"]
    assert body["mae"] is not None and body["mae"] >= 0
    assert body["rmse"] is not None and body["rmse"] >= 0
    assert body["prediction_month"]

    # A different user with no history must not receive this forecast.
    other_forecast = client.post("/api/ml/predict-spending", headers=other["headers"]).json()
    assert other_forecast["status"] == "insufficient_data"


def test_forecast_requires_auth(client):
    assert client.post("/api/ml/predict-spending").status_code == 401
