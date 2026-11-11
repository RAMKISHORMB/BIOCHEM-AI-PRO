import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class BiochemicalCalculationLog(Base):
    __tablename__ = "biochemical_calculation_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="SET NULL"), index=True, nullable=True)
    encounter_id = Column(String(36), ForeignKey("encounters.id", ondelete="SET NULL"), index=True, nullable=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    calculation_type = Column(String(64), index=True, nullable=False)
    formula_name = Column(String(128), nullable=False)
    formula_version = Column(String(32), nullable=False, default="2024.1")
    inputs_json = Column(Text, nullable=False, default="{}")
    outputs_json = Column(Text, nullable=False, default="{}")
    assumptions_json = Column(Text, nullable=False, default="[]")
    warnings_json = Column(Text, nullable=False, default="[]")
    provenance_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("Patient")
    encounter = relationship("Encounter")
    user = relationship("User")
