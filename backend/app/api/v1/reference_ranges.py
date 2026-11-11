from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.lab_test import TestAnalyte, ReferenceRange
from app.schemas.lab_test import (
    TestAnalyteResponse,
    TestAnalyteWithRangesResponse,
    TestAnalyteCreate,
    ReferenceRangeCreate,
    ReferenceRangeResponse,
)
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/reference-ranges", tags=["Analyte & Reference Range Management"])

@router.get("/tests", response_model=List[TestAnalyteWithRangesResponse])
def get_all_analytes(
    category: Optional[str] = Query(None, description="Filter by category e.g. METABOLIC, RENAL, HEPATIC"),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full catalog of laboratory analytes with their traceable reference intervals."""
    query = db.query(TestAnalyte)
    if active_only:
        query = query.filter(TestAnalyte.is_active == True)
    if category:
        query = query.filter(TestAnalyte.category == category.upper())
    return query.order_by(TestAnalyte.category, TestAnalyte.name).all()

@router.get("/tests/{test_id}", response_model=TestAnalyteWithRangesResponse)
def get_analyte_by_id(
    test_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve single analyte with all defined population reference ranges."""
    analyte = db.query(TestAnalyte).filter(TestAnalyte.id == test_id).first()
    if not analyte:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analyte test not found")
    return analyte

@router.post("/tests", response_model=TestAnalyteWithRangesResponse, status_code=status.HTTP_201_CREATED)
def create_analyte(
    payload: TestAnalyteCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.BIOCHEMIST]))
):
    """Add a new clinical analyte to the library (Biochemist or Admin)."""
    existing = db.query(TestAnalyte).filter(TestAnalyte.code == payload.code.upper().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Analyte with code '{payload.code}' already exists"
        )
    
    analyte = TestAnalyte(
        code=payload.code.upper().strip(),
        name=payload.name.strip(),
        category=payload.category.upper().strip(),
        default_unit=payload.default_unit.strip(),
        loinc_code=payload.loinc_code.strip() if payload.loinc_code else None,
        description=payload.description.strip() if payload.description else None,
        is_active=payload.is_active
    )
    db.add(analyte)
    db.flush()

    if payload.initial_reference_ranges:
        for r in payload.initial_reference_ranges:
            ref = ReferenceRange(
                analyte_id=analyte.id,
                biological_sex=r.biological_sex,
                min_age_years=r.min_age_years,
                max_age_years=r.max_age_years,
                lower_limit=r.lower_limit,
                upper_limit=r.upper_limit,
                critical_low=r.critical_low,
                critical_high=r.critical_high,
                unit=r.unit,
                source_authority=r.source_authority,
                population_notes=r.population_notes
            )
            db.add(ref)

    db.commit()
    db.refresh(analyte)

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        action="CREATE_ANALYTE",
        entity_name="TEST_ANALYTE",
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=analyte.id,
        details={"code": analyte.code, "name": analyte.name},
        ip_address=client_ip
    )
    return analyte

@router.post("/tests/{test_id}/ranges", response_model=ReferenceRangeResponse, status_code=status.HTTP_201_CREATED)
def add_reference_range(
    test_id: str,
    payload: ReferenceRangeCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.BIOCHEMIST]))
):
    """Add a specific demographic or age-bracket reference interval for an analyte."""
    analyte = db.query(TestAnalyte).filter(TestAnalyte.id == test_id).first()
    if not analyte:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analyte test not found")

    ref = ReferenceRange(
        analyte_id=analyte.id,
        biological_sex=payload.biological_sex,
        min_age_years=payload.min_age_years,
        max_age_years=payload.max_age_years,
        lower_limit=payload.lower_limit,
        upper_limit=payload.upper_limit,
        critical_low=payload.critical_low,
        critical_high=payload.critical_high,
        unit=payload.unit,
        source_authority=payload.source_authority,
        population_notes=payload.population_notes
    )
    db.add(ref)
    db.commit()
    db.refresh(ref)

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        action="ADD_REFERENCE_RANGE",
        entity_name="REFERENCE_RANGE",
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=ref.id,
        details={"analyte_code": analyte.code, "source": ref.source_authority},
        ip_address=client_ip
    )
    return ref
