from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import get_current_user, require_role

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get("/", response_model=list[schemas.DoctorOut])
def list_doctors(db: Session = Depends(get_db)):
    return db.query(models.Doctor).all()


@router.get("/{doctor_id}", response_model=schemas.DoctorOut)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doc


@router.post("/", response_model=schemas.DoctorOut, status_code=201)
def create_doctor_profile(
    payload: schemas.DoctorCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    existing = db.query(models.Doctor).filter(models.Doctor.user_id == payload.user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Doctor profile already exists for this user")

    doctor = models.Doctor(**payload.model_dump())
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


@router.patch("/{doctor_id}/availability")
def toggle_availability(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin", "doctor")),
):
    doc = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doc.available = 0 if doc.available == 1 else 1
    db.commit()
    return {"doctor_id": doctor_id, "available": bool(doc.available)}


@router.post("/{doctor_id}/rate")
def rate_doctor(
    doctor_id: int,
    payload: schemas.RatingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("patient")),
):
    doc = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")

    rating = models.Rating(
        doctor_id=doctor_id,
        patient_id=current_user.id,
        rating=payload.rating,
        review=payload.review,
    )
    db.add(rating)

    # Recalculate average rating
    all_ratings = db.query(models.Rating).filter(models.Rating.doctor_id == doctor_id).all()
    doc.rating = round(
        (sum(r.rating for r in all_ratings) + payload.rating) / (len(all_ratings) + 1),
        1
    )
    db.commit()
    return {"message": "Rating submitted", "new_avg": doc.rating}
