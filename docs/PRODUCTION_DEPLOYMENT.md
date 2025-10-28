# Production Deployment Guide

This guide provides specific instructions for deploying the Factorial Time Tracker in production environments (including NAS systems, VPS, and dedicated servers).

## Prerequisites

1. **Docker**: Ensure Docker and Docker Compose are installed
2. **Network Access**: Reliable internet connection for accessing Factorial HR
3. **System Resources**: Minimum 512MB RAM, 1GB storage space

## Quick Deployment

### Option 1: Using Docker GUI (NAS Systems)

1. **Upload Files**:
   - Create folder for the project (e.g., `/your/folder/for/factorial-tracker/`)
   - Upload all project files to this folder
   - Ensure `.env.production` is renamed to `.env`

2. **Import Docker Compose**:
   - Open Docker application interface
   - Create new project from docker-compose file
   - Select `docker-compose.production.yml`
   - Set project name: `factorial-tracker`

3. **Configure Environment**:
   - Edit `.env` file with your credentials:
     ```
     FACTORIAL_EMAIL=your-email@example.com
     FACTORIAL_PASSWORD=your-password
     CRON_SCHEDULE=0 18 * * *
     ```

4. **Deploy**:
   - Click "Build" to create the container
   - Start the project

### Option 2: Using SSH/Command Line

1. **Connect via SSH**:
   ```bash
   ssh admin@your-server-ip
   ```

2. **Navigate to Docker directory**:
   ```bash
   cd /your/folder/for/factorial-tracker
   ```

3. **Copy environment file**:
   ```bash
   cp .env.production .env
   # Edit .env with your credentials
   nano .env
   ```

4. **Deploy**:
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

## Network Timeout Optimization

The production configuration includes enhanced timeouts for slower server networks:

- **Browser Timeout**: 120 seconds (vs 30s standard)
- **Page Navigation**: 90 seconds (vs 30s standard)
- **Element Timeout**: 60 seconds (vs 30s standard)

These settings are automatically applied when using `.env.production`.

## Troubleshooting

### Network Timeout Issues

If you see "Timeout exceeded" errors:

1. **Check Internet Connection**:
   ```bash
   docker exec factorial-time-tracker-production ping -c 4 app.factorialhr.com
   ```

2. **Increase Timeouts Further** (edit `.env`):
   ```
   BROWSER_TIMEOUT=180000    # 3 minutes
   PAGE_TIMEOUT=120000       # 2 minutes
   NAVIGATION_TIMEOUT=150000 # 2.5 minutes
   ```

3. **Restart Container**:
   ```bash
   docker-compose -f docker-compose.production.yml down
   docker-compose -f docker-compose.production.yml up -d
   ```

### Performance Issues

1. **Check Resource Usage**:
   - Monitor CPU/RAM in DSM Resource Monitor
   - Ensure adequate resources for Docker

2. **Reduce Concurrent Operations**:
   - Avoid running multiple browser automations simultaneously
   - Schedule runs during low-usage periods

### Log Analysis

1. **View Real-time Logs**:
   ```bash
   docker logs -f factorial-time-tracker-production
   ```

2. **Check Log Files**:
   Logs are located in the `logs` folder: `/your/folder/for/factorial-tracker/logs/`

### Common Fixes

1. **"Page crashed" errors**:
   - Add to `.env`: `NODE_OPTIONS=--max-old-space-size=512`
   - Restart container

2. **"Navigation failed" errors**:
   - Verify internet connectivity
   - Check DNS settings in Synology Network settings
   - Try different time of day (avoid peak hours)

3. **Container won't start**:
   - Check Docker package is running
   - Verify file permissions: `chmod 644 .env`
   - Check available disk space

## Monitoring

### Health Checks

The container includes health monitoring:
- **Interval**: Every 60 seconds
- **Timeout**: 30 seconds per check
- **Retries**: 5 attempts before marking unhealthy
- **Start Period**: 120 seconds (allows for slow NAS startup)

### Status Commands

```bash
# Check container status
docker ps | grep factorial

# View health status
docker inspect factorial-time-tracker-production | grep Health -A 10

# Check last execution
docker logs factorial-time-tracker-production | tail -20
```

## Security Considerations

1. **Credential Protection**:
   - Keep `.env` file permissions restrictive: `chmod 600 .env`
   - Consider using Docker secrets for production

2. **Network Isolation**:
   - The container uses a dedicated Docker network
   - No external ports are exposed

3. **Log Rotation**:
   - Logs are automatically rotated by Winston
   - Monitor disk usage in `/logs` directory

## Scheduling Notes

- **Default Schedule**: 6:00 PM daily (`0 18 * * *`)
- **Timezone**: Uses system timezone or TZ environment variable
- **Manual Execution**: Use the `log-any` command for immediate execution

## Hardware Recommendations

- **Minimum RAM**: 1GB available for Docker
- **Storage**: At least 2GB free space for Docker images and logs
- **Network**: Stable internet connection with reasonable speed
- **CPU**: Any modern CPU should be sufficient
