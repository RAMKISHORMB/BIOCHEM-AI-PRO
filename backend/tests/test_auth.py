from fastapi import status

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"

def test_register_first_user_creates_user_role_not_admin(client):
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
    assert data["role"] == "USER"  # First registered user receives USER role, not ADMIN

def test_self_registration_always_creates_user_role(client):
    # Public self-registration even when requesting elevated roles must always create USER
    response = client.post("/api/v1/auth/register", json={
        "email": "tech@biochem.ai",
        "password": "Password123!",
        "full_name": "John Doe, MLT",
        "role": "ADMIN"  # Attempt to self-register as ADMIN
    })
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "tech@biochem.ai"
    assert data["role"] == "USER"  # Strictly enforced USER role

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
    # Log in as initial provisioned administrator
    login_admin = client.post("/api/v1/auth/login", json={
        "email": "admin@biochem.ai",
        "password": "Password123!"
    })
    assert login_admin.status_code == status.HTTP_200_OK
    admin_token = login_admin.json()["access_token"]

    # Admin provisions a specialized role user via /auth/users
    res_tech = client.post(
        "/api/v1/auth/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": "staff.tech@biochem.ai",
            "password": "Password123!",
            "full_name": "Senior Technician",
            "role": "TECHNICIAN"
        }
    )
    assert res_tech.status_code == status.HTTP_201_CREATED
    assert res_tech.json()["role"] == "TECHNICIAN"

    # Self-register a normal user via public /auth/register
    client.post("/api/v1/auth/register", json={
        "email": "standard.user@biochem.ai",
        "password": "Password123!",
        "full_name": "Standard User",
        "role": "CLINICIAN"  # Requests role but must get USER
    })
    login_user = client.post("/api/v1/auth/login", json={
        "email": "standard.user@biochem.ai",
        "password": "Password123!"
    }).json()
    assert login_user["user"]["role"] == "USER"
    user_token = login_user["access_token"]

    # Standard user attempts to list users (admin-only) -> Forbidden
    res_forbidden = client.get(
        "/api/v1/auth/users",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert res_forbidden.status_code == status.HTTP_403_FORBIDDEN

    # Admin lists users (allowed)
    res_allowed = client.get(
        "/api/v1/auth/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_allowed.status_code == status.HTTP_200_OK
    users_list = res_allowed.json()
    assert len(users_list) >= 3

def test_initial_admin_fails_safely_when_credentials_missing(db_session):
    from app.main import seed_initial_data
    from app.core.config import settings
    from app.models.user import User, UserRole

    # Clean existing users
    db_session.query(User).delete()
    db_session.commit()

    # Clear admin credentials
    old_email = settings.ADMIN_EMAIL
    old_pass = settings.ADMIN_PASSWORD
    settings.ADMIN_EMAIL = None
    settings.ADMIN_PASSWORD = None

    try:
        seed_initial_data(db_session)
        # Verify 0 admin accounts created
        admin_count = db_session.query(User).filter(User.role == UserRole.ADMIN.value).count()
        assert admin_count == 0
    finally:
        settings.ADMIN_EMAIL = old_email
        settings.ADMIN_PASSWORD = old_pass

def test_production_secret_key_rejection():
    import os
    import pytest
    from app.core.config import Settings

    # Attempting to load Settings in production mode without explicit SECRET_KEY must raise ValueError
    os.environ["ENVIRONMENT"] = "production"
    os.environ.pop("SECRET_KEY", None)

    with pytest.raises(ValueError, match="CRITICAL SECURITY CONFIGURATION ERROR"):
        Settings()

    # Reset test environment
    os.environ["ENVIRONMENT"] = "test"
    os.environ["SECRET_KEY"] = "biochem-ai-test-key-development-testing-value"
