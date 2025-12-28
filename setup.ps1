Write-Host "🚀 Starting Automated Setup..." -ForegroundColor Cyan

# 1. Backend Setup
Write-Host "📦 Setting up Backend..." -ForegroundColor Yellow
Set-Location "backend"

if (-not (Test-Path "venv")) {
    Write-Host "   - Creating Python virtual environment..."
    python -m venv venv
} else {
    Write-Host "   - Virtual environment already exists."
}

# Activate venv
if (Test-Path "venv\Scripts\Activate.ps1") {
    . .\venv\Scripts\Activate.ps1
} else {
    Write-Host "⚠️ Warning: Could not activate venv automaticallly." -ForegroundColor Red
}

Write-Host "   - Upgrading pip..."
python -m pip install --upgrade pip | Out-Null

Write-Host "   - Installing dependencies (this may take a moment)..."
pip install -r requirements.txt

if (-not (Test-Path ".env")) {
    Write-Host "   - Creating .env from defaults..."
    Copy-Item ".env.example" ".env"
}

Write-Host "✅ Backend setup complete." -ForegroundColor Green

# 2. Frontend Setup
Set-Location "..\frontend"
Write-Host "🎨 Setting up Frontend..." -ForegroundColor Yellow

if (-not (Test-Path "node_modules")) {
    Write-Host "   - Installing npm dependencies..."
    npm install
} else {
    Write-Host "   - node_modules found, skipping install."
}

Write-Host "✅ Frontend setup complete." -ForegroundColor Green

Set-Location ".."
Write-Host ""
Write-Host "🎉 Setup Finished! To run the app:" -ForegroundColor Cyan
Write-Host "1. Terminal 1: cd backend; .\venv\Scripts\activate; uvicorn app.main:app --reload"
Write-Host "2. Terminal 2: cd frontend; npm run dev"
Write-Host ""
