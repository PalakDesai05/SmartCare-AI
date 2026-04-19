from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import get_current_user, require_role
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

GROK_API_URL = os.getenv("GROK_API_URL", "https://api.x.ai/v1/chat/completions")
GROK_API_KEY = os.getenv("GROK_API_KEY", "")
GROK_MODEL   = os.getenv("GROK_MODEL", "grok-beta")

SYSTEM_PROMPT = """You are HealthAI Assistant, an intelligent medical chatbot embedded in a Smart AI-Based Healthcare Management System.

You help patients with:
- Finding the right doctor/specialization for their symptoms
- Explaining how to book appointments
- Answering general health questions in simple language
- Explaining prescription medicines and their purpose
- Explaining queue/token system
- Providing first-aid guidance for common conditions

IMPORTANT RULES:
1. Always recommend seeing a doctor for serious symptoms
2. Never diagnose or prescribe medication directly
3. Be empathetic, clear, and concise
4. Keep answers short (2-4 sentences unless more detail is truly needed)
5. Use simple, non-technical language
"""


@router.post("/ask", response_model=schemas.ChatResponse)
async def ask_chatbot(
    payload: schemas.ChatRequest,
    current_user: models.User = Depends(get_current_user),
):
    if not GROK_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Chatbot service unavailable: GROK_API_KEY not configured"
        )

    # Build messages list with optional system context
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if payload.context:
        messages.append({
            "role": "system",
            "content": f"Additional context about this user: {payload.context}"
        })

    messages.append({"role": "user", "content": payload.message})

    headers = {
        "Authorization": f"Bearer {GROK_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": GROK_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 500,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(GROK_API_URL, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()
            reply = data["choices"][0]["message"]["content"]
            return schemas.ChatResponse(reply=reply)

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Grok API error: {e.response.text}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Could not reach Grok API: {str(e)}")
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail="Unexpected response format from Grok API")


@router.post("/ask/smart", response_model=schemas.ChatResponse)
async def ask_chatbot_smart(
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Smart chatbot endpoint: automatically injects live system context
    (doctor list, appointment queue, patient prescriptions) before calling Grok.
    """
    # Build live context from DB
    doctors = db.query(models.Doctor).join(models.User).filter(
        models.Doctor.available == 1
    ).limit(10).all()

    doctor_list = ", ".join(
        [f"{d.user.name} ({d.specialization})" for d in doctors]
    ) if doctors else "No doctors available"

    prescriptions = db.query(models.Prescription).filter(
        models.Prescription.patient_id == current_user.id
    ).order_by(models.Prescription.created_at.desc()).limit(3).all()

    rx_info = "; ".join([p.diagnosis for p in prescriptions]) if prescriptions else "None"

    appointments = db.query(models.Appointment).filter(
        models.Appointment.patient_id == current_user.id,
        models.Appointment.status == models.StatusEnum.scheduled,
    ).limit(3).all()

    appt_info = "; ".join(
        [f"Token #{a.token_number} with Dr.{a.doctor_id} on {a.date}" for a in appointments]
    ) if appointments else "None"

    system_context = (
        f"Available doctors: {doctor_list}. "
        f"Patient's active prescriptions: {rx_info}. "
        f"Upcoming appointments: {appt_info}."
    )

    smart_payload = schemas.ChatRequest(
        message=payload.message,
        context=system_context
    )
    return await ask_chatbot(smart_payload, current_user=current_user)
