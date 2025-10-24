# Test script for Docker setup (PowerShell version)
Write-Host "🐳 Testing Factorial Time Tracker Docker Setup" -ForegroundColor Cyan
Write-Host "==============================================`n" -ForegroundColor Cyan

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) { 
        throw "Docker not running" 
    }
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
Write-Host "Checking .env file..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating from template..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "📝 Please edit .env file with your Factorial credentials:" -ForegroundColor Yellow
        Write-Host "   - FACTORIAL_EMAIL=your-email@example.com"
        Write-Host "   - FACTORIAL_PASSWORD=your-password"
        exit 1
    } else {
        Write-Host "❌ No .env.example found. Please create .env manually." -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ .env file exists" -ForegroundColor Green

# Check if required fields are set in .env
Write-Host "Validating .env credentials..." -ForegroundColor Yellow
$envContent = Get-Content ".env" -Raw
$hasEmail = $envContent -match "FACTORIAL_EMAIL=.*@.*"
$hasPassword = $envContent -match "FACTORIAL_PASSWORD=.+"
if (-not ($hasEmail -and $hasPassword)) {
    Write-Host "⚠️  Please update .env file with your actual Factorial credentials" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Credentials configured in .env" -ForegroundColor Green

# Build the Docker image
Write-Host "Building Docker image..." -ForegroundColor Yellow
try {
    $buildOutput = docker build -t factorial-time-tracker . 2>&1
    if ($LASTEXITCODE -ne 0) { 
        Write-Host "Build output:" -ForegroundColor Red
        Write-Host $buildOutput -ForegroundColor Red
        throw "Build failed" 
    }
    Write-Host "✅ Docker image built successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker build failed. Check the error above and try again." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Docker setup is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the automated time logging:" -ForegroundColor Cyan
Write-Host "   docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "To monitor logs:" -ForegroundColor Cyan  
Write-Host "   docker-compose logs -f" -ForegroundColor White
Write-Host ""
Write-Host "To stop:" -ForegroundColor Cyan
Write-Host "   docker-compose down" -ForegroundColor White
Write-Host ""
Write-Host "📅 The container will automatically log your work hours every day at 18:00 (6 PM)" -ForegroundColor Yellow