# HealthAI Backend — Python FastAPI

A complete REST API backend for the **Smart AI-Based Healthcare Management System**, built with **FastAPI + MySQL + Grok AI**.

---

## 📁 Project Structure

```
backend/
├── app.py                    # Main FastAPI application
├── database.py               # DB engine & session
├── models.py                 # SQLAlchemy ORM models
├── schemas.py                # Pydantic request/response schemas
├── auth.py                   # JWT auth + password hashing + RBAC
├── seed.py                   # Seed script (sample data)
├── setup.sql                 # MySQL DB creation script
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variable template
└── routes/
    ├── auth_routes.py        # POST /auth/register, /auth/login
    ├── appointment_routes.py # Appointment CRUD + queue
    ├── prescription_routes.py# Upload + fetch prescriptions
    ├── bill_routes.py        # Generate bill + mark ready
    ├── chatbot_routes.py     # Grok AI chatbot
    ├── doctor_routes.py      # Doctor listing + rating
    └── admin_routes.py       # Admin stats + user management
```

---

## ⚡ Quick Start

### 1. Install MySQL and create database
```sql
CREATE DATABASE healthai_db;
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your MySQL password and Grok API key
```

### 3. Create Python virtual environment
```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
```

### 5. Seed sample data
```bash
python seed.py
```

### 6. Start the backend server
```bash
uvicorn app:app --reload --port 8000
```

### 7. Open interactive API docs
```
http://localhost:8000/docs
```

---

## 🔑 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT token |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/appointments/book` | Book appointment (patient) |
| GET | `/appointments/user/{id}` | Get patient appointments |
| GET | `/appointments/doctor/{id}` | Get doctor appointments |
| PATCH | `/appointments/{id}/status` | Update status (doctor/admin) |
| GET | `/appointments/queue/{doctor_id}` | View live queue |

### Prescriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/prescription/upload` | Doctor uploads prescription |
| GET | `/prescription/{patient_id}` | Get patient prescriptions |
| GET | `/prescription/pharmacy/pending` | Pharmacy sees all prescriptions |
| PATCH | `/prescription/{id}/status` | Update billing status |

### Bills
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bill/generate` | Pharmacy generates bill |
| GET | `/bill/{patient_id}` | Patient views bills |
| PATCH | `/bill/{id}/ready` | Mark order as ready |

### Chatbot (Grok AI)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chatbot/ask` | Ask the AI chatbot |
| POST | `/chatbot/ask/smart` | Smart chatbot with live DB context |

### Doctors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/doctors/` | List all doctors |
| POST | `/doctors/` | Add doctor (admin) |
| PATCH | `/doctors/{id}/availability` | Toggle availability |
| POST | `/doctors/{id}/rate` | Rate a doctor |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats` | System dashboard stats |
| GET | `/admin/users` | List all users |
| DELETE | `/admin/users/{id}` | Delete user |

---

## 🤖 Grok Chatbot Setup

1. Get your API key from **https://console.x.ai/**
2. Add to `.env`:
   ```
   GROK_API_KEY=your_key_here
   ```
3. Use `/chatbot/ask/smart` for system-aware responses

---

## 🔐 Security

- All passwords hashed with **bcrypt**
- JWT tokens with expiry
- Role-Based Access Control (RBAC): `patient | doctor | admin | pharmacy`
- API keys stored in `.env` (never in source code)
- `.env` is in `.gitignore`

---

## 🗄️ Database Schema

```
users ──< appointments >── doctors
users ──< prescriptions >── doctors
prescriptions ──< bills
doctors ──< ratings >── users
```

---

## 💡 Demo Credentials (after running seed.py)

| Role | Email | Password |
|------|-------|----------|
| Patient | patient@health.ai | patient123 |
| Doctor | doctor@health.ai | doctor123 |
| Admin | admin@health.ai | admin123 |
| Pharmacy | pharmacy@health.ai | pharmacy123 |
