from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from database import engine, Base
import models  # noqa: F401 — ensures all models are registered before create_all

from routes.auth_routes        import router as auth_router
from routes.appointment_routes import router as appointment_router
from routes.prescription_routes import router as prescription_router
from routes.bill_routes        import router as bill_router
from routes.chatbot_routes     import router as chatbot_router
from routes.doctor_routes      import router as doctor_router
from routes.admin_routes       import router as admin_router
from routes.family_routes      import router as family_router

load_dotenv()

# ─── Create all tables on startup ───────────────────────────
Base.metadata.create_all(bind=engine)

# ─── FastAPI App ─────────────────────────────────────────────
app = FastAPI(
    title="HealthAI Backend",
    description="Smart AI-Based Healthcare Management System — Python FastAPI Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS (allow React frontend) ─────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ────────────────────────────────────────
app.include_router(auth_router)
app.include_router(appointment_router)
app.include_router(prescription_router)
app.include_router(bill_router)
app.include_router(chatbot_router)
app.include_router(doctor_router)
app.include_router(admin_router)
app.include_router(family_router)


# ─── Root Health Check ────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "message": "HealthAI Backend is running!",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
