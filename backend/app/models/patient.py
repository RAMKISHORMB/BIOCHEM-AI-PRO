import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Date, Text, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mrn = Column(String(64), unique=True, index=True, nullable=False)  # Medical Record Number
    full_name = Column(String(255), index=True, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    biological_sex = Column(String(16), nullable=False)  # MALE, FEMALE, INTERSEX
    blood_group = Column(String(8), nullable=True)  # A+, B+, AB+, O+, etc.
    phone = Column(String(32), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(String(512), nullable=True)
    medical_history = Column(Text, nullable=True)
    known_allergies = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    encounters = relationship("Encounter", back_populates="patient", cascade="all, delete-orphan")

    @property
    def age_years(self) -> int:
        """Calculate age in complete solar years from birth date."""
        today = date.today()
        return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))

