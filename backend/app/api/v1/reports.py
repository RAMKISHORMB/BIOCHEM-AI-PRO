from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.encounter import Encounter
from app.models.patient import Patient
from app.services import report_service
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/reports", tags=["Clinical Report Generation"])

@router.get("/encounters/{encounter_id}/pdf")
def download_encounter_pdf(
    encounter_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate and stream an official, CLIA/CAP-aligned PDF clinical biochemistry report
    with traceable reference intervals, calculated indices, and clinician sign-off block.
    """
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    try:
        pdf_buffer = report_service.generate_clinical_report_pdf(db, encounter_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate clinical PDF report: {str(e)}"
        )

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        action="EXPORT_PDF_REPORT",
        entity_name="ENCOUNTER",
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=encounter.id,
        details={"accession": encounter.accession_number, "patient_mrn": encounter.patient.mrn},
        ip_address=client_ip
    )

    filename = f"BiochemReport_{encounter.accession_number}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.get("/encounters/{encounter_id}/csv")
def download_encounter_csv(
    encounter_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export quantitative laboratory test results for an encounter as CSV."""
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    csv_data = report_service.generate_encounter_csv(db, encounter_id)

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        action="EXPORT_CSV_REPORT",
        entity_name="ENCOUNTER",
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=encounter.id,
        details={"accession": encounter.accession_number},
        ip_address=client_ip
    )

    filename = f"BiochemResults_{encounter.accession_number}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.get("/patients/{patient_id}/csv")
def download_patient_history_csv(
    patient_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export longitudinal multi-encounter laboratory history for a patient as CSV."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    csv_data = report_service.generate_patient_history_csv(db, patient_id)

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        action="EXPORT_PATIENT_HISTORY_CSV",
        entity_name="PATIENT",
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=patient.id,
        details={"mrn": patient.mrn},
        ip_address=client_ip
    )

    filename = f"PatientHistory_{patient.mrn}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
