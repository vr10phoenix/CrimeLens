# CrimeLens Full Stack Launcher
# Run from project root: .\start_all.ps1

Write-Host "🔍 Checking Docker..." -ForegroundColor Cyan
$dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $dockerProcess) {
    Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -WindowStyle Hidden
    Write-Host "Waiting for Docker engine (30s)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
} else {
    Write-Host "Docker Desktop is already running." -ForegroundColor Green
}

Write-Host "🐘 Starting PostgreSQL container..." -ForegroundColor Cyan
$pgRunning = docker ps --filter "name=crime-lens-postgres" --format "{{.Names}}" | Select-String "crime-lens-postgres"
if (-not $pgRunning) {
    docker start crime-lens-postgres
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Creating and starting new PostgreSQL container..." -ForegroundColor Yellow
        docker run -d --name crime-lens-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=secret123 -e POSTGRES_DB=crime_db -p 5432:5432 postgres:16
    }
    Write-Host "Waiting for PostgreSQL to be ready (5s)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
} else {
    Write-Host "PostgreSQL container is already running." -ForegroundColor Green
}

Write-Host "🧠 Ensuring Ollama is running..." -ForegroundColor Cyan
$ollamaCheck = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -ErrorAction SilentlyContinue
if (-not $ollamaCheck) {
    Write-Host "Starting Ollama app..." -ForegroundColor Yellow
    # Adjust path if needed
    $ollamaPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
    if (Test-Path $ollamaPath) {
        Start-Process $ollamaPath -ArgumentList "serve" -WindowStyle Minimized
    } else {
        Write-Host "Ollama not found. Please start it manually." -ForegroundColor Red
    }
    Start-Sleep -Seconds 10
} else {
    Write-Host "Ollama is already running." -ForegroundColor Green
}

# Activate virtual environment and start backend
Write-Host "🐍 Starting FastAPI backend..." -ForegroundColor Cyan
$venvPath = ".\venv\Scripts\Activate.ps1"
if (Test-Path $venvPath) {
    Start-Process powershell -ArgumentList "-NoExit -Command `"$venvPath; uvicorn Backend.main:app --reload --port 8000`"" -WindowStyle Normal
} else {
    Write-Host "Virtual environment not found at $venvPath" -ForegroundColor Red
}

Write-Host "⚛️ Starting React frontend..." -ForegroundColor Cyan
if (Test-Path ".\chatbot-ui") {
    Start-Process powershell -ArgumentList "-NoExit -Command `"cd chatbot-ui; npm run dev`"" -WindowStyle Normal
} else {
    Write-Host "chatbot-ui folder not found!" -ForegroundColor Red
}

Write-Host "`n✅ All services launching! Check the new terminal windows." -ForegroundColor Green
Write-Host "   Backend:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan