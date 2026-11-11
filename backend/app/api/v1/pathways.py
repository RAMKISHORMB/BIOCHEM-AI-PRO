from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.encounter import Encounter
from app.models.lab_result import LabResult
from app.services.pathways_data import METABOLIC_PATHWAYS_DATABASE, get_pathways_with_patient_overlay

router = APIRouter(prefix="/pathways", tags=["Metabolic Pathway Explorer"])

@router.get("")
def get_pathways(
    encounter_id: Optional[str] = Query(None, description="Optional encounter ID to overlay patient abnormal labs"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve verified biochemical metabolic pathways with dynamic patient abnormal lab overlays."""
    abnormal_codes: List[str] = []
    
    if encounter_id:
        encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if not encounter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encounter not found")
        
        # Extract abnormal and critical flags
        for r in encounter.results:
            if r.flag in ["LOW", "HIGH", "CRITICAL_LOW", "CRITICAL_HIGH"]:
                abnormal_codes.append(r.analyte.code)

    return {
        "pathways": get_pathways_with_patient_overlay(abnormal_codes),
        "patient_abnormal_analytes": abnormal_codes,
        "encounter_id": encounter_id
    }
