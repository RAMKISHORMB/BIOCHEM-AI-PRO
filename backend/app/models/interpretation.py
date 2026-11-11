import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class InterpretationReport(Base):
    __tablename__ = "interpretation_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    encounter_id = Column(String(36), ForeignKey("encounters.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    evaluator_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    calculated_indices_json = Column(Text, nullable=False, default="{}")  # JSON: Anion Gap, Osmolar Gap, De Ritis, eGFR, etc.
    clinical_flags_json = Column(Text, nullable=False, default="[]")  # JSON array of identified critical clinical flags
    diagnostic_considerations = Column(Text, nullable=True)
    metabolic_alerts = Column(Text, nullable=True)
    clinician_reviewed = Column(Boolean, default=False, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    encounter = relationship("Encounter", back_populates="interpretation")
    evaluator = relationship("User")
