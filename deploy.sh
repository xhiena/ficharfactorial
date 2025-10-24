#!/bin/bash

# Production deployment script for Docker server
set -e

echo "🚀 Deploying Factorial Time Tracker to production..."

# Configuration
IMAGE_NAME="factorial-time-tracker"
CONTAINER_NAME="factorial-time-tracker-prod"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Stop existing container if running
if docker ps -q --filter "name=$CONTAINER_NAME" | grep -q .; then
    echo "📦 Stopping existing container..."
    docker stop "$CONTAINER_NAME"
    
    # Backup logs
    echo "💾 Backing up logs..."
    docker cp "$CONTAINER_NAME:/app/logs" "$BACKUP_DIR/" 2>/dev/null || echo "No logs to backup"
    
    # Remove old container
    docker rm "$CONTAINER_NAME"
fi

# Build new image
echo "🔨 Building new image..."
docker build -f Dockerfile.prod -t "$IMAGE_NAME:latest" .

# Tag with timestamp
docker tag "$IMAGE_NAME:latest" "$IMAGE_NAME:$(date +%Y%m%d_%H%M%S)"

# Deploy with production compose file
echo "🚀 Starting new container..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for container to be healthy
echo "🔍 Waiting for container to be healthy..."
timeout 60 bash -c 'until docker-compose -f docker-compose.prod.yml ps | grep -q "healthy\|Up"; do sleep 2; done'

# Check status
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "✅ Deployment successful!"
    echo "📊 Container status:"
    docker-compose -f docker-compose.prod.yml ps
    
    echo "📋 Logs location: ./logs"
    echo "🔍 View logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "⚙️  Check cron: docker-compose -f docker-compose.prod.yml exec factorial-logger cat /etc/cron.d/factorial-cron"
else
    echo "❌ Deployment failed!"
    echo "📋 Container logs:"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi

# Cleanup old images (keep last 3)
echo "🧹 Cleaning up old images..."
docker images "$IMAGE_NAME" --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | \
    tail -n +2 | head -n -3 | awk '{print $1}' | xargs -r docker rmi

echo "🎉 Deployment complete!"