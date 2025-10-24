# Synology Docker Deployment Guide

This guide is specifically for deploying the Factorial Time Tracker on Synology NAS systems.

## 🚀 Quick Setup for Synology

### Option 1: Using Docker Compose (Recommended)

1. **SSH into your Synology NAS**
   ```bash
   ssh admin@your-synology-ip
   ```

2. **Create project directory**
   ```bash
   mkdir -p /volume1/docker/factorial-time-tracker
   cd /volume1/docker/factorial-time-tracker
   ```

3. **Upload project files** (use File Station or SCP)
   - Copy all project files to the directory
   - Make sure you have the `.env` file with your credentials

4. **Deploy using Synology-specific compose file**
   ```bash
   docker-compose -f docker-compose.synology.yml up -d
   ```

### Option 2: Using Synology Docker UI

1. **Open Docker app** in DSM
2. **Go to Registry** and search for `node:18-bullseye`
3. **Download the image**
4. **Go to Image** section and create container manually:
   - **Environment variables**: Add your Factorial credentials
   - **Volume**: Mount `/volume1/docker/factorial-logs` to `/app/logs`
   - **Network**: Create or use existing bridge network

## 🔧 Synology-Specific Configuration

### File Locations
```bash
# Project directory
/volume1/docker/factorial-time-tracker/

# Logs directory (create this first)
/volume1/docker/factorial-logs/

# Environment file
/volume1/docker/factorial-time-tracker/.env
```

### Environment File (.env)
```env
# Factorial Credentials
FACTORIAL_EMAIL=your-email@company.com
FACTORIAL_PASSWORD=your-password

# Work Schedule
WORK_START_TIME=09:00
WORK_END_TIME=17:00

# Automation Schedule (6 PM daily)
CRON_SCHEDULE=0 18 * * *

# System Configuration
HEADLESS=true
LOG_LEVEL=info
TZ=Europe/Madrid

# Synology-specific
NODE_ENV=production
```

## 📋 Step-by-Step Deployment

### Step 1: Prepare Synology Environment

1. **Enable SSH** (Control Panel > Terminal & SNMP > Enable SSH service)

2. **Install Docker** (Package Center > Docker)

3. **Create directories**:
   ```bash
   sudo mkdir -p /volume1/docker/factorial-time-tracker
   sudo mkdir -p /volume1/docker/factorial-logs
   sudo chown -R admin:users /volume1/docker/factorial-time-tracker
   sudo chown -R admin:users /volume1/docker/factorial-logs
   ```

### Step 2: Upload Project Files

**Using File Station:**
1. Open File Station
2. Navigate to `docker/factorial-time-tracker`
3. Upload all project files
4. Create `.env` file with your credentials

**Using SCP (from your computer):**
```bash
scp -r . admin@your-synology-ip:/volume1/docker/factorial-time-tracker/
```

### Step 3: Build and Deploy

```bash
# Navigate to project directory
cd /volume1/docker/factorial-time-tracker

# Build and start the container
docker-compose -f docker-compose.synology.yml up -d

# Check status
docker-compose -f docker-compose.synology.yml ps

# View logs
docker-compose -f docker-compose.synology.yml logs -f
```

## 🐛 Troubleshooting Synology Issues

### Common Problems

1. **Build Fails with "tsc not found"**
   - **Solution**: Use `Dockerfile.simple` instead of `Dockerfile.prod`
   - **Edit**: `docker-compose.synology.yml` already uses the simple version

2. **Permission Denied Errors**
   ```bash
   # Fix permissions
   sudo chown -R admin:users /volume1/docker/factorial-time-tracker
   sudo chmod -R 755 /volume1/docker/factorial-time-tracker
   ```

3. **Cron Not Working**
   ```bash
   # Check if container has cron service
   docker exec factorial-time-tracker-synology ps aux | grep cron
   
   # Check cron logs
   docker exec factorial-time-tracker-synology tail -f /app/logs/cron.log
   ```

4. **Network Issues**
   ```bash
   # Check network connectivity
   docker exec factorial-time-tracker-synology ping google.com
   
   # Check if container can reach Factorial
   docker exec factorial-time-tracker-synology nslookup app.factorialhr.com
   ```

### Build Issues on Synology

If you get build errors, try these solutions:

1. **Use Simple Dockerfile**:
   ```bash
   # Edit docker-compose.synology.yml to use Dockerfile.simple
   # It's already configured this way
   ```

2. **Build with More Memory**:
   ```bash
   # Stop other containers to free memory
   docker stop $(docker ps -q)
   
   # Build with limited parallelism
   docker-compose -f docker-compose.synology.yml build --parallel 1
   ```

3. **Manual Build Steps**:
   ```bash
   # Build image manually
   docker build -f Dockerfile.simple -t factorial-time-tracker:synology .
   
   # Run container
   docker run -d --name factorial-time-tracker-synology \
     --env-file .env \
     -v /volume1/docker/factorial-logs:/app/logs \
     factorial-time-tracker:synology
   ```

## 📊 Monitoring on Synology

### Using Docker UI
1. Open **Docker** app in DSM
2. Go to **Container** section
3. Monitor your `factorial-time-tracker-synology` container
4. Check logs and resource usage

### Using Command Line
```bash
# Container status
docker ps | grep factorial

# Resource usage
docker stats factorial-time-tracker-synology

# Logs
docker logs factorial-time-tracker-synology -f

# Execute commands in container
docker exec -it factorial-time-tracker-synology /bin/bash
```

## 🔄 Synology Updates

### Updating the Application
```bash
cd /volume1/docker/factorial-time-tracker

# Pull latest code (if using git)
git pull

# Rebuild and restart
docker-compose -f docker-compose.synology.yml down
docker-compose -f docker-compose.synology.yml build --no-cache
docker-compose -f docker-compose.synology.yml up -d
```

### Automatic Updates via Task Scheduler
1. **Control Panel** > **Task Scheduler**
2. **Create** > **Scheduled Task** > **User-defined script**
3. **Schedule**: Weekly
4. **Script**:
   ```bash
   #!/bin/bash
   cd /volume1/docker/factorial-time-tracker
   git pull
   docker-compose -f docker-compose.synology.yml up -d --build
   ```

## ⚡ Performance Optimization for Synology

### Resource Limits
Add to `docker-compose.synology.yml`:
```yaml
services:
  factorial-logger:
    # ... existing config
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          memory: 256M
```

### Storage Optimization
```bash
# Use external volume for logs
docker volume create factorial-logs

# Mount in compose file
volumes:
  - factorial-logs:/app/logs
```

## 🔐 Synology Security

### User Permissions
```bash
# Create dedicated user
sudo adduser factorial-user

# Set ownership
sudo chown -R factorial-user:users /volume1/docker/factorial-time-tracker
```

### Firewall Rules
1. **Control Panel** > **Security** > **Firewall**
2. Allow Docker container access to external HTTPS (port 443)
3. Block unnecessary inbound connections

## 📞 Synology Support

### Log Collection
```bash
# Collect all logs for troubleshooting
mkdir /volume1/docker/support-logs
docker logs factorial-time-tracker-synology > /volume1/docker/support-logs/container.log
cp -r /volume1/docker/factorial-logs/* /volume1/docker/support-logs/
tar -czf factorial-support-$(date +%Y%m%d).tar.gz /volume1/docker/support-logs/
```

### System Information
```bash
# Synology version
cat /etc/synoinfo.conf | grep productversion

# Docker version
docker --version

# Available resources
free -h
df -h
```

The key differences for Synology are:
- Use `Dockerfile.simple` (single-stage build)
- Proper volume paths (`/volume1/docker/...`)
- Consider resource limitations
- Use Synology's Docker UI for monitoring