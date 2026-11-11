import pytest
from fastapi.testclient import TestClient
from datetime import datetime
import json

from app.main import app
from app.core.database import SessionLocal
from app.models.patient import Patient
from app.models.encounter import Encounter
from app.models.lab_test import TestAnalyte
from app.models.lab_result import LabResult
from app.models.biochemical_calc import BiochemicalCalculationLog
from app.services.biochemical_calculation_service import (
    calculate_de_ritis_ratio,
    calculate_albumin_corrected_calcium,
    calculate_anion_gap,
    calculate_albumin_corrected_anion_gap,
    calculate_serum_osmolality,
    calculate_osmolal_gap,
    calculate_bun_creatinine_ratio,
    calculate_egfr_ckd_epi_2021,
    calculate_fractional_excretion_of_sodium,
    calculate_transferrin_saturation,
    calculate_lipid_indices,
    calculate_ag_protein_ratio,
    analyze_acid_base,
)


@pytest.fixture
def auth_headers(client):
    """Authenticate and get bearer token."""
    # Ensure test user registered
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "testadmin@biochem.ai",
            "password": "Password123!",
            "full_name": "Test Biochemist",
            "role": "ADMIN"
        }
    )
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "testadmin@biochem.ai", "password": "Password123!"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ------------------------------------------------------------------------------
# 1. De Ritis Ratio Tests (Refined Non-Deterministic & Etiology Safeguards)
# ------------------------------------------------------------------------------

def test_de_ritis_ratio_above_two():
    """Verify De Ritis ratio > 2 uses refined clinical non-diagnostic wording."""
    res = calculate_de_ritis_ratio(ast=240.0, alt=95.0)
    assert res.is_valid is True
    assert res.output_value == pytest.approx(2.53, rel=1e-2)
    assert res.status == "ELEVATED"
    assert res.formula_version == "2024.1"
    assert res.provenance_hash != ""

    expected_exact_text = (
        "Elevated AST/ALT ratio. Ratios above 2 have been reported in certain clinical contexts, "
        "including alcohol-associated liver disease, but this finding is nonspecific and cannot establish etiology. "
        "Interpret alongside absolute aminotransferase activities, clinical history, medication exposure, "
        "hemolysis status and other relevant investigations."
    )
    assert res.interpretation == expected_exact_text
    # Verify no disease diagnosis is assigned based solely on the ratio
    assert "Suggestive of Alcoholic Liver Disease" not in res.interpretation
    assert "Established Cirrhosis" not in res.interpretation


def test_de_ritis_ratio_between_one_and_two():
    """Verify De Ritis ratio between 1 and 2 is non-diagnostic and nonspecific."""
    res = calculate_de_ritis_ratio(ast=75.0, alt=50.0)
    assert res.is_valid is True
    assert res.output_value == 1.50
    assert res.status == "ELEVATED"
    assert "AST/ALT ratio between 1.0 and 2.0" in res.interpretation
    assert "nonspecific and cannot establish etiology" in res.interpretation
    assert "Suggestive of Chronic Viral Hepatitis" not in res.interpretation
    assert "Progressing Fibrosis" not in res.interpretation


def test_de_ritis_ratio_below_one():
    """Verify De Ritis ratio < 1 does NOT imply or establish viral hepatitis or NAFLD."""
    res = calculate_de_ritis_ratio(ast=35.0, alt=70.0)
    assert res.is_valid is True
    assert res.output_value == 0.50
    assert res.status == "LOW"
    assert "AST/ALT ratio below 1.0 (ALT greater than AST)" in res.interpretation
    assert "does not establish a specific diagnosis such as viral hepatitis or NAFLD" in res.interpretation
    assert "Typical of Acute Viral Hepatitis" not in res.interpretation


def test_de_ritis_normal_ratio():
    """Verify normal reference interval ratio (1.0)."""
    res = calculate_de_ritis_ratio(ast=30.0, alt=30.0)
    assert res.is_valid is True
    assert res.output_value == 1.00
    assert res.status == "NORMAL"
    assert "AST/ALT ratio between 1.0 and 2.0" in res.interpretation


def test_de_ritis_zero_denominator_and_invalid():
    # Zero ALT
    res_zero = calculate_de_ritis_ratio(ast=50.0, alt=0.0)
    assert res_zero.is_valid is False
    assert res_zero.status == "ZERO_DENOMINATOR"

    # Negative activity
    res_neg = calculate_de_ritis_ratio(ast=-10.0, alt=25.0)
    assert res_neg.is_valid is False
    assert res_neg.status == "INVALID_VALUE"

    # Missing input
    res_missing = calculate_de_ritis_ratio(ast=None, alt=30.0)
    assert res_missing.is_valid is False
    assert res_missing.status == "MISSING_INPUTS"

    # Incompatible unit
    res_unit = calculate_de_ritis_ratio(ast=50.0, alt=25.0, ast_unit="mg/dL")
    assert res_unit.is_valid is False
    assert res_unit.status == "INCOMPATIBLE_UNITS"


# ------------------------------------------------------------------------------
# 2. Albumin-Corrected Calcium Tests
# ------------------------------------------------------------------------------

def test_corrected_calcium_payne_formula():
    # Hypoalbuminemia: Raw Ca 7.8, Alb 2.5 -> Corrected Ca = 7.8 + 0.8 * (4.0 - 2.5) = 7.8 + 1.2 = 9.0 (Eucalcemia unmasked)
    res = calculate_albumin_corrected_calcium(total_calcium=7.8, albumin=2.5)
    assert res.is_valid is True
    assert res.output_value == 9.0
    assert res.status == "NORMAL"
    assert "Eucalcemia" in res.interpretation

    # True hypercalcemia unmasked: Raw Ca 9.8, Alb 2.0 -> Corrected Ca = 9.8 + 0.8 * 2.0 = 11.4
    res_hyper = calculate_albumin_corrected_calcium(total_calcium=9.8, albumin=2.0)
    assert res_hyper.is_valid is True
    assert res_hyper.output_value == 11.4
    assert res_hyper.status == "HIGH"

    # SI units: Ca 1.9 mmol/L, Alb 25 g/L -> Corrected Ca = 1.9 + 0.02 * (40 - 25) = 1.9 + 0.3 = 2.2 mmol/L
    res_si = calculate_albumin_corrected_calcium(total_calcium=1.9, albumin=25.0, calcium_unit="mmol/L", albumin_unit="g/L")
    assert res_si.is_valid is True
    assert res_si.output_value == 2.2
    assert res_si.status == "NORMAL"

    # Missing inputs
    res_miss = calculate_albumin_corrected_calcium(total_calcium=None, albumin=3.5)
    assert res_miss.is_valid is False
    assert res_miss.status == "MISSING_INPUTS"


# ------------------------------------------------------------------------------
# 3. Anion Gap & Albumin-Corrected Anion Gap Tests
# ------------------------------------------------------------------------------

def test_anion_gap_and_albumin_correction():
    # Normal AG: Na 140, Cl 104, HCO3 24 -> AG = 140 - 128 = 12.0
    res_ag = calculate_anion_gap(na=140.0, cl=104.0, hco3=24.0)
    assert res_ag.is_valid is True
    assert res_ag.output_value == 12.0
    assert res_ag.status == "NORMAL"

    # High Anion Gap: Na 135, Cl 98, HCO3 12 -> AG = 135 - 110 = 25.0 (HAGMA)
    res_hagma = calculate_anion_gap(na=135.0, cl=98.0, hco3=12.0)
    assert res_hagma.is_valid is True
    assert res_hagma.output_value == 25.0
    assert res_hagma.status == "CRITICAL_HIGH"

    # Albumin correction: Na 138, Cl 108, HCO3 18 -> Raw AG = 138 - 126 = 12 (Appears normal!)
    # But Albumin is 2.0 g/dL -> Corrected AG = 12 + 2.5 * (4.0 - 2.0) = 12 + 5 = 17.0 (Unmasks HAGMA!)
    res_corr = calculate_albumin_corrected_anion_gap(na=138.0, cl=108.0, hco3=18.0, albumin=2.0)
    assert res_corr.is_valid is True
    assert res_corr.output_value == 17.0
    assert res_corr.status == "HIGH"
    assert "Unmasked High Anion Gap" in res_corr.interpretation


# ------------------------------------------------------------------------------
# 4. Serum Osmolality & Osmolal Gap Tests
# ------------------------------------------------------------------------------

def test_serum_osmolality_and_osmolal_gap():
    # Normal values: Na 140, Glu 90, BUN 14
    # Osm = 2*140 + 90/18 + 14/2.8 = 280 + 5.0 + 5.0 = 290.0 mOsm/kg
    res_osm = calculate_serum_osmolality(na=140.0, glucose=90.0, bun=14.0)
    assert res_osm.is_valid is True
    assert res_osm.output_value == 290.0
    assert res_osm.status == "NORMAL"

    # Osmolal Gap with measured freezing point osmolality of 315 mOsm/kg (Toxic alcohol ingestion)
    # Gap = 315 - 290 = 25.0 mOsm/kg (>10 mOsm/kg)
    res_gap = calculate_osmolal_gap(measured_osmolality=315.0, calculated_osmolality=290.0)
    assert res_gap.is_valid is True
    assert res_gap.output_value == 25.0
    assert res_gap.status == "HIGH"
    assert "Elevated Osmolal Gap" in res_gap.interpretation

    # Missing measured osmolality
    res_gap_missing = calculate_osmolal_gap(measured_osmolality=None, calculated_osmolality=290.0)
    assert res_gap_missing.is_valid is False
    assert res_gap_missing.status == "MISSING_INPUTS"


# ------------------------------------------------------------------------------
# 5. BUN / Creatinine Ratio Tests
# ------------------------------------------------------------------------------

def test_bun_creatinine_ratio():
    # Prerenal azotemia: BUN 45, Cr 1.5 -> Ratio = 30.0 (>20:1)
    res_prerenal = calculate_bun_creatinine_ratio(bun=45.0, creatinine=1.5)
    assert res_prerenal.is_valid is True
    assert res_prerenal.output_value == 30.0
    assert res_prerenal.status == "HIGH"
    assert "Prerenal" in res_prerenal.interpretation

    # Intrinsic ATN: BUN 24, Cr 3.0 -> Ratio = 8.0 (<10:1)
    res_intrinsic = calculate_bun_creatinine_ratio(bun=24.0, creatinine=3.0)
    assert res_intrinsic.is_valid is True
    assert res_intrinsic.output_value == 8.0
    assert res_intrinsic.status == "LOW"
    assert "Intrinsic" in res_intrinsic.interpretation

    # Zero creatinine division
    res_zero = calculate_bun_creatinine_ratio(bun=20.0, creatinine=0.0)
    assert res_zero.is_valid is False
    assert res_zero.status == "ZERO_DENOMINATOR"


# ------------------------------------------------------------------------------
# 6. 2021 CKD-EPI Creatinine Equation Tests
# ------------------------------------------------------------------------------

def test_ckd_epi_2021_calculations():
    # 55-year-old female with Cr 0.8 mg/dL (Normal GFR G1)
    res_f = calculate_egfr_ckd_epi_2021(creatinine=0.8, age_years=55, sex="FEMALE")
    assert res_f.is_valid is True
    assert res_f.output_value >= 85.0
    assert "G1" in res_f.interpretation or "G2" in res_f.interpretation

    # 68-year-old male with Cr 2.4 mg/dL (CKD Stage G4 / severe decrease)
    res_m = calculate_egfr_ckd_epi_2021(creatinine=2.4, age_years=68, sex="MALE")
    assert res_m.is_valid is True
    assert res_m.output_value < 30.0
    assert res_m.status == "CRITICAL_LOW" or res_m.status == "LOW"

    # Pediatric age (<18) safeguard rejection
    res_ped = calculate_egfr_ckd_epi_2021(creatinine=0.7, age_years=12, sex="MALE")
    assert res_ped.is_valid is False
    assert res_ped.status == "OUT_OF_POPULATION_BOUNDS"

    # Missing sex / demographic input
    res_no_sex = calculate_egfr_ckd_epi_2021(creatinine=1.0, age_years=45, sex="")
    assert res_no_sex.is_valid is False
    assert res_no_sex.status == "MISSING_INPUTS"


# ------------------------------------------------------------------------------
# 7. Additional Indices: FENa, TSAT, Lipid, A/G Ratio
# ------------------------------------------------------------------------------

def test_fena_prerenal_vs_intrinsic():
    # Prerenal: Serum Na 140, Serum Cr 2.0, Urine Na 10, Urine Cr 100
    # FENa = (10 * 2.0) / (140 * 100) * 100 = 20 / 14000 * 100 = 0.14% (<1.0%)
    res_pre = calculate_fractional_excretion_of_sodium(serum_na=140.0, serum_creat=2.0, urine_na=10.0, urine_creat=100.0)
    assert res_pre.is_valid is True
    assert res_pre.output_value < 1.0
    assert res_pre.status == "LOW"
    assert "Prerenal" in res_pre.interpretation

    # Intrinsic ATN: Serum Na 136, Serum Cr 3.0, Urine Na 65, Urine Cr 40
    # FENa = (65 * 3.0) / (136 * 40) * 100 = 195 / 5440 * 100 = 3.58% (>2.0%)
    res_atn = calculate_fractional_excretion_of_sodium(serum_na=136.0, serum_creat=3.0, urine_na=65.0, urine_creat=40.0)
    assert res_atn.is_valid is True
    assert res_atn.output_value > 2.0
    assert res_atn.status == "HIGH"
    assert "Intrinsic" in res_atn.interpretation


def test_tsat_and_lipid_friedewald():
    # Iron deficiency: Iron 35, TIBC 380 -> TSAT = 9.2% (<20%)
    res_tsat = calculate_transferrin_saturation(serum_iron=35.0, tibc=380.0)
    assert res_tsat.is_valid is True
    assert res_tsat.output_value == pytest.approx(9.2, rel=1e-1)
    assert res_tsat.status == "LOW"

    # Friedewald valid: Chol 210, HDL 45, Trig 150 -> LDL = 210 - 45 - 30 = 135
    lipids = calculate_lipid_indices(chol=210.0, hdl=45.0, trig=150.0)
    assert lipids["friedewald_ldl"].is_valid is True
    assert lipids["friedewald_ldl"].output_value == 135.0

    # Friedewald invalid when Trig >= 400
    lipids_high_tg = calculate_lipid_indices(chol=260.0, hdl=35.0, trig=520.0)
    assert lipids_high_tg["friedewald_ldl"].is_valid is False
    assert "INVALID" in lipids_high_tg["friedewald_ldl"].status or "INVALID" in lipids_high_tg["friedewald_ldl"].interpretation


def test_protein_ag_ratio_inverted():
    # Multiple Myeloma / Cirrhosis pattern: TP 8.8, Alb 2.2 -> Globulin = 6.6, A/G = 0.33 (<1.0)
    res_ag = calculate_ag_protein_ratio(total_protein=8.8, albumin=2.2)
    assert res_ag.is_valid is True
    assert res_ag.output_value == pytest.approx(0.33, rel=1e-2)
    assert res_ag.status == "LOW"
    assert "Inverted" in res_ag.interpretation


# ------------------------------------------------------------------------------
# 8. Structured Acid–Base Analysis (Winter's formula & mixed disorders)
# ------------------------------------------------------------------------------

def test_acid_base_metabolic_acidosis_winters_formula():
    # Severe DKA: pH 7.18, PaCO2 18, HCO3 7, Na 135, Cl 98, Albumin 4.0
    # Expected PaCO2 = 1.5 * 7 + 8 +/- 2 = 18.5 +/- 2 (16.5 - 20.5 mmHg).
    # Actual PaCO2 is 18 (Within expected range -> Adequate respiratory compensation).
    # AG = 135 - (98 + 7) = 30.0 (High AG).
    # Delta AG = 30 - 12 = 18. Delta HCO3 = 24 - 7 = 17. Delta Ratio = 18/17 = 1.06 (Pure HAGMA).
    abg = analyze_acid_base(ph=7.18, paco2=18.0, hco3=7.0, na=135.0, cl=98.0, albumin=4.0)
    assert abg["is_valid"] is True
    assert abg["ph_status"] == "ACIDEMIA"
    assert "Primary Metabolic Acidosis" in abg["primary_processes"]
    assert "Adequate Respiratory Compensation" in abg["compensation"]["metabolic_acidosis_compensation"]
    assert abg["anion_gap_analysis"]["is_hagma"] is True
    assert abg["delta_ratio_analysis"]["delta_ratio"] == pytest.approx(1.06, rel=1e-1)
    assert "Pure High Anion Gap" in abg["delta_ratio_analysis"]["interpretation"]


def test_acid_base_mixed_disorder_and_warnings():
    # Metabolic acidosis with failure to hyperventilate (concomitant respiratory acidosis):
    # pH 7.10, PaCO2 35 (expected is ~18 for HCO3 7), HCO3 7
    abg = analyze_acid_base(ph=7.10, paco2=35.0, hco3=7.0)
    assert abg["is_valid"] is True
    assert "Concurrent Respiratory Acidosis" in abg["compensation"]["metabolic_acidosis_compensation"]
    assert len(abg["clinical_warnings"]) > 0


def test_acid_base_non_physiologic_values():
    abg_invalid = analyze_acid_base(ph=5.2, paco2=200.0, hco3=1.0)
    assert abg_invalid["is_valid"] is False
    assert abg_invalid["status"] == "NON_PHYSIOLOGIC_VALUES"


# ------------------------------------------------------------------------------
# 9. API Integration & Audit Record Creation Tests
# ------------------------------------------------------------------------------

def test_api_de_ritis_and_audit_persistence(client, auth_headers):
    # Call De Ritis endpoint
    resp = client.post(
        "/api/v1/biochem/calculations/de-ritis",
        headers=auth_headers,
        json={"ast": 120.0, "alt": 45.0, "ast_unit": "U/L", "alt_unit": "U/L"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["output_value"] == pytest.approx(2.67, rel=1e-2)
    assert data["provenance_hash"] != ""

    # Verify audit log was persisted
    audit_resp = client.get(
        "/api/v1/biochem/calculations/history?calculation_type=DE_RITIS",
        headers=auth_headers
    )
    assert audit_resp.status_code == 200
    audit_data = audit_resp.json()
    assert audit_data["count"] >= 1
    latest = audit_data["logs"][0]
    assert latest["calculation_type"] == "DE_RITIS"
    assert latest["outputs"]["output_value"] == pytest.approx(2.67, rel=1e-2)


def test_api_profile_retrieval(client, auth_headers):
    # Liver Profile
    liver_resp = client.get("/api/v1/biochem/profiles/liver", headers=auth_headers)
    assert liver_resp.status_code == 200
    liver_data = liver_resp.json()
    assert liver_data["profile_type"] == "LIVER"
    assert len(liver_data["analytes"]) >= 8

    # Renal Profile
    renal_resp = client.get("/api/v1/biochem/profiles/renal", headers=auth_headers)
    assert renal_resp.status_code == 200
    renal_data = renal_resp.json()
    assert renal_data["profile_type"] == "RENAL"

    # Electrolyte Profile
    elyte_resp = client.get("/api/v1/biochem/profiles/electrolyte", headers=auth_headers)
    assert elyte_resp.status_code == 200
    elyte_data = elyte_resp.json()
    assert elyte_data["profile_type"] == "ELECTROLYTE"
