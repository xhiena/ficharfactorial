# Docker Setup for Factorial Time Tracker

This directory contains Docker configuration files for running the Factorial Time Tracker as a containerized service that automatically logs your work hours at 18:00 every day.

## 🐳 Quick Start

1. **Build and run with Docker Compose:**
```bash
docker-compose up -d
```

2. **Check logs:**
```bash
docker-compose logs -f
```

3. **Stop the service:**
```bash
docker-compose down
```

## 📋 Files

- `Dockerfile` - Container configuration
- `entrypoint.sh` - Container startup script
- `cron-jobs` - Cron schedule configuration (18:00 daily)

## ⚙️ Configuration

The container will use environment variables from:
1. `.env` file (mounted into container)
2. Environment variables in `docker-compose.yml`

Required variables:
- `FACTORIAL_EMAIL` - Your Factorial HR email
- `FACTORIAL_PASSWORD` - Your Factorial HR password

Optional variables:
- `WORK_START_TIME` - Default: 09:00
- `WORK_END_TIME` - Default: 17:00
- `BREAK_MINUTES` - Default: 60
- `TZ` - Timezone, default: Europe/Madrid

## 🔍 Monitoring

- Container logs: `docker-compose logs -f`
- Cron execution logs: `tail -f logs/cron.log`
- Application logs: `tail -f logs/factorial-automation.log`

## 🛠️ Manual Execution

To test manually inside the container:
```bash
docker-compose exec factorial-logger node dist/index.js log-today
```