from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
import httpx

from app.core.database import get_db
from app.core.config import settings
from app.core.deps import get_current_user
from app.models.user import User
from app.models.patient import Patient
from app.models.encounter import Encounter
from app.models.lab_result import LabResult
from app.models.lab_test import TestAnalyte
from app.models.interpretation import InterpretationReport
from app.models.audit import AuditLog

router = APIRouter(prefix="/dashboard", tags=["Professional Dashboard"])

@router.get("/metrics")
async def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compute real-time clinical platform statistics and workload indicators directly from PostgreSQL."""
    total_patients = db.query(Patient).count()
    total_encounters = db.query(Encounter).count()
    total_critical = db.query(LabResult).filter(
        LabResult.flag.in_(["CRITICAL_LOW", "CRITICAL_HIGH"])
    ).count()
    total_abnormal = db.query(LabResult).filter(
        LabResult.flag.in_(["LOW", "HIGH"])
    ).count()
    pending_reviews = db.query(InterpretationReport).filter(
        InterpretationReport.clinician_reviewed == False
    ).count()
    total_audits = db.query(AuditLog).count()

    # 7-day encounter timeline
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    encounters_7d = db.query(
        func.date(Encounter.sample_collected_at).label("day"),
        func.count(Encounter.id).label("count")
    ).filter(
        Encounter.sample_collected_at >= seven_days_ago
    ).group_by(
        func.date(Encounter.sample_collected_at)
    ).all()

    volume_timeline = [{"date": str(row.day), "count": row.count} for row in encounters_7d]

    # Latest 10 critical lab alerts
    critical_query = db.query(
        LabResult, Encounter, Patient, TestAnalyte
    ).join(
        Encounter, LabResult.encounter_id == Encounter.id
    ).join(
        Patient, Encounter.patient_id == Patient.id
    ).join(
        TestAnalyte, LabResult.analyte_id == TestAnalyte.id
    ).filter(
        LabResult.flag.in_(["CRITICAL_LOW", "CRITICAL_HIGH"])
    ).order_by(
        desc(LabResult.created_at)
    ).limit(10).all()

    critical_alerts = []
    for res, enc, pat, test in critical_query:
        critical_alerts.append({
            "result_id": res.id,
            "encounter_id": enc.id,
            "accession_number": enc.accession_number,
            "patient_id": pat.id,
            "patient_mrn": pat.mrn,
            "patient_name": pat.full_name,
            "analyte_code": test.code,
            "analyte_name": test.name,
            "value_numeric": res.value_numeric,
            "unit": res.unit,
            "flag": res.flag,
            "timestamp": res.created_at.isoformat()
        })

    # Latest 5 encounters
    recent_encs = db.query(Encounter, Patient).join(
        Patient, Encounter.patient_id == Patient.id
    ).order_by(
        desc(Encounter.created_at)
    ).limit(5).all()

    recent_encounters_list = []
    for enc, pat in recent_encs:
        recent_encounters_list.append({
            "id": enc.id,
            "accession_number": enc.accession_number,
            "patient_id": pat.id,
            "patient_mrn": pat.mrn,
            "patient_name": pat.full_name,
            "sample_type": enc.sample_type,
            "clinical_status": enc.clinical_status,
            "sample_collected_at": enc.sample_collected_at.isoformat(),
        })

    # Local Ollama service status check
    ollama_online = False
    ollama_model = settings.OLLAMA_DEFAULT_MODEL
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                ollama_online = True
    except Exception:
        ollama_online = False

    return {
        "summary": {
            "total_patients": total_patients,
            "total_encounters": total_encounters,
            "total_critical_alerts": total_critical,
            "total_abnormal_results": total_abnormal,
            "pending_clinician_reviews": pending_reviews,
            "total_audit_events": total_audits,
        },
        "volume_timeline": volume_timeline,
        "critical_alerts": critical_alerts,
        "recent_encounters": recent_encounters_list,
        "system_status": {
            "database": "Online (PostgreSQL Persistent)",
            "ollama_online": ollama_online,
            "ollama_model": ollama_model,
            "ollama_url": settings.OLLAMA_BASE_URL
        }
    }
