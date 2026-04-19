# HealthAI — Full Stack Setup Guide

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.10+ | https://python.org/downloads |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/installer |
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | Comes with Node.js |

---

## 1. MySQL Database Setup

Open MySQL Workbench or run in terminal:

```sql
CREATE DATABASE healthai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 2. Backend Setup (FastAPI)

### Navigate to backend folder
```powershell
cd HealthAI-main\backend
```

### Create & activate Python virtual environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```
> If you get a policy error, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Install dependencies
```powershell
pip install -r requirements.txt
```

### Configure environment variables
Edit `backend\.env` — update your MySQL password:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD   ← change this
DB_NAME=healthai_db

SECRET_KEY=healthai_super_secret_jwt_key_2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

GROK_API_KEY=                     ← optional, for AI chatbot
FRONTEND_URL=http://localhost:5173
```

### Start the backend server
```powershell
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

✅ Backend running at: http://localhost:8000  
✅ API Docs at: http://localhost:8000/docs

### (Optional) Seed demo data
```powershell
python seed.py
```
This creates demo accounts for all roles.

---

## 3. Frontend Setup (React + Vite)

### Navigate to project root
```powershell
cd HealthAI-main
```

### Install dependencies
```powershell
npm install
```

### Start the frontend server
```powershell
npm run dev
```

✅ Frontend running at: http://localhost:5173

---

## 4. Run Both Together (Easiest Way)

From the `HealthAI-main` folder, run the launcher script:

```powershell
.\run.ps1
```

This opens **two terminal windows** automatically:
- 🟢 **Window 1** → FastAPI backend on port 8000
- 🟢 **Window 2** → Vite frontend on port 5173

---

## 5. Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| 🧑 Patient | patient@health.ai | patient123 |
| 👨‍⚕️ Doctor | doctor@health.ai | doctor123 |
| 🛡️ Admin | admin@health.ai | admin123 |
| 💊 Pharmacy | pharmacy@health.ai | pharmacy123 |

Or use **Google Sign-In** directly on the auth page (Firebase Auth).

---

## 6. Project Structure

```
HealthAI-main/
├── backend/                    ← FastAPI Python backend
│   ├── app.py                  ← Main app + CORS + routers
│   ├── models.py               ← SQLAlchemy DB models
│   ├── database.py             ← MySQL connection
│   ├── auth.py                 ← JWT + role-based access
│   ├── schemas.py              ← Pydantic request/response schemas
│   ├── seed.py                 ← Demo data seeder
│   ├── requirements.txt        ← Python dependencies
│   ├── .env                    ← Environment variables
│   └── routes/
│       ├── auth_routes.py      ← /auth/login, /auth/register
│       ├── appointment_routes.py
│       ├── prescription_routes.py  ← pharmacy access control
│       ├── bill_routes.py
│       ├── doctor_routes.py
│       ├── admin_routes.py
│       ├── family_routes.py    ← NEW: family member CRUD
│       └── chatbot_routes.py
│
├── src/                        ← React TypeScript frontend
│   ├── firebase/
│   │   ├── config.ts           ← Firebase Auth + Realtime DB init
│   │   └── firebaseDb.ts       ← Complete RTDB service layer
│   ├── contexts/
│   │   └── AuthContext.tsx     ← Firebase Auth + role sync
│   ├── services/
│   │   └── api.ts              ← FastAPI service layer
│   ├── components/
│   │   ├── auth/AuthPage.tsx   ← Google Sign-In + email/password
│   │   ├── patient/
│   │   │   ├── Prescriptions.tsx   ← Pharmacy access toggle (RTDB)
│   │   │   └── FamilyMembers.tsx   ← Real-time family CRUD (RTDB)
│   │   ├── pharmacy/
│   │   │   └── PharmacyPanel.tsx   ← Live pharmacy queue (RTDB)
│   │   └── layout/Sidebar.tsx
│   └── App.tsx
│
├── firebase/
│   └── database.rules.json    ← RTDB security rules (deploy to Firebase)
└── run.ps1                    ← One-click launcher for both servers
```

---

## 7. Firebase Realtime Database Rules

Go to [Firebase Console](https://console.firebase.google.com) →  
**healthai-f8749** → **Realtime Database** → **Rules** →  
Paste the contents of `firebase/database.rules.json` → **Publish**

---

## 8. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Auth | Firebase Authentication (Email + Google) |
| Real-time DB | Firebase Realtime Database |
| Backend API | FastAPI (Python) |
| SQL Database | MySQL + SQLAlchemy |
| JWT | python-jose |
| AI Chatbot | Grok API (xAI) |
