from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import get_current_user, require_role
import json

router = APIRouter(prefix="/bill", tags=["Bills"])


@router.post("/generate", response_model=schemas.BillOut, status_code=201)
def generate_bill(
    payload: schemas.BillCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("pharmacy", "admin")),
):
    rx = db.query(models.Prescription).filter(models.Prescription.id == payload.prescription_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    # Prevent duplicate bill generation
    existing = db.query(models.Bill).filter(models.Bill.prescription_id == payload.prescription_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bill already generated for this prescription")

    items_json = json.dumps([item.model_dump() for item in payload.items])
    bill = models.Bill(
        prescription_id=payload.prescription_id,
        patient_id=rx.patient_id,
        items_json=items_json,
        total_amount=payload.total_amount,
        status="generated",
    )
    db.add(bill)

    # Update prescription billing status to 'billed'
    rx.billing_status = models.BillingStatusEnum.billed
    db.commit()
    db.refresh(bill)
    return _format_bill(bill)


@router.get("/{patient_id}", response_model=list[schemas.BillOut])
def get_bills(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.id != patient_id and current_user.role.value not in ("admin", "pharmacy"):
        raise HTTPException(status_code=403, detail="Access denied")

    bills = db.query(models.Bill).filter(
        models.Bill.patient_id == patient_id
    ).order_by(models.Bill.created_at.desc()).all()
    return [_format_bill(b) for b in bills]


@router.patch("/{bill_id}/ready")
def mark_bill_ready(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("pharmacy", "admin")),
):
    bill = db.query(models.Bill).filter(models.Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    # Update bill status and prescription billing_status
    bill.status = "ready"
    rx = db.query(models.Prescription).filter(models.Prescription.id == bill.prescription_id).first()
    if rx:
        rx.billing_status = models.BillingStatusEnum.ready
    db.commit()
    return {"message": "Order marked as ready for pickup"}


def _format_bill(bill: models.Bill) -> dict:
    try:
        items = json.loads(bill.items_json)
    except Exception:
        items = []
    return {
        "id": bill.id,
        "prescription_id": bill.prescription_id,
        "patient_id": bill.patient_id,
        "items": items,
        "total_amount": bill.total_amount,
        "status": bill.status,
        "created_at": str(bill.created_at),
    }
