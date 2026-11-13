from datetime import date


def test_register_login_and_me(client):
    email = "alice@example.com"
    response = client.post(
        "/api/auth/register",
        json={"full_name": "Alice Sharma", "email": email, "password": "Secret123"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == email
    assert data["user"]["preferred_currency"] == "INR"
    assert "access_token" in data and "refresh_token" in data

    login = client.post("/api/auth/login", json={"email": email, "password": "Secret123"})
    assert login.status_code == 200

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"})
    assert me.status_code == 200
    assert me.json()["full_name"] == "Alice Sharma"

    refreshed = client.post("/api/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]

    logout = client.post(
        "/api/auth/logout", headers={"Authorization": f"Bearer {data['access_token']}"}
    )
    assert logout.status_code == 200


def test_duplicate_email_rejected(client):
    body = {"full_name": "Bob", "email": "bob@example.com", "password": "Secret123"}
    assert client.post("/api/auth/register", json=body).status_code == 201
    duplicate = client.post("/api/auth/register", json=body)
    assert duplicate.status_code == 409
    assert "already exists" in duplicate.json()["detail"]


def test_weak_password_and_invalid_email_rejected(client):
    weak = client.post(
        "/api/auth/register",
        json={"full_name": "Weak User", "email": "weak@example.com", "password": "password"},
    )
    assert weak.status_code == 422
    invalid = client.post(
        "/api/auth/register",
        json={"full_name": "Bad Email", "email": "not-an-email", "password": "Secret123"},
    )
    assert invalid.status_code == 422


def test_wrong_password_rejected(client, user):
    response = client.post(
        "/api/auth/login", json={"email": user["email"], "password": "WrongPassword1"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password."


def test_protected_routes_require_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/dashboard/summary").status_code == 401
    assert client.get("/api/transactions").status_code == 401
    invalid = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-token"})
    assert invalid.status_code == 401


def test_profile_update_and_currency_validation(client, user):
    response = client.put(
        "/api/auth/me",
        json={"full_name": "Updated Name", "preferred_currency": "USD"},
        headers=user["headers"],
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Updated Name"
    assert response.json()["preferred_currency"] == "USD"

    invalid = client.put(
        "/api/auth/me", json={"preferred_currency": "XYZ"}, headers=user["headers"]
    )
    assert invalid.status_code == 422


def test_account_deletion_removes_access(client):
    email = f"delete_{date.today().isoformat()}@example.com"
    registered = client.post(
        "/api/auth/register",
        json={"full_name": "Delete Me", "email": email, "password": "Secret123"},
    )
    assert registered.status_code == 201
    headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}
    assert client.delete("/api/auth/me", headers=headers).status_code == 200
    assert client.get("/api/auth/me", headers=headers).status_code == 401
