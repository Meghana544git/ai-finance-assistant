def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"]["connected"] is True


def test_api_health_alias(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["machine_learning"]["category_model_available"] is True


def test_docs_available(client):
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200
