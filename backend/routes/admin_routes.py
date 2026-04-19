from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
from auth import require_role

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
def get_system_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    total_doctors  = db.query(models.Doctor).count()
    total_patients = db.query(models.User).filter(models.User.role == models.RoleEnum.patient).count()
    total_appts    = db.query(models.Appointment).count()
    total_bills    = db.query(models.Bill).count()
    total_revenue  = db.query(models.Bill).with_entities(
        models.Bill.total_amount
    ).all()
    revenue_sum = sum(r[0] for r in total_revenue)

    active_doctors = db.query(models.Doctor).filter(models.Doctor.available == 1).count()

    return {
        "total_doctors": total_doctors,
        "active_doctors": active_doctors,
        "total_patients": total_patients,
        "total_appointments": total_appts,
        "total_bills": total_bills,
        "total_revenue": round(revenue_sum, 2),
    }


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    users = db.query(models.User).all()
    return [
        {"id": u.id, "name": u.name, "email": u.email, "role": u.role.value, "phone": u.phone}
        for u in users
    ]


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": f"User {user_id} deleted"}
