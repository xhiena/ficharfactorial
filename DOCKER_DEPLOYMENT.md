# Docker Server Deployment Guide

This guide explains how to host the Factorial Time Tracker on your Docker server.

## 🚀 Quick Start

### 1. Prepare Your Server

```bash
# Clone the repository
git clone <your-repo-url> factorial-time-tracker
cd factorial-time-tracker

# Copy production environment template
cp .env.production .env

# Edit with your credentials
nano .env  # or vim .env
```

### 2. Configure Environment

Edit `.env` with your actual values:
```env
FACTORIAL_EMAIL=your-email@company.com
FACTORIAL_PASSWORD=your-secure-password
CRON_SCHEDULE=0 18 * * *
TZ=Europe/Madrid
```

### 3. Deploy

#### Option A: Simple Docker Compose (Recommended)
```bash
# Deploy using production compose file
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

#### Option B: Automated Deployment Script
```bash
# Linux/macOS
./deploy.sh

# Windows PowerShell
.\deploy.ps1
```

## 📋 Management Commands

### Linux/macOS
```bash
# Start service
docker-compose -f docker-compose.prod.yml up -d

# Stop service
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Test automation
docker-compose -f docker-compose.prod.yml exec factorial-logger node dist/index.js log-any

# Check cron schedule
docker-compose -f docker-compose.prod.yml exec factorial-logger cat /etc/cron.d/factorial-cron
```

### Windows PowerShell
```powershell
# Use management script
.\manage.ps1 start     # Start service
.\manage.ps1 stop      # Stop service
.\manage.ps1 status    # Show status
.\manage.ps1 logs      # View logs
.\manage.ps1 test      # Test automation
.\manage.ps1 backup    # Create backup
```

## 🏗️ Deployment Options

### Option 1: Docker Compose (Simple)
- **File**: `docker-compose.prod.yml`
- **Best for**: Single server deployments
- **Features**: Auto-restart, health checks, log persistence

### Option 2: Docker Swarm (Cluster)
- **File**: `docker-stack.yml`
- **Best for**: Multi-node clusters
- **Features**: Secrets management, overlay networking, rolling updates

```bash
# Deploy to swarm
docker stack deploy -c docker-stack.yml factorial-stack
```

### Option 3: Kubernetes
- **File**: `k8s-deployment.yml`
- **Best for**: Kubernetes clusters
- **Features**: Secrets, ConfigMaps, persistent volumes

```bash
# Apply to cluster
kubectl apply -f k8s-deployment.yml
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FACTORIAL_EMAIL` | Your Factorial email | Required |
| `FACTORIAL_PASSWORD` | Your Factorial password | Required |
| `CRON_SCHEDULE` | When to run (cron format) | `0 18 * * *` |
| `WORK_START_TIME` | Default start time | `09:00` |
| `WORK_END_TIME` | Default end time | `17:00` |
| `TZ` | Timezone for cron | `UTC` |
| `LOG_LEVEL` | Logging level | `info` |

### Cron Schedule Examples

```bash
# Every day at 6 PM
CRON_SCHEDULE="0 18 * * *"

# Weekdays at 9 AM
CRON_SCHEDULE="0 9 * * 1-5"

# Multiple times: 8 AM and 5 PM on weekdays
CRON_SCHEDULE="0 8,17 * * 1-5"

# Every 2 hours during work hours
CRON_SCHEDULE="0 9-17/2 * * 1-5"
```

## 📊 Monitoring

### Health Checks
```bash
# Container health
docker-compose -f docker-compose.prod.yml ps

# Application logs
docker-compose -f docker-compose.prod.yml logs factorial-logger

# Cron logs
docker-compose -f docker-compose.prod.yml exec factorial-logger tail -f /app/logs/cron.log
```

### Log Files
- **Application logs**: `./logs/factorial-automation.log`
- **Cron logs**: `./logs/cron.log` (inside container)
- **Docker logs**: `docker-compose logs`

## 🔐 Security

### Best Practices
1. **Use secrets** for credentials (see Docker Swarm example)
2. **Run as non-root** user (production Dockerfile)
3. **Network isolation** with custom networks
4. **Regular updates** of base images
5. **Log rotation** to prevent disk space issues

### Secrets Management

#### Docker Swarm
```bash
# Create secrets
echo "your-email@company.com" | docker secret create factorial_email -
echo "your-password" | docker secret create factorial_password -

# Deploy with secrets
docker stack deploy -c docker-stack.yml factorial-stack
```

#### External Secret Management
- **HashiCorp Vault**
- **AWS Secrets Manager**
- **Azure Key Vault**
- **Kubernetes Secrets**

## 🔄 Updates

### Automated Updates
```bash
# Update and redeploy
git pull
./deploy.sh
```

### Manual Updates
```bash
# Pull latest code
git pull

# Rebuild image
docker-compose -f docker-compose.prod.yml build

# Restart with new image
docker-compose -f docker-compose.prod.yml up -d
```

## 🚨 Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs
   
   # Check environment
   docker-compose -f docker-compose.prod.yml exec factorial-logger env
   ```

2. **Cron not running**
   ```bash
   # Check cron service
   docker-compose -f docker-compose.prod.yml exec factorial-logger ps aux | grep cron
   
   # Check cron schedule
   docker-compose -f docker-compose.prod.yml exec factorial-logger cat /etc/cron.d/factorial-cron
   ```

3. **Browser issues**
   ```bash
   # Ensure headless mode
   docker-compose -f docker-compose.prod.yml exec factorial-logger env | grep HEADLESS
   
   # Test browser
   docker-compose -f docker-compose.prod.yml exec factorial-logger node -e "console.log('Browser test')"
   ```

4. **Permission issues**
   ```bash
   # Check file permissions
   docker-compose -f docker-compose.prod.yml exec factorial-logger ls -la /app/logs
   
   # Fix if needed
   docker-compose -f docker-compose.prod.yml exec factorial-logger chown -R factorial:factorial /app/logs
   ```

## 📈 Scaling

### Multiple Instances
```yaml
# In docker-compose.prod.yml
services:
  factorial-logger:
    deploy:
      replicas: 2  # Run 2 instances
```

### Load Balancing
- Use different cron schedules
- Separate by time zones
- Different Factorial accounts

## 🔧 Advanced Configuration

### Custom Dockerfile
- Modify `Dockerfile.prod` for specific needs
- Add custom dependencies
- Configure different base images

### Networking
- Use external networks
- Configure firewalls
- Set up reverse proxies

### Storage
- Use external volumes
- Configure backup strategies
- Set up log rotation

## 📞 Support

### Logs Collection
```bash
# Collect all logs for support
mkdir support-logs
docker-compose -f docker-compose.prod.yml logs > support-logs/docker-logs.txt
docker cp factorial-time-tracker-prod:/app/logs support-logs/
tar -czf support-$(date +%Y%m%d).tar.gz support-logs/
```

### Configuration Export
```bash
# Export configuration (remove sensitive data)
docker-compose -f docker-compose.prod.yml config > support-logs/config.yml
docker-compose -f docker-compose.prod.yml exec factorial-logger env | grep -v PASSWORD > support-logs/env.txt
```