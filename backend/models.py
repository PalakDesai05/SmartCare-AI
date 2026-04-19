from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum


class RoleEnum(str, enum.Enum):
    patient  = "patient"
    doctor   = "doctor"
    admin    = "admin"
    pharmacy = "pharmacy"


class StatusEnum(str, enum.Enum):
    scheduled   = "scheduled"
    in_progress = "in-progress"
    completed   = "completed"
    cancelled   = "cancelled"


class BillingStatusEnum(str, enum.Enum):
    pending = "pending"
    billed  = "billed"
    ready   = "ready"


# ─────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(150), nullable=False)
    email           = Column(String(150), unique=True, index=True, nullable=False)
    phone           = Column(String(20), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(Enum(RoleEnum), default=RoleEnum.patient, nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow)

    appointments   = relationship("Appointment", back_populates="patient", foreign_keys="Appointment.patient_id")
    prescriptions  = relationship("Prescription", back_populates="patient")
    bills          = relationship("Bill", back_populates="patient")
    ratings_given  = relationship("Rating", back_populates="patient")
    family_members = relationship("FamilyMember", back_populates="user")


# ─────────────────────────────────────────────
# DOCTOR
# ─────────────────────────────────────────────
class Doctor(Base):
    __tablename__ = "doctors"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=False)
    specialization   = Column(String(150), nullable=False)
    experience_years = Column(Integer, default=0)
    location         = Column(String(200), nullable=True)
    fee              = Column(Float, default=0.0)
    rating           = Column(Float, default=0.0)
    available        = Column(Integer, default=1)  # 1 = available

    user          = relationship("User")
    appointments  = relationship("Appointment", back_populates="doctor")
    prescriptions = relationship("Prescription", back_populates="doctor")
    ratings       = relationship("Rating", back_populates="doctor")


# ─────────────────────────────────────────────
# APPOINTMENT
# ─────────────────────────────────────────────
class Appointment(Base):
    __tablename__ = "appointments"

    id           = Column(Integer, primary_key=True, index=True)
    patient_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id    = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    date         = Column(String(20), nullable=False)
    time         = Column(String(20), nullable=False)
    token_number = Column(Integer, nullable=True)
    type         = Column(String(150), default="General Consultation")
    status       = Column(Enum(StatusEnum), default=StatusEnum.scheduled)
    created_at   = Column(DateTime, default=datetime.utcnow)

    patient      = relationship("User", back_populates="appointments", foreign_keys=[patient_id])
    doctor       = relationship("Doctor", back_populates="appointments")
    prescription = relationship("Prescription", back_populates="appointment", uselist=False)


# ─────────────────────────────────────────────
# PRESCRIPTION
# ─────────────────────────────────────────────
class Prescription(Base):
    __tablename__ = "prescriptions"

    id              = Column(Integer, primary_key=True, index=True)
    appointment_id  = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    doctor_id       = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    patient_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    diagnosis       = Column(String(300), nullable=False)
    medicines       = Column(Text, nullable=False)  # JSON string
    notes           = Column(Text, nullable=True)
    billing_status  = Column(Enum(BillingStatusEnum), default=BillingStatusEnum.pending)
    pharmacy_access = Column(Integer, default=0)   # 0 = denied, 1 = granted by patient
    created_at      = Column(DateTime, default=datetime.utcnow)

    appointment = relationship("Appointment", back_populates="prescription")
    doctor      = relationship("Doctor", back_populates="prescriptions")
    patient     = relationship("User", back_populates="prescriptions")
    bill        = relationship("Bill", back_populates="prescription", uselist=False)


# ─────────────────────────────────────────────
# BILL
# ─────────────────────────────────────────────
class Bill(Base):
    __tablename__ = "bills"

    id              = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=False)
    patient_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    items_json      = Column(Text, nullable=False)   # JSON: [{name, qty, price, total}]
    total_amount    = Column(Float, nullable=False, default=0.0)
    status          = Column(String(50), default="generated")
    created_at      = Column(DateTime, default=datetime.utcnow)

    prescription = relationship("Prescription", back_populates="bill")
    patient      = relationship("User", back_populates="bills")


# ─────────────────────────────────────────────
# RATING
# ─────────────────────────────────────────────
class Rating(Base):
    __tablename__ = "ratings"

    id         = Column(Integer, primary_key=True, index=True)
    doctor_id  = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating     = Column(Float, nullable=False)
    review     = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    doctor  = relationship("Doctor", back_populates="ratings")
    patient = relationship("User", back_populates="ratings_given")


# ─────────────────────────────────────────────
# FAMILY MEMBER
# ─────────────────────────────────────────────
class FamilyMember(Base):
    __tablename__ = "family_members"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    name        = Column(String(150), nullable=False)
    relation    = Column(String(50), nullable=False)   # Spouse, Child, Parent, etc.
    age         = Column(Integer, nullable=False)
    phone       = Column(String(20), nullable=True)
    blood_group = Column(String(10), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="family_members")
