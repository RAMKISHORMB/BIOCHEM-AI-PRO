import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Encounter(Base):
    __tablename__ = "encounters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False)
    technician_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    accession_number = Column(String(64), unique=True, index=True, nullable=False)
    sample_collected_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    sample_received_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    sample_type = Column(String(32), nullable=False, default="SERUM")  # SERUM, PLASMA, WHOLE_BLOOD, URINE, CSF
    clinical_status = Column(String(32), nullable=False, default="COMPLETED")  # PENDING, IN_PROGRESS, COMPLETED, AMENDED
    fasting_status = Column(String(32), nullable=False, default="RANDOM")  # FASTING, RANDOM, POSTPRANDIAL
    clinical_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="encounters")
    technician = relationship("User")
    results = relationship("LabResult", back_populates="encounter", cascade="all, delete-orphan")
    interpretation = relationship("InterpretationReport", back_populates="encounter", uselist=False, cascade="all, delete-orphan")
