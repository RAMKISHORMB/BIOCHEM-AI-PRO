import random
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import json

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.encounter import Encounter
from app.models.lab_result import LabResult
from app.models.lab_test import TestAnalyte, ReferenceRange
from app.models.interpretation import InterpretationReport
from app.schemas.lab_entry import (
    EncounterCreate,
    EncounterResponse,
    EncounterDetailResponse,
    LabResultResponse,
    InterpretationReportResponse
)
from app.services.interpretation_engine import (
    evaluate_analyte_flag,
    run_biochemical_interpretation,
    DISCLAIMER_TEXT
)
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/labs", tags=["Manual Laboratory Data Entry"])

def generate_accession_number(db: Session) -> str:
    """Generate unique accession number: ACC-YYYY-XXXXX."""
    year = date.today().year
    for _ in range(10):
        candidate = f"ACC-{year}-{random.randint(10000, 99999)}"
        if not db.query(Encounter).filter(Encounter.accession_number == candidate).first():
            return candidate
    return f"ACC-{year}-{int(datetime.utcnow().timestamp())}"

@router.get("/generate-accession")
def get_accession_number(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a unique compliant laboratory accession number."""
    return {"accession_number": generate_accession_number(db)}

@router.post("/encounters", response_model=EncounterDetailResponse, status_code=status.HTTP_201_CREATED)
def create_encounter_with_results(
    payload: EncounterCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually enter and persist a clinical laboratory panel into PostgreSQL.
    Evaluates reference flags and executes automatic biochemical interpretation.
    """
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient record not found")

    accession = payload.accession_number.strip() if payload.accession_number else generate_accession_number(db)
    
    # Check uniqueness of accession number
    existing_acc = db.query(Encounter).filter(Encounter.accession_number == accession).first()
    if existing_acc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Accession number '{accession}' already exists."
        )

    encounter = Encounter(
        patient_id=patient.id,
        technician_id=current_user.id,
        accession_number=accession,
        sample_collected_at=payload.sample_collected_at,
        sample_received_at=payload.sample_received_at,
        sample_type=payload.sample_type,
        clinical_status="COMPLETED",
        fasting_status=payload.fasting_status,
        clinical_notes=payload.clinical_notes,
    )
    db.add(encounter)
    db.flush()

    # Pre-fetch all active reference ranges
    analytes_map = {a.id: a for a in db.query(TestAnalyte).all()}
    analyte_values_dict: dict[str, float] = {}

    results_to_return = []
    for r in payload.results:
        analyte = analytes_map.get(r.analyte_id)
        if not analyte:
            continue

        flag = "NORMAL"
        ref_applied_str = "No reference range configured"

        if r.value_numeric is not None:
            analyte_values_dict[analyte.code] = r.value_numeric
            flag, ref_applied_str = evaluate_analyte_flag(
                value=r.value_numeric,
                sex=patient.biological_sex,
                age_years=patient.age_years,
                reference_ranges=analyte.reference_ranges
            )

        lab_result = LabResult(
            encounter_id=encounter.id,
            analyte_id=analyte.id,
            value_numeric=r.value_numeric,
            value_text=r.value_text,
            unit=r.unit,
            flag=flag,
            reference_range_applied=ref_applied_str,
            notes=r.notes
        )
        db.add(lab_result)
        db.flush()

        results_to_return.append(
            LabResultResponse(
                id=lab_result.id,
                analyte_id=analyte.id,
                analyte_code=analyte.code,
                analyte_name=analyte.name,
                category=analyte.category,
                value_numeric=lab_result.value_numeric,
                value_text=lab_result.value_text,
                unit=lab_result.unit,
                flag=lab_result.flag,
                reference_range_applied=lab_result.reference_range_applied,
                notes=lab_result.notes,
                created_at=lab_result.created_at
            )
        )

    # Execute automated biochemical interpretation
    indices, clinical_flags, diag_notes, metab_alerts = run_biochemical_interpretation(
        patient=patient,
        analyte_values=analyte_values_dict
    )

    interp_report = InterpretationReport(
        encounter_id=encounter.id,
        evaluator_id=current_user.id,
        calculated_indices_json=json.dumps(indices),
        clinical_flags_json=json.dumps(clinical_flags),
        diagnostic_considerations=diag_notes,
        metabolic_alerts=metab_alerts,
        clinician_reviewed=False,
    )
    db.add(interp_report)
    db.commit()
    db.refresh(encounter)
    db.refresh(interp_report)

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        action="ENTER_LAB_PANEL",
        entity_name="ENCOUNTER",
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=encounter.id,
        details={
            "accession_number": encounter.accession_number,
            "patient_mrn": patient.mrn,
            "analytes_count": len(results_to_return),
            "flags_detected": len(clinical_flags)
        },
        ip_address=client_ip
    )

    return EncounterDetailResponse(
        id=encounter.id,
        patient_id=patient.id,
        patient_mrn=patient.mrn,
        patient_name=patient.full_name,
        patient_sex=patient.biological_sex,
        patient_age_years=patient.age_years,
        accession_number=encounter.accession_number,
        sample_collected_at=encounter.sample_collected_at,
        sample_received_at=encounter.sample_received_at,
        sample_type=encounter.sample_type,
        clinical_status=encounter.clinical_status,
        fasting_status=encounter.fasting_status,
        clinical_notes=encounter.clinical_notes,
        results=results_to_return,
        interpretation=InterpretationReportResponse(
            id=interp_report.id,
            encounter_id=interp_report.encounter_id,
            calculated_indices=indices,
            clinical_flags=clinical_flags,
            diagnostic_considerations=interp_report.diagnostic_considerations,
            metabolic_alerts=interp_report.metabolic_alerts,
            clinician_reviewed=interp_report.clinician_reviewed,
            reviewed_at=interp_report.reviewed_at,
            created_at=interp_report.created_at
        ),
        created_at=encounter.created_at
    )

@router.get("/encounters", response_model=List[EncounterResponse])
def list_encounters(
    patient_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve historical laboratory encounters with summary result and critical counts."""
    query = db.query(Encounter, Patient).join(Patient, Encounter.patient_id == Patient.id)
    if patient_id:
        query = query.filter(Encounter.patient_id == patient_id)

    encounters = query.order_by(desc(Encounter.sample_collected_at)).offset(skip).limit(limit).all()

    response = []
    for enc, pat in encounters:
        res_count = db.query(LabResult).filter(LabResult.encounter_id == enc.id).count()
        crit_count = db.query(LabResult).filter(
            LabResult.encounter_id == enc.id,
            LabResult.flag.in_(["CRITICAL_LOW", "CRITICAL_HIGH"])
        ).count()

        response.append(
            EncounterResponse(
                id=enc.id,
                patient_id=pat.id,
                patient_mrn=pat.mrn,
                patient_name=pat.full_name,
                accession_number=enc.accession_number,
                sample_collected_at=enc.sample_collected_at,
                sample_received_at=enc.sample_received_at,
                sample_type=enc.sample_type,
                clinical_status=enc.clinical_status,
                fasting_status=enc.fasting_status,
                clinical_notes=enc.clinical_notes,
                results_count=res_count,
                critical_flags_count=crit_count,
                created_at=enc.created_at
            )
        )
    return response

@router.get("/encounters/{encounter_id}", response_model=EncounterDetailResponse)
def get_encounter_detail(
    encounter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve complete laboratory encounter with all measured analytes and computed interpretation."""
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not encounter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encounter not found")

    patient = encounter.patient
    results_list = []
    for r in encounter.results:
        results_list.append(
            LabResultResponse(
                id=r.id,
                analyte_id=r.analyte_id,
                analyte_code=r.analyte.code,
                analyte_name=r.analyte.name,
                category=r.analyte.category,
                value_numeric=r.value_numeric,
                value_text=r.value_text,
                unit=r.unit,
                flag=r.flag,
                reference_range_applied=r.reference_range_applied,
                notes=r.notes,
                created_at=r.created_at
            )
        )

    interp_response = None
    if encounter.interpretation:
        interp = encounter.interpretation
        interp_response = InterpretationReportResponse(
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

    return EncounterDetailResponse(
        id=encounter.id,
        patient_id=patient.id,
        patient_mrn=patient.mrn,
        patient_name=patient.full_name,
        patient_sex=patient.biological_sex,
        patient_age_years=patient.age_years,
        accession_number=encounter.accession_number,
        sample_collected_at=encounter.sample_collected_at,
        sample_received_at=encounter.sample_received_at,
        sample_type=encounter.sample_type,
        clinical_status=encounter.clinical_status,
        fasting_status=encounter.fasting_status,
        clinical_notes=encounter.clinical_notes,
        results=results_list,
        interpretation=interp_response,
        created_at=encounter.created_at
    )
