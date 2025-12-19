#!/bin/bash

# ========================================
# Fix Uploads Volume - HTTPS Private Network
# Recreates containers with proper volume mounts
# ========================================

set -e  # Exit on error

echo "=== Sphyra Wellness - Fix Uploads Volume ==="
echo ""

# Check if .env.private exists
if [ ! -f .env.private ]; then
    echo "❌ ERROR: .env.private file not found!"
    echo "Please ensure you're in the correct directory and .env.private exists."
    exit 1
fi

echo "Step 1: Loading environment configuration..."
set -a
source .env.private
set +a
echo "✓ Configuration loaded"
echo ""

echo "Step 2: Stopping containers..."
docker compose -f docker-compose.https-private.yml down
echo "✓ Containers stopped"
echo ""

echo "Step 3: Fixing volume permissions..."
echo "The uploads directory needs to be owned by the nodejs user (UID 1001)"
docker run --rm \
  -v sphyrawellness_uploads_data:/uploads \
  alpine sh -c "chown -R 1001:1001 /uploads && chmod -R 755 /uploads && mkdir -p /uploads/services /uploads/staff && chown -R 1001:1001 /uploads"
echo "✓ Permissions fixed"
echo ""

echo "Step 4: Recreating containers with proper volume mounts..."
docker compose -f docker-compose.https-private.yml up -d
echo "✓ Containers recreated"
echo ""

echo "Step 5: Waiting for containers to be healthy..."
sleep 10

# Check container health
echo "Checking container status..."
docker ps --filter "name=sphyra-" --format "table {{.Names}}\t{{.Status}}"
echo ""

echo "Step 6: Verifying volume mounts..."
echo ""
echo "--- Backend uploads directory (should be writable) ---"
docker exec sphyra-backend ls -la /app/server/uploads/ || echo "⚠ Backend not ready yet"
echo ""
echo "--- Frontend uploads directory (should be read-only) ---"
docker exec sphyra-frontend ls -la /usr/share/nginx/html/uploads/ || echo "⚠ Frontend not ready yet"
echo ""

echo "Step 7: Testing write permissions and volume sync..."
echo ""
echo "Test 1: Creating test file in uploads root..."
if docker exec sphyra-backend touch /app/server/uploads/test-volume-sync.txt 2>/dev/null; then
    echo "✓ Backend can write to uploads directory"

    echo ""
    echo "Test 2: Checking if frontend can see the test file..."
    if docker exec sphyra-frontend ls /usr/share/nginx/html/uploads/test-volume-sync.txt 2>/dev/null; then
        echo "✓ Volume sync working! Both containers share the same volume."
        docker exec sphyra-backend rm /app/server/uploads/test-volume-sync.txt
    else
        echo "❌ Volume sync NOT working! Containers cannot see shared files."
    fi

    echo ""
    echo "Test 3: Testing write to services subdirectory (where uploads actually go)..."
    if docker exec sphyra-backend touch /app/server/uploads/services/test-upload.txt 2>/dev/null; then
        echo "✓ Backend can write to services subdirectory"

        echo ""
        echo "Test 4: Checking if frontend can see service test file..."
        if docker exec sphyra-frontend ls /usr/share/nginx/html/uploads/services/test-upload.txt 2>/dev/null; then
            echo "✓ Service uploads will work correctly!"
            docker exec sphyra-backend rm /app/server/uploads/services/test-upload.txt
        else
            echo "❌ Frontend cannot see service uploads"
        fi
    else
        echo "❌ Backend cannot write to services subdirectory"
        echo "There may still be a permissions issue."
    fi
else
    echo "❌ Backend cannot write to uploads directory"
    echo "Permissions fix may have failed. Please check manually:"
    echo "  docker run --rm -v sphyrawellness_uploads_data:/uploads alpine ls -la /uploads"
fi
echo ""

echo "=== Fix Complete! ==="
echo ""
echo "IMPORTANT: All previously uploaded files were lost because:"
echo "1. Files were uploaded to containers without persistent volume mounts"
echo "2. When containers were removed, the uploaded files were deleted"
echo ""
echo "Next steps:"
echo "1. Visit https://${PRIVATE_DOMAIN:-sphyra.local}/servizi"
echo "2. Re-upload your service images"
echo "3. The images will now persist in the shared Docker volume"
echo ""
echo "To verify uploads are working:"
echo "  docker exec sphyra-backend ls -la /app/server/uploads/services/"
echo "  docker exec sphyra-frontend ls -la /usr/share/nginx/html/uploads/services/"
echo ""
echo "Both commands should show the same files."
echo ""
