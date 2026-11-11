import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(64), index=True, nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, INTERPRET
    entity_name = Column(String(64), index=True, nullable=False)  # PATIENT, ENCOUNTER, LAB_RESULT, USER, MODEL, etc.
    entity_id = Column(String(64), index=True, nullable=True)
    details_json = Column(Text, nullable=True)
    ip_address = Column(String(64), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User")
