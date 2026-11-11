import pytest
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.core.security import create_access_token

@pytest.fixture
def admin_headers(db_session):
    admin = User(
        email="compliance_admin@biochem.ai",
        hashed_password="hashed_pw",
        full_name="Compliance Administrator",
        role=UserRole.ADMIN.value,
        is_active=True
    )
    db_session.add(admin)
    db_session.commit()
    token = create_access_token(subject=admin.email, role=admin.role, user_id=admin.id)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def technician_headers(db_session):
    tech = User(
        email="tech_user@biochem.ai",
        hashed_password="hashed_pw",
        full_name="Lab Tech",
        role=UserRole.TECHNICIAN.value,
        is_active=True
    )
    db_session.add(tech)
    db_session.commit()
    token = create_access_token(subject=tech.email, role=tech.role, user_id=tech.id)
    return {"Authorization": f"Bearer {token}"}

def test_audit_logs_rbac_and_query(client, admin_headers, technician_headers, db_session):
    # Seed an audit log
    log = AuditLog(
        user_email="compliance_admin@biochem.ai",
        action="TEST_ACTION",
        entity_name="SECURITY_TEST",
        entity_id="test-123",
        details_json='{"status": "verified"}'
    )
    db_session.add(log)
    db_session.commit()

    # Technician should be forbidden (403)
    tech_resp = client.get("/api/v1/audit/logs", headers=technician_headers)
    assert tech_resp.status_code == 403

    # Admin should succeed
    admin_resp = client.get("/api/v1/audit/logs?action=TEST_ACTION", headers=admin_headers)
    assert admin_resp.status_code == 200
    data = admin_resp.json()
    assert data["total"] >= 1
    found = any(item["action"] == "TEST_ACTION" for item in data["items"])
    assert found is True

def test_get_system_settings(client, admin_headers):
    response = client.get("/api/v1/settings/system", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "project_name" in data
    assert "version" in data
    assert "ollama_default_model" in data
    assert "database_type" in data

def test_update_system_settings(client, admin_headers, db_session):
    payload = {
        "ollama_base_url": "http://127.0.0.1:11434",
        "ollama_default_model": "llama3.1"
    }
    response = client.patch("/api/v1/settings/system", json=payload, headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["updated"]["ollama_default_model"] == "llama3.1"

    # Verify audit event was logged
    audit_record = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "UPDATE_SYSTEM_SETTINGS")
        .first()
    )
    assert audit_record is not None
    assert audit_record.user_email == "compliance_admin@biochem.ai"
