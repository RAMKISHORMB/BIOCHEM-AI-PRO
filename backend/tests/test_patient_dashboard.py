from fastapi import status
from app.services.reference_data_seeder import seed_standard_biochemistry_library

def get_auth_token(client):
    client.post("/api/v1/auth/register", json={
        "email": "doctor@biochem.ai",
        "password": "Password123!",
        "full_name": "Dr. House",
        "role": "ADMIN"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "doctor@biochem.ai",
        "password": "Password123!"
    })
    return res.json()["access_token"]

def test_patient_registration_and_age(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "mrn": "MRN-2026-00101",
        "full_name": "Eleanor Vance",
        "date_of_birth": "1980-05-15",
        "biological_sex": "FEMALE",
        "blood_group": "A+",
        "phone": "+1-555-0199",
        "medical_history": "Hypertension, Type 2 Diabetes"
    }

    response = client.post("/api/v1/patients", json=payload, headers=headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["mrn"] == "MRN-2026-00101"
    assert data["full_name"] == "Eleanor Vance"
    assert data["biological_sex"] == "FEMALE"
    assert data["age_years"] > 40  # born in 1980

    # Retrieve patient list
    list_res = client.get("/api/v1/patients", headers=headers)
    assert list_res.status_code == status.HTTP_200_OK
    assert list_res.json()["total"] == 1

def test_patient_duplicate_mrn_rejected(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "mrn": "MRN-2026-DUPE",
        "full_name": "Patient One",
        "date_of_birth": "1990-01-01",
        "biological_sex": "MALE"
    }
    res1 = client.post("/api/v1/patients", json=payload, headers=headers)
    assert res1.status_code == status.HTTP_201_CREATED

    res2 = client.post("/api/v1/patients", json=payload, headers=headers)
    assert res2.status_code == status.HTTP_400_BAD_REQUEST
    assert "already registered" in res2.json()["detail"]

def test_reference_ranges_seeded(client, db_session):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    seed_standard_biochemistry_library(db_session)

    res = client.get("/api/v1/reference-ranges/tests", headers=headers)
    assert res.status_code == status.HTTP_200_OK
    tests = res.json()
    assert len(tests) >= 15

    # Verify glucose test analyte
    glu = next((t for t in tests if t["code"] == "GLU"), None)
    assert glu is not None
    assert glu["default_unit"] == "mg/dL"
    assert len(glu["reference_ranges"]) >= 1
    assert glu["reference_ranges"][0]["lower_limit"] == 70.0
    assert glu["reference_ranges"][0]["upper_limit"] == 99.0
    assert "Tietz" in glu["reference_ranges"][0]["source_authority"]

def test_dashboard_metrics(client, db_session):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Register patient
    client.post("/api/v1/patients", json={
        "mrn": "MRN-DASH-1",
        "full_name": "Test Patient",
        "date_of_birth": "1975-03-20",
        "biological_sex": "MALE"
    }, headers=headers)

    res = client.get("/api/v1/dashboard/metrics", headers=headers)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["summary"]["total_patients"] == 1
    assert data["summary"]["total_encounters"] == 0
    assert "system_status" in data
    assert "volume_timeline" in data
