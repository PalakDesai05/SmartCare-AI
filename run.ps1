# HealthAI — Start Both Servers
# Usage: Right-click → Run with PowerShell  OR  run in terminal: .\run.ps1

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir  = Join-Path $projectRoot "backend"
$frontendDir = $projectRoot

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   HealthAI — Full Stack Launcher" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Start FastAPI backend in a new PowerShell window ────────
Write-Host "[1/2] Starting FastAPI backend on http://localhost:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$backendDir'; " +
    "Write-Host 'Installing/checking Python dependencies...' -ForegroundColor Cyan; " +
    "pip install -r requirements.txt -q; " +
    "Write-Host ''; " +
    "Write-Host 'Starting FastAPI server...' -ForegroundColor Green; " +
    "Write-Host 'API Docs: http://localhost:8000/docs' -ForegroundColor Yellow; " +
    "Write-Host ''; " +
    "uvicorn app:app --reload --host 0.0.0.0 --port 8000"
)

# Small delay so backend window is visible first
Start-Sleep -Seconds 2

# ── 2. Start Vite frontend in a new PowerShell window ──────────
Write-Host "[2/2] Starting React frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$frontendDir'; " +
    "Write-Host 'Starting Vite dev server...' -ForegroundColor Green; " +
    "Write-Host 'Frontend: http://localhost:5173' -ForegroundColor Yellow; " +
    "Write-Host ''; " +
    "npm run dev"
)

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Both servers are starting!" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend  ->  http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend   ->  http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs  ->  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Two new terminal windows have been opened." -ForegroundColor White
Write-Host "Close them to stop the servers." -ForegroundColor Gray
