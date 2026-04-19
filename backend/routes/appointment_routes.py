from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import get_current_user, require_role
import random

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.post("/book", response_model=schemas.AppointmentOut, status_code=201)
def book_appointment(
    payload: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("patient")),
):
    doctor = db.query(models.Doctor).filter(models.Doctor.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Auto-generate a queue token number
    existing_tokens = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == payload.doctor_id,
        models.Appointment.date == payload.date,
    ).count()
    token = existing_tokens + 1

    appointment = models.Appointment(
        patient_id=current_user.id,
        doctor_id=payload.doctor_id,
        date=payload.date,
        time=payload.time,
        token_number=token,
        type=payload.type,
        status=models.StatusEnum.scheduled,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.get("/user/{patient_id}", response_model=list[schemas.AppointmentOut])
def get_patient_appointments(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.id != patient_id and current_user.role.value not in ("admin", "doctor"):
        raise HTTPException(status_code=403, detail="Access denied")

    return db.query(models.Appointment).filter(
        models.Appointment.patient_id == patient_id
    ).order_by(models.Appointment.created_at.desc()).all()


@router.get("/doctor/{doctor_id}", response_model=list[schemas.AppointmentOut])
def get_doctor_appointments(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("doctor", "admin")),
):
    return db.query(models.Appointment).filter(
        models.Appointment.doctor_id == doctor_id
    ).order_by(models.Appointment.date, models.Appointment.token_number).all()


@router.patch("/{appointment_id}/status", response_model=schemas.AppointmentOut)
def update_appointment_status(
    appointment_id: int,
    payload: schemas.AppointmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("doctor", "admin")),
):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = payload.status
    db.commit()
    db.refresh(appt)
    return appt


@router.get("/queue/{doctor_id}")
def get_queue(doctor_id: int, date: str, db: Session = Depends(get_db)):
    """Returns queue tokens for a doctor on a given date."""
    appointments = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == doctor_id,
        models.Appointment.date == date,
        models.Appointment.status != models.StatusEnum.cancelled,
    ).order_by(models.Appointment.token_number).all()

    return [
        {
            "token": a.token_number,
            "patient_id": a.patient_id,
            "time": a.time,
            "status": a.status.value,
        }
        for a in appointments
    ]
