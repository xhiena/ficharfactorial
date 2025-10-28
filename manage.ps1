# PowerShell management script for Factorial Time Tracker
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "update", "backup", "test")]
    [string]$Action
)

$ContainerName = "factorial-time-tracker-production"
$ComposeFile = "docker-compose.production.yml"

switch ($Action) {
    "start" {
        Write-Host "🚀 Starting Factorial Time Tracker..." -ForegroundColor Green
        docker-compose -f $ComposeFile up -d
        docker-compose -f $ComposeFile ps
    }
    
    "stop" {
        Write-Host "🛑 Stopping Factorial Time Tracker..." -ForegroundColor Yellow
        docker-compose -f $ComposeFile down
    }
    
    "restart" {
        Write-Host "🔄 Restarting Factorial Time Tracker..." -ForegroundColor Cyan
        docker-compose -f $ComposeFile restart
        docker-compose -f $ComposeFile ps
    }
    
    "status" {
        Write-Host "📊 Factorial Time Tracker Status:" -ForegroundColor Blue
        docker-compose -f $ComposeFile ps
        Write-Host "`n📋 Recent logs:" -ForegroundColor Blue
        docker-compose -f $ComposeFile logs --tail=20
    }
    
    "logs" {
        Write-Host "📋 Factorial Time Tracker Logs:" -ForegroundColor Blue
        docker-compose -f $ComposeFile logs -f
    }
    
    "update" {
        Write-Host "🔄 Updating Factorial Time Tracker..." -ForegroundColor Cyan
        git pull
        & .\deploy.ps1
    }
    
    "backup" {
        $BackupDir = ".\backups\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Write-Host "💾 Creating backup at $BackupDir..." -ForegroundColor Blue
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        docker cp "${ContainerName}:/app/logs" "$BackupDir/"
        Copy-Item ".env" "$BackupDir/" -ErrorAction SilentlyContinue
        Write-Host "✅ Backup created successfully!" -ForegroundColor Green
    }
    
    "test" {
        Write-Host "🧪 Testing Factorial Time Tracker..." -ForegroundColor Magenta
        docker-compose -f $ComposeFile exec factorial-logger node dist/index.js log-any
    }
}

Write-Host "`n📌 Available commands:" -ForegroundColor Gray
Write-Host "  .\manage.ps1 start     - Start the service" -ForegroundColor Gray
Write-Host "  .\manage.ps1 stop      - Stop the service" -ForegroundColor Gray
Write-Host "  .\manage.ps1 restart   - Restart the service" -ForegroundColor Gray
Write-Host "  .\manage.ps1 status    - Show status and recent logs" -ForegroundColor Gray
Write-Host "  .\manage.ps1 logs      - Follow logs in real-time" -ForegroundColor Gray
Write-Host "  .\manage.ps1 update    - Update and redeploy" -ForegroundColor Gray
Write-Host "  .\manage.ps1 backup    - Create backup" -ForegroundColor Gray
Write-Host "  .\manage.ps1 test      - Test the automation manually" -ForegroundColor Gray