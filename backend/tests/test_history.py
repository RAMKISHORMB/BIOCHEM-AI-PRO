import pytest
from datetime import datetime, timedelta
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.encounter import Encounter
from app.models.lab_test import TestAnalyte, ReferenceRange
from app.models.lab_result import LabResult
from app.core.security import create_access_token

@pytest.fixture
def auth_headers(db_session):
    user = User(
        email="history_doctor@biochem.ai",
        hashed_password="hashed_pw",
        full_name="History Clinician",
        role=UserRole.CLINICIAN.value,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    token = create_access_token(subject=user.email, role=user.role, user_id=user.id)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def setup_history_patient_and_encounters(db_session):
    # Create patient
    patient = Patient(
        mrn="MRN-HIST-001",
        full_name="Eleanor Vance",
        date_of_birth=datetime(1975, 4, 12).date(),
        biological_sex="FEMALE"
    )
    db_session.add(patient)
    db_session.commit()

    # Create analyte: Potassium
    potassium = TestAnalyte(
        code="K",
        name="Potassium",
        category="ELECTROLYTES",
        default_unit="mmol/L"
    )
    db_session.add(potassium)
    db_session.commit()

    # Reference range
    ref = ReferenceRange(
        analyte_id=potassium.id,
        biological_sex="ALL",
        min_age_years=0,
        max_age_years=120,
        lower_limit=3.5,
        upper_limit=5.1,
        critical_low=2.8,
        critical_high=6.2,
        unit="mmol/L",
        source_authority="Tietz Fundamentals of Clinical Chemistry"
    )
    db_session.add(ref)
    db_session.commit()

    # Encounter 1 (3 days ago, K = 4.0 mmol/L)
    enc1 = Encounter(
        patient_id=patient.id,
        accession_number="ACC-HIST-101",
        sample_collected_at=datetime.utcnow() - timedelta(days=3),
        sample_received_at=datetime.utcnow() - timedelta(days=3),
        sample_type="SERUM",
        clinical_status="COMPLETED"
    )
    db_session.add(enc1)
    db_session.commit()

    res1 = LabResult(
        encounter_id=enc1.id,
        analyte_id=potassium.id,
        value_numeric=4.0,
        unit="mmol/L",
        flag="NORMAL",
        reference_range_applied="3.5 - 5.1 mmol/L"
    )
    db_session.add(res1)
    db_session.commit()

    # Encounter 2 (Today, K = 5.2 mmol/L -> 30% increase, surge alert!)
    enc2 = Encounter(
        patient_id=patient.id,
        accession_number="ACC-HIST-102",
        sample_collected_at=datetime.utcnow(),
        sample_received_at=datetime.utcnow(),
        sample_type="SERUM",
        clinical_status="COMPLETED"
    )
    db_session.add(enc2)
    db_session.commit()

    res2 = LabResult(
        encounter_id=enc2.id,
        analyte_id=potassium.id,
        value_numeric=5.2,
        unit="mmol/L",
        flag="HIGH",
        reference_range_applied="3.5 - 5.1 mmol/L"
    )
    db_session.add(res2)
    db_session.commit()

    return patient, potassium

def test_patient_timeline_and_delta_checks(client, auth_headers, setup_history_patient_and_encounters):
    patient, _ = setup_history_patient_and_encounters
    response = client.get(f"/api/v1/history/patients/{patient.id}/timeline", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["patient"]["mrn"] == "MRN-HIST-001"
    timeline = data["timeline"]
    assert len(timeline) == 2

    # Second encounter should have delta check computed against first encounter
    second_enc = timeline[1]
    assert len(second_enc["delta_alerts"]) >= 1
    k_alert = second_enc["delta_alerts"][0]
    assert k_alert["analyte_code"] == "K"
    assert k_alert["delta_flag"] == "DELTA_SURGE"
    assert k_alert["percent_change"] == 30.0

def test_patient_analyte_trends(client, auth_headers, setup_history_patient_and_encounters):
    patient, potassium = setup_history_patient_and_encounters
    response = client.get(
        f"/api/v1/history/patients/{patient.id}/trends?analyte_code=K",
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["analyte_code"] == "K"
    assert len(data["points"]) == 2
    assert data["reference_range"]["lower_limit"] == 3.5
    assert data["reference_range"]["upper_limit"] == 5.1
