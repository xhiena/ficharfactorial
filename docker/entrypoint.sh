#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting Factorial Time Tracker Container..."

# Print environment info
echo "📅 Current date: $(date)"
echo "🌍 Timezone: ${TZ:-UTC}"
echo "📧 Factorial Email: ${FACTORIAL_EMAIL:-'Not set'}"
echo "⏰ Work hours: ${WORK_START_TIME:-09:00} - ${WORK_END_TIME:-17:00}"

# Ensure logs directory exists and has proper permissions
mkdir -p /app/logs
chmod 755 /app/logs

# Create cron log file
touch /app/logs/cron.log
chmod 644 /app/logs/cron.log

# Use cron schedule from .env file (cron doesn't read env vars, so we substitute them)
echo "⏰ Using cron schedule: ${CRON_SCHEDULE}"

# Create cron job file with environment variable substitution
cat > /etc/cron.d/factorial-cron << EOF
# Factorial time logging - uses schedule from .env file
# Uses log-any to automatically handle any missing hours regardless of date
${CRON_SCHEDULE} root cd /app && HEADLESS=true FACTORIAL_EMAIL="${FACTORIAL_EMAIL}" FACTORIAL_PASSWORD="${FACTORIAL_PASSWORD}" WORK_START_TIME="${WORK_START_TIME}" WORK_END_TIME="${WORK_END_TIME}" /usr/local/bin/node dist/index.js log-any >> /app/logs/cron.log 2>&1

EOF

# Give execution rights on the cron job
chmod 0644 /etc/cron.d/factorial-cron

# Check if .env file exists and has credentials
if [ -f "/app/.env" ]; then
    echo "✅ Found .env file"
    # Source the .env file safely
    set -a  # Mark variables for export
    source /app/.env 2>/dev/null || true
    set +a  # Stop marking variables for export
else
    echo "⚠️  No .env file found, using environment variables"
fi

# Force headless mode in Docker container (override .env file setting)
export HEADLESS=true
echo "🖥️  Forcing headless mode for Docker container"

# Validate required environment variables
if [ -z "$FACTORIAL_EMAIL" ] || [ -z "$FACTORIAL_PASSWORD" ]; then
    echo "❌ ERROR: FACTORIAL_EMAIL and FACTORIAL_PASSWORD must be set!"
    echo "   Please create a .env file or set environment variables."
    exit 1
fi

echo "✅ Configuration validated"

# Test the application once to make sure it works
echo "🧪 Testing application..."
cd /app
if /usr/local/bin/node dist/index.js --help > /dev/null 2>&1; then
    echo "✅ Application test passed"
else
    echo "❌ Application test failed"
    exit 1
fi

# Apply the generated cron job
crontab /etc/cron.d/factorial-cron

# Start cron daemon
echo "⏰ Starting cron daemon..."
service cron start

# Show cron status
echo "📋 Active cron jobs:"
crontab -l

# Log the scheduled execution
echo "📅 Scheduled execution: ${CRON_SCHEDULE}"
echo "📝 Logs will be written to /app/logs/cron.log"

# Create a simple health check endpoint (optional)
echo "💚 Container is ready and running!"
echo "🔄 Cron daemon status: $(service cron status)"

# Keep the container running by tailing the cron log
echo "👀 Monitoring cron logs..."
touch /app/logs/cron.log
tail -f /app/logs/cron.log &

# Also tail the main application log
tail -f /app/logs/factorial-automation.log &

# Keep container alive
while true; do
    sleep 30
    # Check if cron is still running
    if ! pgrep cron > /dev/null; then
        echo "⚠️  Cron daemon stopped, restarting..."
        service cron start
    fi
done