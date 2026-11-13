# =============================================================================
#  AI Finance Assistant - start backend and frontend dev servers
#  Usage:  .\run.ps1
#          .\run.ps1 -BackendOnly
#          .\run.ps1 -FrontendOnly
#          .\run.ps1 -NoReload
# =============================================================================

[CmdletBinding()]
param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$NoReload
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"

if (-not $BackendOnly) {
    $NpmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $NpmCommand) { $NpmCommand = Get-Command npm -ErrorAction SilentlyContinue }
    if (-not $NpmCommand) { throw "npm was not found on PATH. Install Node.js 20+." }
    $Npm = $NpmCommand.Source
    if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
        throw "Frontend dependencies are missing. Run .\setup.ps1 first."
    }
}

if (-not $FrontendOnly) {
    if (-not (Test-Path $VenvPython)) {
        throw "backend\.venv is missing. Run .\setup.ps1 first."
    }
    if (-not (Test-Path (Join-Path $Backend ".env"))) {
        Write-Host "backend\.env not found - copying .env.example (development defaults)." -ForegroundColor Yellow
        Copy-Item (Join-Path $Backend ".env.example") (Join-Path $Backend ".env")
    }

    $ReloadFlag = if ($NoReload) { "" } else { "--reload" }
    $BackendCommand = "& `"$VenvPython`" -m uvicorn app.main:app $ReloadFlag --port 8000"
    Write-Host "Starting FastAPI on http://localhost:8000 ..." -ForegroundColor Cyan
    Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-NoExit", "-Command", $BackendCommand `
        -WorkingDirectory $Backend | Out-Null
}

if (-not $BackendOnly) {
    $FrontendCommand = "& `"$Npm`" run dev"
    Write-Host "Starting Vite on http://localhost:5173 ..." -ForegroundColor Cyan
    Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-NoExit", "-Command", $FrontendCommand `
        -WorkingDirectory $Frontend | Out-Null
}

Write-Host ""
Write-Host "AI Finance Assistant" -ForegroundColor Green
if (-not $BackendOnly) {
    Write-Host "  Frontend : http://localhost:5173"
    Write-Host "  API docs : http://localhost:8000/docs"
    Write-Host "  Health   : http://localhost:8000/health"
}
elseif (-not $FrontendOnly) {
    Write-Host "  API docs : http://localhost:8000/docs"
}
Write-Host ""
Write-Host "Each server runs in its own PowerShell window. Close those windows (or press Ctrl+C in them) to stop."
