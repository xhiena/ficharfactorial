# 🐳 Docker Setup Guide for Factorial Time Tracker

## Prerequisites

1. **Install Docker Desktop** (if not already installed):
   - Download from: https://www.docker.com/products/docker-desktop
   - Make sure Docker Desktop is running

## 🚀 Quick Setup

### Option 1: Using Docker Compose (Recommended)

1. **Start Docker Desktop** and ensure it's running

2. **Configure your credentials** in `.env` file:
   ```bash
   # Make sure your .env file contains:
   FACTORIAL_EMAIL=your-email@example.com
   FACTORIAL_PASSWORD=your-password
   WORK_START_TIME=09:00
   WORK_END_TIME=17:00
   BREAK_MINUTES=60
   CRON_SCHEDULE=0 18 * * *  # Optional: When to run (default: daily at 6 PM)
   ```

3. **Build and start the container**:
   ```bash
   docker-compose up -d
   ```

4. **Check if it's working**:
   ```bash
   docker-compose logs -f
   ```

### Option 2: Using Docker directly

1. **Build the image**:
   ```bash
   docker build -t factorial-time-tracker .
   ```

2. **Run the container**:
   ```bash
   docker run -d \
     --name factorial-logger \
     --restart unless-stopped \
     -e FACTORIAL_EMAIL="your-email@example.com" \
     -e FACTORIAL_PASSWORD="your-password" \
     -v "./logs:/app/logs" \
     factorial-time-tracker
   ```

## ⏰ Schedule

The container will automatically log your work hours **every day at 18:00 (6 PM)**.

The cron job runs: `0 18 * * *` which means:
- `0` minutes
- `18` hour (6 PM)
- `*` every day of month  
- `*` every month
- `*` every day of week

## 📊 Monitoring

### View real-time logs:
```bash
docker-compose logs -f factorial-logger
```

### View cron execution logs:
```bash
# Windows
type logs\cron.log

# Linux/Mac
cat logs/cron.log
```

### View application logs:
```bash
# Windows  
type logs\factorial-automation.log

# Linux/Mac
cat logs/factorial-automation.log
```

## 🛠️ Management Commands

### Start the service:
```bash
docker-compose up -d
```

### Stop the service:
```bash
docker-compose down
```

### Restart the service:
```bash
docker-compose restart
```

### View container status:
```bash
docker-compose ps
```

### Execute manual time logging (for testing):
```bash
docker-compose exec factorial-logger node dist/index.js log-today
```

## 🐛 Troubleshooting

### Container won't start:
1. Check Docker Desktop is running
2. Verify `.env` file exists and has correct credentials
3. Check logs: `docker-compose logs factorial-logger`

### Cron job not executing:
1. Check container is running: `docker-compose ps`
2. Check cron logs: `cat logs/cron.log`
3. Verify timezone: Container uses `Europe/Madrid` by default

### Manual testing:
```bash
# Test inside container
docker-compose exec factorial-logger /bin/bash
cd /app
node dist/index.js log-today
```

## 🔧 Customization

### Change execution time:
Set the `CRON_SCHEDULE` environment variable in your `.env` file or `docker-compose.yml`:
```bash
# In .env file:
CRON_SCHEDULE=0 9 * * *     # For 9 AM instead of 6 PM
CRON_SCHEDULE=30 17 * * *   # For 5:30 PM
CRON_SCHEDULE=0 8,17 * * *  # For 8 AM and 5 PM daily
```

### Change timezone:
Edit `docker-compose.yml`:
```yaml
environment:
  - TZ=America/New_York  # Change to your timezone
```

### Skip weekends:
To run only Monday to Friday, set:
```bash
# In .env file - Monday to Friday only:
CRON_SCHEDULE=0 18 * * 1-5
```

## 📁 File Structure

After setup, your directory will look like:

```
factorial-time-tracker/
├── docker/                 # Docker configuration files
│   ├── entrypoint.sh      # Container startup script
│   ├── cron-jobs          # Cron schedule (18:00 daily)
│   └── README.md          # Docker documentation
├── logs/                   # Persistent logs (mounted volume)
│   ├── cron.log           # Cron execution logs
│   └── factorial-automation.log  # Application logs
├── Dockerfile             # Container definition
├── docker-compose.yml     # Service orchestration
├── .dockerignore          # Files excluded from build
└── .env                   # Your credentials (keep private!)
```

## 🔒 Security Notes

- Keep your `.env` file secure and never commit it to version control
- The container runs with minimal privileges
- Logs are persistent and stored outside the container
- Container automatically restarts if it crashes

## 🎯 Success Verification

After starting, you should see logs like:
```
🚀 Starting Factorial Time Tracker Container...
✅ Found .env file
✅ Configuration validated  
✅ Application test passed
⏰ Starting cron daemon...
📅 Next execution will be at 18:00 daily
💚 Container is ready and running!
```

Your work hours will be automatically logged every day at 6 PM! 🎉