# =============================================================================
#  AI Finance Assistant - retrain and evaluate the ML models
#  Usage:  .\train-ml.ps1
#          .\train-ml.ps1 -SkipEvaluation
# =============================================================================

[CmdletBinding()]
param(
    [switch]$SkipEvaluation
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"

if (Test-Path $VenvPython) {
    $Python = $VenvPython
}
else {
    Write-Host "backend\.venv not found - falling back to the python on PATH." -ForegroundColor Yellow
    $Python = (Get-Command python -ErrorAction SilentlyContinue).Source
    if (-not $Python) { throw "Python was not found. Run .\setup.ps1 first." }
}

Push-Location $Backend
try {
    Write-Host "`n==> Training the TF-IDF + Logistic Regression category classifier" -ForegroundColor Cyan
    & $Python "ml/train_model.py"
    if ($LASTEXITCODE -ne 0) { throw "Training failed with exit code $LASTEXITCODE." }

    if (-not $SkipEvaluation) {
        Write-Host "`n==> Evaluating the saved model on the held-out test split" -ForegroundColor Cyan
        & $Python "ml/evaluate_model.py"
        if ($LASTEXITCODE -ne 0) { throw "Evaluation failed with exit code $LASTEXITCODE." }
    }

    $MetadataPath = Join-Path $Backend "ml\artifacts\category_model_metadata.json"
    if (Test-Path $MetadataPath) {
        $Metadata = Get-Content $MetadataPath -Raw | ConvertFrom-Json
        Write-Host "`nSaved model summary" -ForegroundColor Green
        Write-Host ("  Version   : " + $Metadata.model_version)
        Write-Host ("  Trained at: " + $Metadata.trained_at)
        Write-Host ("  Dataset   : " + $Metadata.dataset_size + " rows")
        Write-Host ("  Accuracy  : " + [math]::Round([double]$Metadata.accuracy, 4))
        Write-Host ("  Macro F1  : " + [math]::Round([double]$Metadata.macro_f1, 4))
        Write-Host ("  Artifact  : backend\ml\artifacts\category_classifier.joblib")
    }
}
finally {
    Pop-Location
}
