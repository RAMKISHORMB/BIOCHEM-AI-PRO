from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# --- Single Calculation Requests ---

class DeRitisRequest(BaseModel):
    ast: Optional[float] = Field(None, description="Aspartate aminotransferase in U/L")
    alt: Optional[float] = Field(None, description="Alanine aminotransferase in U/L")
    ast_unit: str = "U/L"
    alt_unit: str = "U/L"
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None

class CorrectedCalciumRequest(BaseModel):
    total_calcium: Optional[float] = Field(None, description="Total serum calcium")
    albumin: Optional[float] = Field(None, description="Serum albumin")
    calcium_unit: str = "mg/dL"
    albumin_unit: str = "g/dL"
    reference_albumin: float = 4.0
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None

class AnionGapRequest(BaseModel):
    na: Optional[float] = Field(None, description="Sodium in mmol/L")
    cl: Optional[float] = Field(None, description="Chloride in mmol/L")
    hco3: Optional[float] = Field(None, description="Bicarbonate in mmol/L")
    unit: str = "mmol/L"
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None

class CorrectedAnionGapRequest(BaseModel):
    na: Optional[float] = Field(None, description="Sodium in mmol/L")
    cl: Optional[float] = Field(None, description="Chloride in mmol/L")
    hco3: Optional[float] = Field(None, description="Bicarbonate in mmol/L")
    albumin: Optional[float] = Field(None, description="Albumin in g/dL")
    electrolyte_unit: str = "mmol/L"
    albumin_unit: str = "g/dL"
    reference_albumin: float = 4.0
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None

class SerumOsmolalityRequest(BaseModel):
    na: Optional[float] = Field(None, description="Sodium in mmol/L")
    glucose: Optional[float] = Field(None, description="Glucose")
    bun: Optional[float] = Field(None, description="BUN")
    na_unit: str = "mmol/L"
    glucose_unit: str = "mg/dL"
    bun_unit: str = "mg/dL"
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None

class OsmolalGapRequest(BaseModel):
    measured_osmolality: Optional[float] = Field(None, description="Measured freezing point osmolality in mOsm/kg")
    calculated_osmolality: Optional[float] = Field(None, description="Calculated serum osmolality in mOsm/kg")
    unit: str = "mOsm/kg"
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None

class BunCreatinineRatioRequest(BaseModel):
    bun: Optional[float] = Field(None, description="Blood urea nitrogen in mg/dL")
    creatinine: Optional[float] = Field(None, description="Serum creatinine in mg/dL")
    bun_unit: str = "mg/dL"
    creatinine_unit: str = "mg/dL"
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None

class EgfrRequest(BaseModel):
    creatinine: Optional[float] = Field(None, description="Serum creatinine in mg/dL")
    age_years: Optional[int] = Field(None, description="Patient age in years (>=18)")
    sex: Optional[str] = Field(None, description="'MALE' or 'FEMALE'")
    creatinine_unit: str = "mg/dL"
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None

class FenaRequest(BaseModel):
    serum_na: Optional[float] = Field(None, description="Serum sodium in mmol/L")
    serum_creat: Optional[float] = Field(None, description="Serum creatinine in mg/dL")
    urine_na: Optional[float] = Field(None, description="Spot urine sodium in mmol/L")
    urine_creat: Optional[float] = Field(None, description="Spot urine creatinine in mg/dL")
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None

class AcidBaseRequest(BaseModel):
    ph: Optional[float] = Field(None, description="Arterial blood pH (7.35 - 7.45)")
    paco2: Optional[float] = Field(None, description="Arterial pCO2 in mmHg (35 - 45)")
    hco3: Optional[float] = Field(None, description="Bicarbonate in mmol/L (22 - 26)")
    na: Optional[float] = Field(None, description="Serum sodium in mmol/L")
    cl: Optional[float] = Field(None, description="Serum chloride in mmol/L")
    albumin: Optional[float] = Field(None, description="Serum albumin in g/dL")
    bicarbonate_source: str = "CALCULATED_ABG"
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None

# --- Standardized Calculation Response ---

class CalculationResponse(BaseModel):
    calculation_type: str
    formula_name: str
    formula_latex: str
    formula_version: str
    inputs: Dict[str, Any]
    output_value: Optional[float]
    output_unit: str
    is_valid: bool
    status: str
    interpretation: Optional[str] = None
    reference_range: Optional[str] = None
    assumptions: List[str] = []
    limitations: List[str] = []
    warnings: List[str] = []
    extra_metrics: Dict[str, Any] = {}
    provenance_hash: str
    calculated_at: str
    disclaimer: str

# --- Profile Response Types ---

class ProfileAnalyteItem(BaseModel):
    analyte_code: str
    analyte_name: str
    value: Optional[float]
    unit: str
    flag: str
    reference_range: Optional[str]
    biochemical_significance: str
    relevant_mechanisms: str
    limitations: str
    references: str

class ProfileResponse(BaseModel):
    profile_type: str
    title: str
    description: str
    patient_id: Optional[str]
    patient_name: Optional[str]
    patient_mrn: Optional[str]
    encounter_id: Optional[str]
    accession_number: Optional[str]
    sample_collected_at: Optional[str]
    specimen_type: Optional[str]
    analytes: List[ProfileAnalyteItem]
    derived_indices: List[CalculationResponse]
    clinical_alerts: List[Dict[str, Any]]
    disclaimer: str
