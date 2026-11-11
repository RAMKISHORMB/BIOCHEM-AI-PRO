from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.encounter import Encounter
from app.models.lab_result import LabResult
from app.models.lab_test import TestAnalyte, ReferenceRange
from app.models.patient import Patient

# Standard clinical laboratory delta check criteria (CLSI / Tietz)
DELTA_CHECK_THRESHOLDS = {
    "K": {"percent": 20.0, "abs": 0.5, "unit": "mmol/L", "warning": "Acute potassium surge/drop. Evaluate for in-vitro hemolysis vs acute cardiac risk."},
    "CREAT": {"percent": 50.0, "abs": 0.3, "unit": "mg/dL", "warning": "Creatinine acute rise meets KDIGO Acute Kidney Injury (AKI) trigger."},
    "NA": {"percent": 5.0, "abs": 7.0, "unit": "mmol/L", "warning": "Acute sodium shift. Risk of osmotic demyelination / cerebral edema."},
    "GLU": {"percent": 50.0, "abs": 50.0, "unit": "mg/dL", "warning": "Marked glycemic excursion."},
    "ALB": {"percent": 25.0, "abs": 0.8, "unit": "g/dL", "warning": "Acute albumin decline. Evaluate for capillary leak or hemodilution."},
    "CA": {"percent": 10.0, "abs": 0.8, "unit": "mg/dL", "warning": "Significant calcium shift."},
    "ALT": {"percent": 100.0, "abs": 40.0, "unit": "U/L", "warning": "Transaminase doubling indicates acute hepatic insult."},
    "AST": {"percent": 100.0, "abs": 40.0, "unit": "U/L", "warning": "Acute transaminase spike."},
}

DEFAULT_DELTA_THRESHOLD_PERCENT = 30.0

def calculate_patient_timeline_and_deltas(db: Session, patient_id: str) -> List[Dict[str, Any]]:
    """
    Retrieve all encounters for a patient chronologically and compute
    laboratory delta checks against the immediately preceding encounter.
    """
    encounters = (
        db.query(Encounter)
        .filter(Encounter.patient_id == patient_id)
        .order_by(Encounter.sample_collected_at.asc())
        .all()
    )

    timeline = []
    previous_results: Dict[str, float] = {}
    previous_collected_at: Optional[datetime] = None

    for enc in encounters:
        enc_results = (
            db.query(LabResult)
            .filter(LabResult.encounter_id == enc.id)
            .all()
        )

        current_results_map: Dict[str, float] = {}
        analyte_data = []
        delta_alerts = []

        for r in enc_results:
            analyte_code = r.analyte.code if r.analyte else "UNKNOWN"
            val = r.value_numeric

            item = {
                "analyte_code": analyte_code,
                "analyte_name": r.analyte.name if r.analyte else analyte_code,
                "value": val,
                "unit": r.unit,
                "flag": r.flag,
                "reference_range": r.reference_range_applied,
                "delta_percent": None,
                "delta_abs": None,
                "delta_flag": "NORMAL",
                "delta_message": None,
            }

            if val is not None:
                current_results_map[analyte_code] = val
                # Compare to previous encounter result if exists
                if analyte_code in previous_results:
                    prev_val = previous_results[analyte_code]
                    abs_diff = round(val - prev_val, 2)
                    pct_diff = round(((val - prev_val) / prev_val) * 100.0, 1) if prev_val != 0 else 0.0

                    item["delta_percent"] = pct_diff
                    item["delta_abs"] = abs_diff

                    threshold_config = DELTA_CHECK_THRESHOLDS.get(analyte_code, {"percent": DEFAULT_DELTA_THRESHOLD_PERCENT, "abs": None, "warning": "Notable multi-day analyte variation."})
                    threshold_pct = threshold_config["percent"]

                    if abs(pct_diff) >= threshold_pct:
                        delta_flag = "DELTA_SURGE" if pct_diff > 0 else "DELTA_DROP"
                        msg = f"{analyte_code} changed by {pct_diff:+}% ({abs_diff:+} {r.unit}). {threshold_config['warning']}"
                        item["delta_flag"] = delta_flag
                        item["delta_message"] = msg
                        delta_alerts.append({
                            "analyte_code": analyte_code,
                            "current_value": val,
                            "previous_value": prev_val,
                            "unit": r.unit,
                            "percent_change": pct_diff,
                            "absolute_change": abs_diff,
                            "delta_flag": delta_flag,
                            "warning": msg,
                        })

            analyte_data.append(item)

        # Calculate interval between encounters
        interval_hours = None
        if previous_collected_at:
            interval_hours = round((enc.sample_collected_at - previous_collected_at).total_seconds() / 3600.0, 1)

        timeline.append({
            "encounter_id": enc.id,
            "accession_number": enc.accession_number,
            "sample_collected_at": enc.sample_collected_at.isoformat(),
            "sample_type": enc.sample_type,
            "fasting_status": enc.fasting_status,
            "interval_hours_since_previous": interval_hours,
            "analytes": analyte_data,
            "delta_alerts": delta_alerts,
        })

        # Update previous state
        previous_results = current_results_map
        previous_collected_at = enc.sample_collected_at

    return timeline


def get_patient_analyte_trend(db: Session, patient_id: str, analyte_code: str) -> Dict[str, Any]:
    """
    Retrieve longitudinal trend line for a specific analyte for charting.
    """
    analyte = db.query(TestAnalyte).filter(TestAnalyte.code == analyte_code).first()
    if not analyte:
        return {"analyte_code": analyte_code, "points": [], "reference_range": None}

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    ref_range = None
    if patient:
        ref = (
            db.query(ReferenceRange)
            .filter(
                ReferenceRange.analyte_id == analyte.id,
                ReferenceRange.biological_sex.in_([patient.biological_sex, "ALL"]),
            )
            .first()
        )
        if ref:
            ref_range = {
                "lower_limit": ref.lower_limit,
                "upper_limit": ref.upper_limit,
                "critical_low": ref.critical_low,
                "critical_high": ref.critical_high,
                "unit": ref.unit,
            }

    results = (
        db.query(LabResult, Encounter)
        .join(Encounter, LabResult.encounter_id == Encounter.id)
        .filter(Encounter.patient_id == patient_id, LabResult.analyte_id == analyte.id)
        .order_by(Encounter.sample_collected_at.asc())
        .all()
    )

    points = []
    for r, enc in results:
        points.append({
            "timestamp": enc.sample_collected_at.isoformat(),
            "date_display": enc.sample_collected_at.strftime("%b %d %H:%M"),
            "accession_number": enc.accession_number,
            "value": r.value_numeric,
            "unit": r.unit,
            "flag": r.flag,
        })

    return {
        "analyte_code": analyte.code,
        "analyte_name": analyte.name,
        "unit": analyte.default_unit,
        "points": points,
        "reference_range": ref_range,
    }
