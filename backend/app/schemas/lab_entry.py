from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class LabResultEntry(BaseModel):
    analyte_id: str
    analyte_code: str
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None
    unit: str
    notes: Optional[str] = None

class EncounterCreate(BaseModel):
    patient_id: str
    accession_number: Optional[str] = None
    sample_collected_at: datetime = Field(default_factory=datetime.utcnow)
    sample_received_at: datetime = Field(default_factory=datetime.utcnow)
    sample_type: str = Field("SERUM", pattern="^(SERUM|PLASMA|WHOLE_BLOOD|URINE|CSF)$")
    fasting_status: str = Field("FASTING", pattern="^(FASTING|RANDOM|POSTPRANDIAL)$")
    clinical_notes: Optional[str] = None
    results: List[LabResultEntry]

class LabResultResponse(BaseModel):
    id: str
    analyte_id: str
    analyte_code: str
    analyte_name: str
    category: str
    value_numeric: Optional[float]
    value_text: Optional[str]
    unit: str
    flag: str  # NORMAL, LOW, HIGH, CRITICAL_LOW, CRITICAL_HIGH
    reference_range_applied: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class InterpretationReportResponse(BaseModel):
    id: str
    encounter_id: str
    calculated_indices: Dict[str, Any]
    clinical_flags: List[Dict[str, Any]]
    diagnostic_considerations: Optional[str]
    metabolic_alerts: Optional[str]
    clinician_reviewed: bool
    reviewed_at: Optional[datetime]
    created_at: datetime

class EncounterResponse(BaseModel):
    id: str
    patient_id: str
    patient_mrn: str
    patient_name: str
    accession_number: str
    sample_collected_at: datetime
    sample_received_at: datetime
    sample_type: str
    clinical_status: str
    fasting_status: str
    clinical_notes: Optional[str]
    results_count: int
    critical_flags_count: int
    created_at: datetime

class EncounterDetailResponse(BaseModel):
    id: str
    patient_id: str
    patient_mrn: str
    patient_name: str
    patient_sex: str
    patient_age_years: int
    accession_number: str
    sample_collected_at: datetime
    sample_received_at: datetime
    sample_type: str
    clinical_status: str
    fasting_status: str
    clinical_notes: Optional[str]
    results: List[LabResultResponse]
    interpretation: Optional[InterpretationReportResponse] = None
    created_at: datetime
