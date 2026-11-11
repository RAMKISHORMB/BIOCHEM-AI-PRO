import random
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientUpdate

def calculate_age_years(born: date) -> int:
    """Calculate age in complete solar years from birth date."""
    today = date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))

def generate_mrn(db: Session) -> str:
    """Generate a unique compliant MRN: MRN-YYYY-XXXXX."""
    year = date.today().year
    for _ in range(10):
        candidate = f"MRN-{year}-{random.randint(10000, 99999)}"
        if not db.query(Patient).filter(Patient.mrn == candidate).first():
            return candidate
    return f"MRN-{year}-{int(datetime.utcnow().timestamp())}"

def create_patient(db: Session, data: PatientCreate) -> Patient:
    patient = Patient(
        mrn=data.mrn.upper().strip(),
        full_name=data.full_name.strip(),
        date_of_birth=data.date_of_birth,
        biological_sex=data.biological_sex.upper(),
        blood_group=data.blood_group.upper() if data.blood_group else None,
        phone=data.phone.strip() if data.phone else None,
        email=data.email.lower() if data.email else None,
        address=data.address.strip() if data.address else None,
        medical_history=data.medical_history.strip() if data.medical_history else None,
        known_allergies=data.known_allergies.strip() if data.known_allergies else None,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient

def list_patients(
    db: Session,
    search: str = "",
    skip: int = 0,
    limit: int = 50
) -> tuple[int, list[Patient]]:
    query = db.query(Patient)
    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Patient.mrn.ilike(search_filter),
                Patient.full_name.ilike(search_filter),
                Patient.phone.ilike(search_filter),
                Patient.email.ilike(search_filter),
            )
        )
    total = query.count()
    items = query.order_by(Patient.created_at.desc()).offset(skip).limit(limit).all()
    return total, items
