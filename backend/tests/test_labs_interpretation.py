from fastapi import status
from app.services.reference_data_seeder import seed_standard_biochemistry_library

def get_auth_token(client):
    client.post("/api/v1/auth/register", json={
        "email": "chief.pathologist@biochem.ai",
        "password": "Password123!",
        "full_name": "Chief Pathologist",
        "role": "ADMIN"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "chief.pathologist@biochem.ai",
        "password": "Password123!"
    })
    return res.json()["access_token"]

def test_manual_lab_entry_and_interpretation(client, db_session):
    seed_standard_biochemistry_library(db_session)
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Register a test patient
    pat_res = client.post("/api/v1/patients", json={
        "mrn": "MRN-LAB-01",
        "full_name": "Jonathan Miller",
        "date_of_birth": "1970-01-01",
        "biological_sex": "MALE"
    }, headers=headers)
    patient = pat_res.json()

    # 2. Get analytes
    analytes_res = client.get("/api/v1/reference-ranges/tests", headers=headers)
    analytes = {a["code"]: a for a in analytes_res.json()}

    # 3. Enter BMP panel
    entry_payload = {
        "patient_id": patient["id"],
        "accession_number": "ACC-2026-9901",
        "sample_type": "SERUM",
        "fasting_status": "FASTING",
        "results": [
            {"analyte_id": analytes["NA"]["id"], "analyte_code": "NA", "value_numeric": 140.0, "unit": "mmol/L"},
            {"analyte_id": analytes["K"]["id"], "analyte_code": "K", "value_numeric": 4.2, "unit": "mmol/L"},
            {"analyte_id": analytes["CL"]["id"], "analyte_code": "CL", "value_numeric": 102.0, "unit": "mmol/L"},
            {"analyte_id": analytes["HCO3"]["id"], "analyte_code": "HCO3", "value_numeric": 24.0, "unit": "mmol/L"},
            {"analyte_id": analytes["GLU"]["id"], "analyte_code": "GLU", "value_numeric": 90.0, "unit": "mg/dL"},
            {"analyte_id": analytes["BUN"]["id"], "analyte_code": "BUN", "value_numeric": 14.0, "unit": "mg/dL"},
            {"analyte_id": analytes["CREAT"]["id"], "analyte_code": "CREAT", "value_numeric": 1.0, "unit": "mg/dL"},
        ]
    }

    enc_res = client.post("/api/v1/labs/encounters", json=entry_payload, headers=headers)
    assert enc_res.status_code == status.HTTP_201_CREATED
    data = enc_res.json()
    assert data["accession_number"] == "ACC-2026-9901"
    assert len(data["results"]) == 7

    # Verify automated interpretation results
    interp = data["interpretation"]
    assert interp is not None
    indices = interp["calculated_indices"]

    # Anion Gap = 140 - (102 + 24) = 14.0
    assert indices["anion_gap"]["value"] == 14.0
    assert indices["anion_gap"]["status"] == "NORMAL"

    # BUN/Creatinine Ratio = 14 / 1.0 = 14.0
    assert indices["bun_creatinine_ratio"]["value"] == 14.0

    # CKD-EPI eGFR
    assert "egfr_ckd_epi_2021" in indices
    assert indices["egfr_ckd_epi_2021"]["value"] > 60.0

def test_critical_panic_flag_and_high_anion_gap(client, db_session):
    seed_standard_biochemistry_library(db_session)
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    pat_res = client.post("/api/v1/patients", json={
        "mrn": "MRN-CRIT-01",
        "full_name": "Emergency Patient",
        "date_of_birth": "1965-06-15",
        "biological_sex": "FEMALE"
    }, headers=headers)
    patient = pat_res.json()

    analytes_res = client.get("/api/v1/reference-ranges/tests", headers=headers)
    analytes = {a["code"]: a for a in analytes_res.json()}

    # Severe DKA / Metabolic Emergency Profile
    entry_payload = {
        "patient_id": patient["id"],
        "accession_number": "ACC-CRIT-001",
        "sample_type": "SERUM",
        "fasting_status": "RANDOM",
        "results": [
            {"analyte_id": analytes["NA"]["id"], "analyte_code": "NA", "value_numeric": 132.0, "unit": "mmol/L"},
            {"analyte_id": analytes["K"]["id"], "analyte_code": "K", "value_numeric": 6.8, "unit": "mmol/L"},  # Critical High (>6.2)
            {"analyte_id": analytes["CL"]["id"], "analyte_code": "CL", "value_numeric": 92.0, "unit": "mmol/L"},
            {"analyte_id": analytes["HCO3"]["id"], "analyte_code": "HCO3", "value_numeric": 8.0, "unit": "mmol/L"},  # Severe acidosis
            {"analyte_id": analytes["GLU"]["id"], "analyte_code": "GLU", "value_numeric": 520.0, "unit": "mg/dL"}, # Critical High (>400)
        ]
    }

    enc_res = client.post("/api/v1/labs/encounters", json=entry_payload, headers=headers)
    assert enc_res.status_code == status.HTTP_201_CREATED
    data = enc_res.json()

    # K should be flagged CRITICAL_HIGH
    k_res = next(r for r in data["results"] if r["analyte_code"] == "K")
    assert k_res["flag"] == "CRITICAL_HIGH"

    # GLU should be flagged CRITICAL_HIGH
    glu_res = next(r for r in data["results"] if r["analyte_code"] == "GLU")
    assert glu_res["flag"] == "CRITICAL_HIGH"

    # Anion Gap = 132 - (92 + 8) = 32.0 (Severe HAGMA)
    interp = data["interpretation"]
    indices = interp["calculated_indices"]
    assert indices["anion_gap"]["value"] == 32.0
    assert indices["anion_gap"]["status"] == "ELEVATED"

    # Check clinical flags contain CRITICAL alerts
    flags = interp["clinical_flags"]
    assert any("HYPERKALEMIA" in f["title"] for f in flags)

def test_clinician_review_flow(client, db_session):
    seed_standard_biochemistry_library(db_session)
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    pat_res = client.post("/api/v1/patients", json={
        "mrn": "MRN-REV-01",
        "full_name": "Review Patient",
        "date_of_birth": "1995-10-10",
        "biological_sex": "MALE"
    }, headers=headers)
    patient = pat_res.json()

    analytes_res = client.get("/api/v1/reference-ranges/tests", headers=headers)
    analytes = {a["code"]: a for a in analytes_res.json()}

    enc = client.post("/api/v1/labs/encounters", json={
        "patient_id": patient["id"],
        "results": [
            {"analyte_id": analytes["GLU"]["id"], "analyte_code": "GLU", "value_numeric": 85.0, "unit": "mg/dL"}
        ]
    }, headers=headers).json()

    # Sign off review
    rev_res = client.post(
        f"/api/v1/interpretations/encounters/{enc['id']}/review",
        json={"reviewer_notes": "Results reviewed and validated. Patient discharged."},
        headers=headers
    )
    assert rev_res.status_code == status.HTTP_200_OK
    assert rev_res.json()["clinician_reviewed"] is True
