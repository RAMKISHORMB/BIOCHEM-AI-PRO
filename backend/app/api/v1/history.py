from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.patient import Patient
from app.services import history_service

router = APIRouter(prefix="/history", tags=["Patient History & Delta Checks"])

@router.get("/patients/{patient_id}/timeline")
def get_patient_timeline(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get longitudinal encounter timeline for a patient with computed
    CLSI/Tietz laboratory delta checks between consecutive visits.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    timeline = history_service.calculate_patient_timeline_and_deltas(db, patient_id)
    return {
        "patient": {
            "id": patient.id,
            "mrn": patient.mrn,
            "full_name": patient.full_name,
            "sex": patient.biological_sex,
            "age_years": patient.age_years,
        },
        "timeline": timeline,
    }

@router.get("/patients/{patient_id}/trends")
def get_patient_trends(
    patient_id: str,
    analyte_code: str = Query(..., description="Analyte code (e.g. CREAT, K, GLU, ALT)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get longitudinal time-series data points and physiological reference range
    boundaries for a single analyte for charting.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    trend_data = history_service.get_patient_analyte_trend(db, patient_id, analyte_code.upper())
    return {
        "patient_id": patient_id,
        "mrn": patient.mrn,
        **trend_data,
    }
