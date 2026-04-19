"""
routes/prescription_routes.py — Full prescription management with pharmacy access control
"""
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from auth import get_current_user, require_role
import models

router = APIRouter(prefix="/prescription", tags=["Prescriptions"])


class PrescriptionCreate(BaseModel):
    appointment_id: Optional[int] = None
    patient_id: int
    diagnosis: str
    medicines: List[str]
    notes: Optional[str] = None


def _format_rx(rx: models.Prescription) -> dict:
    try:
        medicines = json.loads(rx.medicines)
    except Exception:
        medicines = [rx.medicines]

    return {
        "id":              rx.id,
        "appointment_id":  rx.appointment_id,
        "patient_id":      rx.patient_id,
        "doctor_id":       rx.doctor_id,
        "diagnosis":       rx.diagnosis,
        "medicines":       medicines,
        "notes":           rx.notes,
        "billing_status":  rx.billing_status.value if hasattr(rx.billing_status, "value") else rx.billing_status,
        "pharmacy_access": bool(rx.pharmacy_access),
        "created_at":      rx.created_at.isoformat() if rx.created_at else None,
        "doctor": {
            "id":   rx.doctor.id,
            "user": {"id": rx.doctor.user.id, "name": rx.doctor.user.name},
        } if rx.doctor else None,
        "patient": {"id": rx.patient.id, "name": rx.patient.name} if rx.patient else None,
    }


# ── Upload Prescription (Doctor only) ──────────────────────────────────────
@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_prescription(
    data: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("doctor")),
):
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    patient = db.query(models.User).filter(models.User.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    rx = models.Prescription(
        appointment_id  = data.appointment_id,
        doctor_id       = doctor.id,
        patient_id      = data.patient_id,
        diagnosis       = data.diagnosis,
        medicines       = json.dumps(data.medicines),
        notes           = data.notes,
        billing_status  = models.BillingStatusEnum.pending,
        pharmacy_access = 0,   # patient must explicitly grant
    )
    db.add(rx)
    db.commit()
    db.refresh(rx)
    return {"id": rx.id, "message": "Prescription uploaded.", "pharmacy_access": False}


# ── Get Patient's Own Prescriptions ───────────────────────────────────────
@router.get("/{patient_id}")
def get_prescriptions(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.id != patient_id and current_user.role.value not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    rxs = db.query(models.Prescription).filter(
        models.Prescription.patient_id == patient_id
    ).order_by(models.Prescription.created_at.desc()).all()

    return [_format_rx(r) for r in rxs]


# ── Pharmacy: view only permitted prescriptions ────────────────────────────
@router.get("/pharmacy/pending")
def get_pharmacy_prescriptions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("pharmacy", "admin")),
):
    """Returns only prescriptions where pharmacy_access == 1 (patient granted)."""
    rxs = db.query(models.Prescription).filter(
        models.Prescription.pharmacy_access == 1
    ).order_by(models.Prescription.created_at.desc()).all()
    return [_format_rx(r) for r in rxs]


# ── Grant Pharmacy Access (Patient only) ──────────────────────────────────
@router.patch("/{prescription_id}/grant-access")
def grant_pharmacy_access(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Patient grants the pharmacy permission to view their prescription."""
    rx = db.query(models.Prescription).filter(
        models.Prescription.id == prescription_id,
        models.Prescription.patient_id == current_user.id,
    ).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found or not yours")
    rx.pharmacy_access = 1
    db.commit()
    return {"message": "Pharmacy access granted", "pharmacy_access": True}


# ── Revoke Pharmacy Access (Patient only) ─────────────────────────────────
@router.patch("/{prescription_id}/revoke-access")
def revoke_pharmacy_access(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Patient revokes pharmacy access from their prescription."""
    rx = db.query(models.Prescription).filter(
        models.Prescription.id == prescription_id,
        models.Prescription.patient_id == current_user.id,
    ).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found or not yours")
    rx.pharmacy_access = 0
    db.commit()
    return {"message": "Pharmacy access revoked", "pharmacy_access": False}


# ── Update Billing Status (Pharmacy / Admin only) ─────────────────────────
@router.patch("/{prescription_id}/status")
def update_billing_status(
    prescription_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("pharmacy", "admin")),
):
    rx = db.query(models.Prescription).filter(
        models.Prescription.id == prescription_id
    ).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    new_status = payload.get("status", "pending")
    try:
        rx.billing_status = models.BillingStatusEnum(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid billing status: {new_status}")

    db.commit()
    return {"message": f"Billing status updated to {new_status}"}
