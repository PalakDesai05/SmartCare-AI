"""
routes/family_routes.py — CRUD for family members linked to a patient user
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import get_current_user
import models

router = APIRouter(prefix="/family", tags=["Family Members"])


class FamilyMemberCreate(BaseModel):
    name:        str
    relation:    str
    age:         int
    phone:       Optional[str] = None
    blood_group: Optional[str] = None


def _fmt(m: models.FamilyMember) -> dict:
    return {
        "id":          m.id,
        "user_id":     m.user_id,
        "name":        m.name,
        "relation":    m.relation,
        "age":         m.age,
        "phone":       m.phone,
        "blood_group": m.blood_group,
        "created_at":  m.created_at.isoformat() if m.created_at else None,
    }


# ── List family members for a patient ─────────────────────────────────────
@router.get("/{user_id}")
def get_family_members(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return all family members belonging to user_id (patient themselves or admin)."""
    if current_user.id != user_id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    members = db.query(models.FamilyMember).filter(
        models.FamilyMember.user_id == user_id
    ).order_by(models.FamilyMember.created_at.desc()).all()

    return [_fmt(m) for m in members]


# ── Add a family member ────────────────────────────────────────────────────
@router.post("/add", status_code=status.HTTP_201_CREATED)
def add_family_member(
    data: FamilyMemberCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Add a new family member linked to the currently authenticated patient."""
    member = models.FamilyMember(
        user_id     = current_user.id,
        name        = data.name,
        relation    = data.relation,
        age         = data.age,
        phone       = data.phone,
        blood_group = data.blood_group,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return _fmt(member)


# ── Delete a family member ─────────────────────────────────────────────────
@router.delete("/{member_id}", status_code=status.HTTP_200_OK)
def remove_family_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete one family member. Only the owner (or admin) can delete."""
    member = db.query(models.FamilyMember).filter(
        models.FamilyMember.id == member_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")

    if member.user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorised to delete this member")

    db.delete(member)
    db.commit()
    return {"message": "Family member removed", "id": member_id}
