from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse, PatientListResponse
from app.services import patient_service
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/patients", tags=["Patient Registry"])

@router.get("/generate-mrn")
def get_new_mrn(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a unique compliant MRN code for a new patient."""
    return {"mrn": patient_service.generate_mrn(db)}

@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def register_patient(
    payload: PatientCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register a new patient into the clinical registry with validation."""
    existing = db.query(Patient).filter(Patient.mrn == payload.mrn.upper().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Patient with MRN '{payload.mrn}' is already registered."
        )

    patient = patient_service.create_patient(db, payload)
    
    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        action="CREATE_PATIENT",
        entity_name="PATIENT",
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=patient.id,
        details={"mrn": patient.mrn, "full_name": patient.full_name},
        ip_address=client_ip
    )

    return patient

@router.get("", response_model=PatientListResponse)
def get_patients(
    search: str = Query("", description="Search by MRN, Name, Phone or Email"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve paginated list of patients with search filtering."""
    total, items = patient_service.list_patients(db, search=search, skip=skip, limit=limit)
    return PatientListResponse(total=total, items=items)

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient_by_id(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve detailed demographics and clinical history for a specific patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient

@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: str,
    payload: PatientUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update patient demographic and medical history attributes."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if val is not None:
            if field in ["biological_sex", "blood_group"]:
                setattr(patient, field, val.upper())
            else:
                setattr(patient, field, val)

    db.commit()
    db.refresh(patient)

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        action="UPDATE_PATIENT",
        entity_name="PATIENT",
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=patient.id,
        details={"updated_fields": list(update_dict.keys())},
        ip_address=client_ip
    )

    return patient

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Delete a patient record and cascaded lab encounters (Administrator only)."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    mrn = patient.mrn
    db.delete(patient)
    db.commit()

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        action="DELETE_PATIENT",
        entity_name="PATIENT",
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=patient_id,
        details={"mrn": mrn},
        ip_address=client_ip
    )
    return None
