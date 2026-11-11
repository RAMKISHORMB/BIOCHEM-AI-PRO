from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ReferenceRangeBase(BaseModel):
    biological_sex: str = Field("ALL", pattern="^(ALL|MALE|FEMALE)$")
    min_age_years: int = Field(0, ge=0, le=120)
    max_age_years: int = Field(120, ge=0, le=120)
    lower_limit: float
    upper_limit: float
    critical_low: Optional[float] = None
    critical_high: Optional[float] = None
    unit: str
    source_authority: str
    population_notes: Optional[str] = None

class ReferenceRangeCreate(ReferenceRangeBase):
    pass

class ReferenceRangeResponse(ReferenceRangeBase):
    id: str
    analyte_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class TestAnalyteBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=32)
    name: str = Field(..., min_length=2, max_length=255)
    category: str = Field(..., min_length=2, max_length=64)
    default_unit: str = Field(..., min_length=1, max_length=32)
    loinc_code: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

class TestAnalyteCreate(TestAnalyteBase):
    initial_reference_ranges: Optional[List[ReferenceRangeCreate]] = None

class TestAnalyteResponse(TestAnalyteBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class TestAnalyteWithRangesResponse(TestAnalyteResponse):
    reference_ranges: List[ReferenceRangeResponse] = []
