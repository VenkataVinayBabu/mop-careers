# Starts MOP Careers: PostgreSQL check, backend, frontend, then opens the browser.
#
#   Right-click > Run with PowerShell,  or:  .\start.ps1
#
# Each server opens in its own window so you can read its logs and close it
# independently. Closing this window does not stop them.

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

Write-Host ''
Write-Host '  MOP Careers' -ForegroundColor Cyan
Write-Host '  ===========' -ForegroundColor Cyan
Write-Host ''

# --- 1. PostgreSQL --------------------------------------------------------
$svc = Get-Service -Name 'postgresql-x64-17' -ErrorAction SilentlyContinue
if (-not $svc) {
    Write-Host '  [!] PostgreSQL service not found. Is PostgreSQL 17 installed?' -ForegroundColor Red
    Read-Host '  Press Enter to exit'
    exit 1
}
if ($svc.Status -ne 'Running') {
    Write-Host '  Starting PostgreSQL...' -ForegroundColor Yellow
    try {
        Start-Service $svc.Name          # needs admin; usually already running
        Write-Host '  PostgreSQL started.' -ForegroundColor Green
    } catch {
        Write-Host '  [!] Could not start PostgreSQL. Run this script as Administrator,' -ForegroundColor Red
        Write-Host '      or start the "postgresql-x64-17" service from services.msc.' -ForegroundColor Red
        Read-Host '  Press Enter to exit'
        exit 1
    }
} else {
    Write-Host '  PostgreSQL         running' -ForegroundColor Green
}

# --- 2. Sanity checks -----------------------------------------------------
$python = Join-Path $root 'backend\.venv\Scripts\python.exe'
if (-not (Test-Path $python)) {
    Write-Host '  [!] Backend virtualenv missing. Run the first-time setup in README.md.' -ForegroundColor Red
    Read-Host '  Press Enter to exit'
    exit 1
}
if (-not (Test-Path (Join-Path $root 'frontend\node_modules'))) {
    Write-Host '  [!] frontend\node_modules missing. Run: cd frontend; npm install' -ForegroundColor Red
    Read-Host '  Press Enter to exit'
    exit 1
}

function Test-Port($port) {
    $null -ne (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

# --- 3. Backend -----------------------------------------------------------
if (Test-Port 8000) {
    Write-Host '  Backend            already running on :8000' -ForegroundColor Green
} else {
    # Build the command first: a bare "+" inside -ArgumentList is parsed as a
    # positional argument, not string concatenation.
    $backendCmd = "`$Host.UI.RawUI.WindowTitle='MOP Backend :8000'; Set-Location '$root\backend'; & '.\.venv\Scripts\python.exe' -m uvicorn app.main:app --reload --port 8000"
    Start-Process powershell -ArgumentList '-NoExit', '-Command', $backendCmd
    Write-Host '  Backend            starting on :8000' -ForegroundColor Yellow
}

# --- 4. Frontend ----------------------------------------------------------
if (Test-Port 5173) {
    Write-Host '  Frontend           already running on :5173' -ForegroundColor Green
} else {
    $frontendCmd = "`$Host.UI.RawUI.WindowTitle='MOP Frontend :5173'; Set-Location '$root\frontend'; npm run dev"
    Start-Process powershell -ArgumentList '-NoExit', '-Command', $frontendCmd
    Write-Host '  Frontend           starting on :5173' -ForegroundColor Yellow
}

# --- 5. Wait for both, then open the browser ------------------------------
Write-Host ''
Write-Host '  Waiting for both servers...' -NoNewline
$backendUp = $false
$frontendUp = $false
foreach ($i in 1..60) {
    if (-not $backendUp) {
        try {
            if ((Invoke-RestMethod 'http://127.0.0.1:8000/health' -TimeoutSec 2).status -eq 'ok') { $backendUp = $true }
        } catch {}
    }
    if (-not $frontendUp) {
        try {
            Invoke-WebRequest 'http://localhost:5173' -TimeoutSec 2 -UseBasicParsing | Out-Null
            $frontendUp = $true
        } catch {}
    }
    if ($backendUp -and $frontendUp) { break }
    Write-Host '.' -NoNewline
    Start-Sleep -Milliseconds 800
}
Write-Host ''
Write-Host ''

if ($backendUp -and $frontendUp) {
    Write-Host '  Both servers are up.' -ForegroundColor Green
    Write-Host ''
    Write-Host '    App        http://localhost:5173'
    Write-Host '    API docs   http://127.0.0.1:8000/docs'
    Write-Host ''
    Write-Host '  Sign in with:' -ForegroundColor Cyan
    Write-Host '    Admin     admin@mopcareers.com       Admin@123'
    Write-Host '    Teacher   ravi.kumar@mopcareers.com  Teacher@123'
    Write-Host '    Student   aditya.sharma@example.com  Student@123'
    Write-Host ''
    Write-Host '  Tip: one login at a time per browser window. Use an incognito' -ForegroundColor DarkGray
    Write-Host '       window to be signed in as two roles at once.' -ForegroundColor DarkGray
    Write-Host ''
    Start-Process 'http://localhost:5173'
} else {
    if (-not $backendUp)  { Write-Host '  [!] Backend did not start - check the "MOP Backend" window.' -ForegroundColor Red }
    if (-not $frontendUp) { Write-Host '  [!] Frontend did not start - check the "MOP Frontend" window.' -ForegroundColor Red }
    Write-Host ''
}

Read-Host '  Press Enter to close this window'
