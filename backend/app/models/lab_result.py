import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    encounter_id = Column(String(36), ForeignKey("encounters.id", ondelete="CASCADE"), index=True, nullable=False)
    analyte_id = Column(String(36), ForeignKey("test_analytes.id"), index=True, nullable=False)
    value_numeric = Column(Float, nullable=True)
    value_text = Column(String(255), nullable=True)
    unit = Column(String(32), nullable=False)
    flag = Column(String(32), nullable=False, default="NORMAL")  # NORMAL, LOW, HIGH, CRITICAL_LOW, CRITICAL_HIGH
    reference_range_applied = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    encounter = relationship("Encounter", back_populates="results")
    analyte = relationship("TestAnalyte", back_populates="results")
