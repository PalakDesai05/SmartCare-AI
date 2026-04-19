from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum


# ─────────────────────────── ENUMS ───────────────────────────

class RoleEnum(str, Enum):
    patient = "patient"
    doctor = "doctor"
    admin = "admin"
    pharmacy = "pharmacy"


class StatusEnum(str, Enum):
    scheduled = "scheduled"
    in_progress = "in-progress"
    completed = "completed"
    cancelled = "cancelled"


class BillingStatusEnum(str, Enum):
    pending = "pending"
    billed = "billed"
    ready = "ready"


# ─────────────────────────── AUTH ───────────────────────────

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: RoleEnum = RoleEnum.patient


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    user_id: int


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    role: str

    class Config:
        from_attributes = True


# ─────────────────────────── DOCTOR ───────────────────────────

class DoctorCreate(BaseModel):
    user_id: int
    specialization: str
    experience_years: int = 0
    location: Optional[str] = None
    fee: float = 0.0


class DoctorOut(BaseModel):
    id: int
    specialization: str
    experience_years: int
    location: Optional[str]
    fee: float
    rating: float
    available: int
    user: UserOut

    class Config:
        from_attributes = True


# ─────────────────────────── APPOINTMENT ───────────────────────────

class AppointmentCreate(BaseModel):
    doctor_id: int
    date: str
    time: str
    type: Optional[str] = "General Consultation"


class AppointmentStatusUpdate(BaseModel):
    status: StatusEnum


class AppointmentOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    date: str
    time: str
    token_number: Optional[int]
    type: str
    status: str

    class Config:
        from_attributes = True


# ─────────────────────────── PRESCRIPTION ───────────────────────────

class PrescriptionCreate(BaseModel):
    appointment_id: Optional[int] = None
    patient_id: int
    diagnosis: str
    medicines: List[str]
    notes: Optional[str] = None


class PrescriptionOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    diagnosis: str
    medicines: List[str]
    notes: Optional[str]
    billing_status: str
    created_at: str

    class Config:
        from_attributes = True


# ─────────────────────────── BILL ───────────────────────────

class BillItem(BaseModel):
    name: str
    quantity: int
    price: float
    total: float


class BillCreate(BaseModel):
    prescription_id: int
    items: List[BillItem]
    total_amount: float


class BillOut(BaseModel):
    id: int
    prescription_id: int
    patient_id: int
    items: List[BillItem]
    total_amount: float
    status: str
    created_at: str

    class Config:
        from_attributes = True


# ─────────────────────────── CHATBOT ───────────────────────────

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None  # optional system context


class ChatResponse(BaseModel):
    reply: str


# ─────────────────────────── RATING ───────────────────────────

class RatingCreate(BaseModel):
    doctor_id: int
    rating: float
    review: Optional[str] = None
