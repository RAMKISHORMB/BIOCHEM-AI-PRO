import pytest
from datetime import datetime
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.encounter import Encounter
from app.models.lab_test import TestAnalyte
from app.models.lab_result import LabResult
from app.core.security import create_access_token

@pytest.fixture
def auth_headers(db_session):
    user = User(
        email="reports_biochemist@biochem.ai",
        hashed_password="hashed_pw",
        full_name="Report Specialist",
        role=UserRole.BIOCHEMIST.value,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    token = create_access_token(subject=user.email, role=user.role, user_id=user.id)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def setup_report_encounter(db_session):
    patient = Patient(
        mrn="MRN-REP-777",
        full_name="Arthur Dent",
        date_of_birth=datetime(1980, 7, 10).date(),
        biological_sex="MALE"
    )
    db_session.add(patient)
    db_session.commit()

    analyte = TestAnalyte(
        code="GLU",
        name="Glucose",
        category="METABOLIC",
        default_unit="mg/dL"
    )
    db_session.add(analyte)
    db_session.commit()

    encounter = Encounter(
        patient_id=patient.id,
        accession_number="ACC-REP-9001",
        sample_collected_at=datetime.utcnow(),
        sample_received_at=datetime.utcnow(),
        sample_type="SERUM",
        clinical_status="COMPLETED",
        fasting_status="FASTING"
    )
    db_session.add(encounter)
    db_session.commit()

    res = LabResult(
        encounter_id=encounter.id,
        analyte_id=analyte.id,
        value_numeric=105.0,
        unit="mg/dL",
        flag="HIGH",
        reference_range_applied="70.0 - 99.0 mg/dL"
    )
    db_session.add(res)
    db_session.commit()

    return patient, encounter

def test_download_encounter_pdf(client, auth_headers, setup_report_encounter):
    _, encounter = setup_report_encounter
    response = client.get(
        f"/api/v1/reports/encounters/{encounter.id}/pdf",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    # PDF magic bytes
    assert response.content.startswith(b"%PDF")

def test_download_encounter_csv(client, auth_headers, setup_report_encounter):
    _, encounter = setup_report_encounter
    response = client.get(
        f"/api/v1/reports/encounters/{encounter.id}/csv",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    content = response.content.decode("utf-8")
    assert "ACC-REP-9001" in content
    assert "GLU" in content
    assert "105.0" in content

def test_download_patient_history_csv(client, auth_headers, setup_report_encounter):
    patient, _ = setup_report_encounter
    response = client.get(
        f"/api/v1/reports/patients/{patient.id}/csv",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    content = response.content.decode("utf-8")
    assert "Arthur Dent" in content
    assert "MRN-REP-777" in content
