# PowerShell deployment script for Windows Docker server
param(
    [string]$ImageName = "factorial-time-tracker",
    [string]$ContainerName = "factorial-time-tracker-production"
)

Write-Host "🚀 Deploying Factorial Time Tracker to production..." -ForegroundColor Green

$BackupDir = ".\backups\$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Create backup directory
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

# Stop existing container if running
$ExistingContainer = docker ps -q --filter "name=$ContainerName"
if ($ExistingContainer) {
    Write-Host "📦 Stopping existing container..." -ForegroundColor Yellow
    docker stop $ContainerName
    
    # Backup logs
    Write-Host "💾 Backing up logs..." -ForegroundColor Blue
    docker cp "${ContainerName}:/app/logs" "$BackupDir/" 2>$null
    
    # Remove old container
    docker rm $ContainerName
}

# Build new image
Write-Host "🔨 Building new image..." -ForegroundColor Cyan
docker build -f Dockerfile.prod -t "${ImageName}:latest" .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Tag with timestamp
$Timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
docker tag "${ImageName}:latest" "${ImageName}:$Timestamp"

# Deploy with production compose file
Write-Host "🚀 Starting new container..." -ForegroundColor Green
docker-compose -f docker-compose.prod.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

# Wait for container to be healthy
Write-Host "🔍 Waiting for container to be healthy..." -ForegroundColor Yellow
$Timeout = 60
$Counter = 0
do {
    Start-Sleep -Seconds 2
    $Status = docker-compose -f docker-compose.prod.yml ps | Select-String "Up|healthy"
    $Counter += 2
} while (-not $Status -and $Counter -lt $Timeout)

# Check final status
$FinalStatus = docker-compose -f docker-compose.prod.yml ps
if ($FinalStatus | Select-String "Up") {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "📊 Container status:" -ForegroundColor Cyan
    docker-compose -f docker-compose.prod.yml ps
    
    Write-Host "📋 Logs location: .\logs" -ForegroundColor Blue
    Write-Host "🔍 View logs: docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor Blue
    Write-Host "⚙️  Check cron: docker-compose -f docker-compose.prod.yml exec factorial-logger cat /etc/cron.d/factorial-cron" -ForegroundColor Blue
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "📋 Container logs:" -ForegroundColor Yellow
    docker-compose -f docker-compose.prod.yml logs
    exit 1
}

# Cleanup old images (keep last 3)
Write-Host "🧹 Cleaning up old images..." -ForegroundColor Yellow
$OldImages = docker images $ImageName --format "{{.Repository}}:{{.Tag}}" | Select-Object -Skip 3
if ($OldImages) {
    $OldImages | ForEach-Object { docker rmi $_ }
}

Write-Host "🎉 Deployment complete!" -ForegroundColor Green