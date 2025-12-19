#!/bin/bash

# ========================================
# Rebuild Backend Container
# Rebuilds the backend to apply code changes
# ========================================

set -e

echo "=== Rebuilding Backend Container ==="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    exit 1
fi

echo "Step 1: Loading environment..."
set -a
source .env
set +a
echo "✓ Environment loaded"
echo ""

echo "Step 2: Stopping backend container..."
docker compose -f docker-compose.https-private.yml stop backend
echo "✓ Backend stopped"
echo ""

echo "Step 3: Rebuilding backend image..."
docker compose -f docker-compose.https-private.yml build --no-cache backend
echo "✓ Backend rebuilt"
echo ""

echo "Step 4: Starting backend container..."
docker compose -f docker-compose.https-private.yml up -d backend
echo "✓ Backend started"
echo ""

echo "Step 5: Waiting for backend to be healthy..."
sleep 15

echo "Checking backend status..."
docker ps --filter "name=sphyra-backend" --format "table {{.Names}}\t{{.Status}}"
echo ""

echo "Step 6: Verifying upload path..."
echo ""
echo "Backend should now save uploads to /app/server/uploads"
docker exec sphyra-backend ls -la /app/server/uploads/
echo ""

echo "=== Rebuild Complete! ==="
echo ""
echo "Next steps:"
echo "1. Try uploading an image through the admin panel"
echo "2. Check if the file appears in the uploads directory:"
echo "   docker exec sphyra-backend ls -la /app/server/uploads/services/"
echo ""
