from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import date, datetime

class PatientBase(BaseModel):
    mrn: str = Field(..., min_length=3, max_length=64, description="Unique Medical Record Number")
    full_name: str = Field(..., min_length=2, max_length=255)
    date_of_birth: date
    biological_sex: str = Field(..., pattern="^(MALE|FEMALE|INTERSEX)$")
    blood_group: Optional[str] = Field(None, pattern="^(A|B|AB|O)[+-]$")
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None
    known_allergies: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    biological_sex: Optional[str] = Field(None, pattern="^(MALE|FEMALE|INTERSEX)$")
    blood_group: Optional[str] = Field(None, pattern="^(A|B|AB|O)[+-]$")
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None
    known_allergies: Optional[str] = None

class PatientResponse(PatientBase):
    id: str
    age_years: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PatientListResponse(BaseModel):
    total: int
    items: List[PatientResponse]
