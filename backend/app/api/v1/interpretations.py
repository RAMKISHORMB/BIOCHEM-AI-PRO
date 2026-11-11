import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.encounter import Encounter
from app.models.patient import Patient
from app.models.interpretation import InterpretationReport
from app.schemas.lab_entry import InterpretationReportResponse
from app.services.interpretation_engine import (
    run_biochemical_interpretation,
    calculate_ckd_epi_2021,
    DISCLAIMER_TEXT
)
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/interpretations", tags=["Biochemical Interpretation Engine"])

class ReviewPayload(BaseModel):
    reviewer_notes: Optional[str] = None

class CalculatorRequest(BaseModel):
    age_years: int = 45
    biological_sex: str = "MALE"
    analytes: Dict[str, float]

class CalculatorResponse(BaseModel):
    calculated_indices: Dict[str, Any]
    clinical_flags: List[Dict[str, Any]]
    diagnostic_considerations: str
    metabolic_alerts: str
    statutory_disclaimer: str

@router.get("/encounters/{encounter_id}", response_model=InterpretationReportResponse)
def get_encounter_interpretation(
    encounter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve detailed automated biochemical interpretation report for an encounter."""
    interp = db.query(InterpretationReport).filter(InterpretationReport.encounter_id == encounter_id).first()
    if not interp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interpretation report not found for this encounter"
        )

    return InterpretationReportResponse(
        id=interp.id,
        encounter_id=interp.encounter_id,
        calculated_indices=json.loads(interp.calculated_indices_json or "{}"),
        clinical_flags=json.loads(interp.clinical_flags_json or "[]"),
        diagnostic_considerations=interp.diagnostic_considerations,
        metabolic_alerts=interp.metabolic_alerts,
        clinician_reviewed=interp.clinician_reviewed,
        reviewed_at=interp.reviewed_at,
        created_at=interp.created_at
    )

@router.post("/encounters/{encounter_id}/review", response_model=InterpretationReportResponse)
def review_interpretation(
    encounter_id: str,
    payload: ReviewPayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.BIOCHEMIST, UserRole.CLINICIAN]))
):
    """Clinician or Pathologist formal sign-off review of biochemical interpretation."""
    interp = db.query(InterpretationReport).filter(InterpretationReport.encounter_id == encounter_id).first()
    if not interp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interpretation report not found")

    interp.clinician_reviewed = True
    interp.reviewed_at = datetime.utcnow()
    interp.evaluator_id = current_user.id
    if payload.reviewer_notes:
        interp.reviewer_notes = payload.reviewer_notes.strip()

    db.commit()
    db.refresh(interp)

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        action="REVIEW_INTERPRETATION",
        entity_name="INTERPRETATION_REPORT",
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=interp.id,
        details={"reviewer_notes": payload.reviewer_notes},
        ip_address=client_ip
    )

    return InterpretationReportResponse(
        id=interp.id,
        encounter_id=interp.encounter_id,
        calculated_indices=json.loads(interp.calculated_indices_json or "{}"),
        clinical_flags=json.loads(interp.clinical_flags_json or "[]"),
        diagnostic_considerations=interp.diagnostic_considerations,
        metabolic_alerts=interp.metabolic_alerts,
        clinician_reviewed=interp.clinician_reviewed,
        reviewed_at=interp.reviewed_at,
        created_at=interp.created_at
    )

@router.post("/calculator", response_model=CalculatorResponse)
def execute_standalone_calculator(
    payload: CalculatorRequest,
    current_user: User = Depends(get_current_user)
):
    """Execute real-time mathematical calculations for biochemical indices from raw values."""
    mock_patient = Patient(
        id="calc-session",
        mrn="MRN-CALC",
        full_name="Calculator Inquiry",
        date_of_birth=datetime(2026 - payload.age_years, 1, 1).date(),
        biological_sex=payload.biological_sex.upper()
    )

    indices, flags, diag, alerts = run_biochemical_interpretation(
        patient=mock_patient,
        analyte_values=payload.analytes
    )

    return CalculatorResponse(
        calculated_indices=indices,
        clinical_flags=flags,
        diagnostic_considerations=diag,
        metabolic_alerts=alerts,
        statutory_disclaimer=DISCLAIMER_TEXT
    )
