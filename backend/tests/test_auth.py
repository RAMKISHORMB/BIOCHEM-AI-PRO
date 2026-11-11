from fastapi import status

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"

def test_register_first_user_becomes_admin(client):
    payload = {
        "email": "firstuser@biochem.ai",
        "password": "Password123!",
        "full_name": "Dr. Sarah Adams",
        "role": "CLINICIAN"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "firstuser@biochem.ai"
    assert data["role"] == "ADMIN"  # First registered user becomes system admin

def test_register_subsequent_user_preserves_role(client):
    # Register first user (admin)
    client.post("/api/v1/auth/register", json={
        "email": "admin@biochem.ai",
        "password": "Password123!",
        "full_name": "Admin User",
        "role": "ADMIN"
    })

    # Register second user (technician)
    response = client.post("/api/v1/auth/register", json={
        "email": "tech@biochem.ai",
        "password": "Password123!",
        "full_name": "John Doe, MLT",
        "role": "TECHNICIAN"
    })
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "tech@biochem.ai"
    assert data["role"] == "TECHNICIAN"

def test_duplicate_email_registration_rejected(client):
    payload = {
        "email": "duplicate@biochem.ai",
        "password": "Password123!",
        "full_name": "Initial User",
        "role": "CLINICIAN"
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == status.HTTP_201_CREATED

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in res2.json()["detail"]

def test_login_flow_and_me(client):
    # Register
    client.post("/api/v1/auth/register", json={
        "email": "pathologist@biochem.ai",
        "password": "SecurePassword123!",
        "full_name": "Dr. Marcus Vance",
        "role": "BIOCHEMIST"
    })

    # Login with wrong password
    res_fail = client.post("/api/v1/auth/login", json={
        "email": "pathologist@biochem.ai",
        "password": "WrongPassword!"
    })
    assert res_fail.status_code == status.HTTP_401_UNAUTHORIZED

    # Login with correct password
    res_login = client.post("/api/v1/auth/login", json={
        "email": "pathologist@biochem.ai",
        "password": "SecurePassword123!"
    })
    assert res_login.status_code == status.HTTP_200_OK
    token_data = res_login.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert token_data["user"]["email"] == "pathologist@biochem.ai"

    # Access /auth/me with bearer token
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == status.HTTP_200_OK
    assert res_me.json()["email"] == "pathologist@biochem.ai"

def test_admin_rbac_permission_enforcement(client):
    # Register admin
    res_admin = client.post("/api/v1/auth/register", json={
        "email": "chief@biochem.ai",
        "password": "Password123!",
        "full_name": "Chief Admin",
        "role": "ADMIN"
    })
    login_admin = client.post("/api/v1/auth/login", json={
        "email": "chief@biochem.ai",
        "password": "Password123!"
    }).json()
    admin_token = login_admin["access_token"]

    # Register clinician
    client.post("/api/v1/auth/register", json={
        "email": "clinician@biochem.ai",
        "password": "Password123!",
        "full_name": "Dr. Clinician",
        "role": "CLINICIAN"
    })
    login_clinician = client.post("/api/v1/auth/login", json={
        "email": "clinician@biochem.ai",
        "password": "Password123!"
    }).json()
    clinician_token = login_clinician["access_token"]

    # Clinician attempts to list users (admin-only)
    res_forbidden = client.get(
        "/api/v1/auth/users",
        headers={"Authorization": f"Bearer {clinician_token}"}
    )
    assert res_forbidden.status_code == status.HTTP_403_FORBIDDEN

    # Admin lists users (allowed)
    res_allowed = client.get(
        "/api/v1/auth/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_allowed.status_code == status.HTTP_200_OK
    users_list = res_allowed.json()
    assert len(users_list) == 2
