#!/bin/bash

echo "=== Sphyra Wellness - Upload Migration Script ==="
echo ""

# Step 1: Backup existing uploads from the current backend container
echo "Step 1: Backing up existing uploads..."
docker cp sphyra-backend:/app/server/uploads/. /tmp/uploads-backup/ 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ Backup created in /tmp/uploads-backup/"
    ls -lah /tmp/uploads-backup/
else
    echo "⚠ No existing uploads found or container not running"
fi

echo ""
echo "Step 2: Stopping containers..."
docker-compose -f docker-compose.letsencrypt.yml down

echo ""
echo "Step 3: Starting containers with shared volume configuration..."
docker-compose -f docker-compose.letsencrypt.yml up -d

echo ""
echo "Step 4: Waiting for containers to be healthy..."
sleep 20

echo ""
echo "Step 5: Restoring uploads to shared volume..."
if [ -d "/tmp/uploads-backup" ]; then
    docker cp /tmp/uploads-backup/. sphyra-backend:/app/server/uploads/
    echo "✓ Files restored to shared volume"
else
    echo "⚠ No backup found, skipping restore"
fi

echo ""
echo "Step 6: Verifying files are accessible from both containers..."
echo ""
echo "--- Backend view (write access) ---"
docker exec sphyra-backend ls -lah /app/server/uploads/services/ 2>/dev/null || echo "No service images found"

echo ""
echo "--- Frontend view (read-only access) ---"
docker exec sphyra-frontend ls -lah /usr/share/nginx/html/uploads/services/ 2>/dev/null || echo "No service images found"

echo ""
echo "Step 7: Cleaning up temporary files..."
rm -rf /tmp/uploads-backup

echo ""
echo "=== Migration Complete! ==="
echo ""
echo "Test the fix by visiting your service images in the browser."
echo "If images still don't load, check the logs with:"
echo "  docker logs sphyra-frontend --tail 50"
echo "  docker logs sphyra-backend --tail 50"
