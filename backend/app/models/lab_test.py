import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Float, Integer, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class TestAnalyte(Base):
    __test__ = False
    __tablename__ = "test_analytes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(32), unique=True, index=True, nullable=False)  # e.g., GLU, CREAT, BUN, NA, K, CL, ALT, AST
    name = Column(String(255), nullable=False)  # e.g., Glucose, Serum/Plasma
    category = Column(String(64), nullable=False)  # METABOLIC, RENAL, HEPATIC, LIPID, ELECTROLYTES, CARDIAC, etc.
    default_unit = Column(String(32), nullable=False)  # mg/dL, mmol/L, U/L, g/dL
    loinc_code = Column(String(32), nullable=True)  # e.g., 2345-7
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    reference_ranges = relationship("ReferenceRange", back_populates="analyte", cascade="all, delete-orphan")
    results = relationship("LabResult", back_populates="analyte")


class ReferenceRange(Base):
    __tablename__ = "reference_ranges"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    analyte_id = Column(String(36), ForeignKey("test_analytes.id", ondelete="CASCADE"), index=True, nullable=False)
    biological_sex = Column(String(16), nullable=False, default="ALL")  # ALL, MALE, FEMALE
    min_age_years = Column(Integer, nullable=False, default=0)
    max_age_years = Column(Integer, nullable=False, default=120)
    lower_limit = Column(Float, nullable=False)
    upper_limit = Column(Float, nullable=False)
    critical_low = Column(Float, nullable=True)
    critical_high = Column(Float, nullable=True)
    unit = Column(String(32), nullable=False)
    source_authority = Column(String(255), nullable=False)  # e.g. "Tietz Textbook of Clinical Chemistry, 7th Ed"
    population_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    analyte = relationship("TestAnalyte", back_populates="reference_ranges")
