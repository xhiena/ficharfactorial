#!/bin/bash

# Test script for Docker setup
echo "🐳 Testing Factorial Time Tracker Docker Setup"
echo "=============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "📝 Please edit .env file with your Factorial credentials:"
        echo "   - FACTORIAL_EMAIL=your-email@example.com"
        echo "   - FACTORIAL_PASSWORD=your-password"
        exit 1
    else
        echo "❌ No .env.example found. Please create .env manually."
        exit 1
    fi
fi

echo "✅ .env file exists"

# Check if required fields are set in .env
if ! grep -q "FACTORIAL_EMAIL.*@" .env || ! grep -q "FACTORIAL_PASSWORD=.." .env; then
    echo "⚠️  Please update .env file with your actual Factorial credentials"
    exit 1
fi

echo "✅ Credentials configured in .env"

# Build the Docker image
echo "🔨 Building Docker image..."
if docker build -t factorial-time-tracker . > /dev/null 2>&1; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Docker build failed"
    exit 1
fi

# Test run the container (dry run)
echo "🧪 Testing container..."
if docker run --rm factorial-time-tracker node dist/index.js --help > /dev/null 2>&1; then
    echo "✅ Container test passed"
else
    echo "❌ Container test failed"
    exit 1
fi

echo ""
echo "🎉 Docker setup is ready!"
echo ""
echo "To start the automated time logging:"
echo "   docker-compose up -d"
echo ""
echo "To monitor logs:"
echo "   docker-compose logs -f"
echo ""
echo "To stop:"
echo "   docker-compose down"