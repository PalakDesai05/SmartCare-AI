"""
Seed script — run once to populate sample data.
Usage: python seed.py
"""
from database import SessionLocal, engine, Base
import models
from auth import hash_password
import json

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def seed():
    # ── Users ────────────────────────────────────────────────
    users_data = [
        {"name": "Admin User",         "email": "admin@health.ai",    "role": models.RoleEnum.admin,    "password": "admin123"},
        {"name": "Dr. Ananya Sharma",  "email": "doctor@health.ai",   "role": models.RoleEnum.doctor,   "password": "doctor123"},
        {"name": "Ravi Kumar",         "email": "patient@health.ai",  "role": models.RoleEnum.patient,  "password": "patient123"},
        {"name": "City Pharmacy",      "email": "pharmacy@health.ai", "role": models.RoleEnum.pharmacy, "password": "pharmacy123"},
        {"name": "Dr. Rahul Mehta",    "email": "doctor2@health.ai",  "role": models.RoleEnum.doctor,   "password": "doctor123"},
    ]

    created_users = {}
    for u in users_data:
        existing = db.query(models.User).filter(models.User.email == u["email"]).first()
        if not existing:
            user = models.User(
                name=u["name"],
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
                phone="9999999999",
            )
            db.add(user)
            db.flush()
            created_users[u["email"]] = user
        else:
            created_users[u["email"]] = existing

    db.commit()
    print("[OK] Users seeded")

    # ── Doctors ──────────────────────────────────────────────
    doctors_data = [
        {
            "user_email": "doctor@health.ai",
            "specialization": "Cardiologist",
            "experience_years": 14,
            "location": "Block A, Room 204",
            "fee": 800.0,
            "rating": 4.9,
        },
        {
            "user_email": "doctor2@health.ai",
            "specialization": "Neurologist",
            "experience_years": 10,
            "location": "Block B, Room 108",
            "fee": 1000.0,
            "rating": 4.7,
        },
    ]

    created_doctors = {}
    for d in doctors_data:
        user = created_users.get(d["user_email"])
        if user:
            existing = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
            if not existing:
                doc = models.Doctor(
                    user_id=user.id,
                    specialization=d["specialization"],
                    experience_years=d["experience_years"],
                    location=d["location"],
                    fee=d["fee"],
                    rating=d["rating"],
                    available=1,
                )
                db.add(doc)
                db.flush()
                created_doctors[d["user_email"]] = doc
            else:
                created_doctors[d["user_email"]] = existing

    db.commit()
    print("[OK] Doctors seeded")

    # ── Sample Appointment ───────────────────────────────────
    patient = created_users.get("patient@health.ai")
    doctor  = created_doctors.get("doctor@health.ai")

    if patient and doctor:
        existing_appt = db.query(models.Appointment).filter(
            models.Appointment.patient_id == patient.id
        ).first()
        if not existing_appt:
            appt = models.Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                date="2026-04-20",
                time="11:00 AM",
                token_number=1,
                type="Cardiac Check-up",
                status=models.StatusEnum.scheduled,
            )
            db.add(appt)
            db.flush()

            # ── Sample Prescription ──────────────────────────
            rx = models.Prescription(
                appointment_id=appt.id,
                doctor_id=doctor.id,
                patient_id=patient.id,
                diagnosis="Hypertension & Mild Dyslipidemia",
                medicines=json.dumps(["Atorvastatin 20mg", "Aspirin 75mg", "Metoprolol 25mg"]),
                notes="Take after meals. Avoid alcohol.",
                billing_status=models.BillingStatusEnum.pending,
            )
            db.add(rx)
            db.flush()
            db.commit()
            print("[OK] Sample appointment + prescription seeded")
        else:
            print("[SKIP] Appointment already exists, skipping")

    print("\n[DONE] All seed data ready!")
    print("   Login: patient@health.ai / patient123")
    print("   Login: doctor@health.ai  / doctor123")
    print("   Login: admin@health.ai   / admin123")
    print("   Login: pharmacy@health.ai / pharmacy123")


if __name__ == "__main__":
    seed()
    db.close()
