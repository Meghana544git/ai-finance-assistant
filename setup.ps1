# =============================================================================
#  AI Finance Assistant - one-time local setup (Windows PowerShell)
#  Usage:  .\setup.ps1
# =============================================================================

[CmdletBinding()]
param(
    [switch]$SkipMlTraining
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Venv = Join-Path $Backend ".venv"
$VenvPython = Join-Path $Venv "Scripts\python.exe"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-LastExitCode([string]$Action) {
    if ($LASTEXITCODE -ne 0) {
        throw "$Action failed with exit code $LASTEXITCODE."
    }
}

Write-Step "Checking prerequisites"

$Python = Get-Command python -ErrorAction SilentlyContinue
if (-not $Python) {
    throw "Python was not found on PATH. Install Python 3.11+ from https://www.python.org/downloads/ and tick 'Add python.exe to PATH'."
}

$Node = Get-Command node -ErrorAction SilentlyContinue
if (-not $Node) {
    throw "Node.js was not found on PATH. Install Node.js 20+ from https://nodejs.org/."
}

# On Windows, `npm` resolves to npm.ps1 which can be blocked by the PowerShell
# execution policy. Prefer npm.cmd, which is not affected by that policy.
$NpmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $NpmCommand) {
    $NpmCommand = Get-Command npm -ErrorAction SilentlyContinue
}
if (-not $NpmCommand) {
    throw "npm was not found on PATH. Reinstall Node.js and reopen the terminal."
}
$Npm = $NpmCommand.Source

Write-Host ("Python : " + (& $Python.Source --version))
Write-Host ("Node   : " + (& $Node.Source --version))
Write-Host ("npm    : " + (& $Npm --version))

Write-Step "Creating the Python virtual environment"
if (-not (Test-Path $VenvPython)) {
    & $Python.Source -m venv $Venv
    Assert-LastExitCode "Creating the virtual environment"
    Write-Host "Created backend\.venv"
}
else {
    Write-Host "backend\.venv already exists - reusing it."
}

Write-Step "Installing backend dependencies (this can take a few minutes)"
& $VenvPython -m pip install --upgrade pip
Assert-LastExitCode "Upgrading pip"
& $VenvPython -m pip install -r (Join-Path $Backend "requirements.txt")
Assert-LastExitCode "Installing backend dependencies"

Write-Step "Configuring backend environment"
$EnvFile = Join-Path $Backend ".env"
$EnvTemplate = Join-Path $Backend ".env.example"
if (-not (Test-Path $EnvFile)) {
    Copy-Item $EnvTemplate $EnvFile
    $Secret = & $VenvPython -c "import secrets; print(secrets.token_urlsafe(48))"
    $Content = Get-Content $EnvFile -Raw
    $Content = $Content -replace "SECRET_KEY=.*", "SECRET_KEY=$Secret"
    Set-Content -Path $EnvFile -Value $Content -NoNewline -Encoding utf8
    Write-Host "Created backend\.env with a freshly generated SECRET_KEY."
    Write-Host "SQLite is the default database: backend\finance.db"
}
else {
    Write-Host "backend\.env already exists - leaving it unchanged."
}

Write-Step "Installing frontend dependencies"
Push-Location $Frontend
try {
    & $Npm install
    Assert-LastExitCode "Installing frontend dependencies"
}
finally {
    Pop-Location
}

$FrontendEnv = Join-Path $Frontend ".env"
if (-not (Test-Path $FrontendEnv)) {
    Copy-Item (Join-Path $Frontend ".env.example") $FrontendEnv
    Write-Host "Created frontend\.env with VITE_API_URL=http://localhost:8000/api"
}

if (-not $SkipMlTraining) {
    Write-Step "Training and evaluating the category classifier"
    Push-Location $Backend
    try {
        & $VenvPython "ml/train_model.py"
        Assert-LastExitCode "Training the classifier"
        & $VenvPython "ml/evaluate_model.py"
        Assert-LastExitCode "Evaluating the classifier"
    }
    finally {
        Pop-Location
    }
}

Write-Step "Verifying the backend test suite"
Push-Location $Backend
try {
    & $VenvPython -m pytest
    Assert-LastExitCode "Running backend tests"
}
finally {
    Pop-Location
}

Write-Step "Setup complete"
Write-Host "Start the app with:  .\run.ps1" -ForegroundColor Green
Write-Host "Backend docs:        http://localhost:8000/docs"
Write-Host "Frontend:            http://localhost:5173"
