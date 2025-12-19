#!/bin/bash

echo "=== Sphyra Wellness - Upload Migration Script (HTTPS Private Network) ==="
echo ""

# Configuration
COMPOSE_FILE="docker-compose.https-private.yml"
BACKEND_CONTAINER="sphyra-backend"
FRONTEND_CONTAINER="sphyra-frontend"
BACKUP_DIR="/tmp/uploads-backup"

# Step 1: Check if containers are running
echo "Step 1: Checking container status..."
if ! docker ps | grep -q "$BACKEND_CONTAINER"; then
    echo "⚠ Backend container is not running. Starting containers..."
    docker compose -f "$COMPOSE_FILE" up -d
    sleep 15
fi

# Step 2: Check for old volumes from previous deployments
echo ""
echo "Step 2: Checking for old upload volumes..."
OLD_VOLUMES=$(docker volume ls --format "{{.Name}}" | grep -E "uploads|sphyrawellness.*backend" | grep -v "sphyrawellness_uploads_data")

if [ -n "$OLD_VOLUMES" ]; then
    echo "Found old volumes:"
    echo "$OLD_VOLUMES"
    echo ""

    for volume in $OLD_VOLUMES; do
        echo "Attempting to extract from volume: $volume"
        # Create a temporary container to access the old volume
        docker run --rm -v "$volume:/old_data" -v "$BACKUP_DIR:/backup" alpine sh -c "cp -r /old_data/* /backup/ 2>/dev/null && echo '✓ Data extracted from $volume' || echo '⚠ No data found in $volume'"
    done
else
    echo "No old volumes found"
fi

# Step 3: Try to backup from running containers (if any data exists)
echo ""
echo "Step 3: Attempting to backup from running backend container..."
mkdir -p "$BACKUP_DIR"
docker cp "$BACKEND_CONTAINER:/app/server/uploads/." "$BACKUP_DIR/" 2>/dev/null
if [ $? -eq 0 ] && [ "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
    echo "✓ Backup created in $BACKUP_DIR/"
    echo "Files found:"
    find "$BACKUP_DIR" -type f | head -10
    FILE_COUNT=$(find "$BACKUP_DIR" -type f | wc -l)
    echo "Total files: $FILE_COUNT"
else
    echo "⚠ No existing uploads found in running container"
fi

# Step 4: If we have backup data, restore it
echo ""
if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
    echo "Step 4: Restoring uploads to shared volume..."
    docker cp "$BACKUP_DIR/." "$BACKEND_CONTAINER:/app/server/uploads/"
    if [ $? -eq 0 ]; then
        echo "✓ Files restored to shared volume"
    else
        echo "✗ Failed to restore files"
    fi
else
    echo "Step 4: No data to restore"
    echo ""
    echo "⚠ IMPORTANT: No uploaded files were found in:"
    echo "  - Running containers"
    echo "  - Old Docker volumes"
    echo "  - Backup directories"
    echo ""
    echo "This means either:"
    echo "  1. No files have been uploaded yet"
    echo "  2. Files were uploaded to a container that was removed"
    echo "  3. Files are in a different location on your system"
    echo ""
    echo "If you had previously uploaded files, you'll need to re-upload them."
fi

# Step 5: Verify files are accessible
echo ""
echo "Step 5: Verifying shared volume access..."
echo ""
echo "--- Backend view (write access) ---"
docker exec "$BACKEND_CONTAINER" ls -lah /app/server/uploads/ 2>/dev/null || echo "Directory is empty or inaccessible"

echo ""
echo "--- Backend services subdirectory ---"
docker exec "$BACKEND_CONTAINER" ls -lah /app/server/uploads/services/ 2>/dev/null || echo "No service images found"

echo ""
echo "--- Frontend view (read-only access) ---"
docker exec "$FRONTEND_CONTAINER" ls -lah /usr/share/nginx/html/uploads/ 2>/dev/null || echo "Directory is empty or inaccessible"

echo ""
echo "--- Frontend services subdirectory ---"
docker exec "$FRONTEND_CONTAINER" ls -lah /usr/share/nginx/html/uploads/services/ 2>/dev/null || echo "No service images found"

# Step 6: Check volume mount
echo ""
echo "Step 6: Verifying Docker volume configuration..."
echo "Uploads volume info:"
docker volume inspect sphyrawellness_uploads_data --format "Mountpoint: {{.Mountpoint}}" 2>/dev/null || echo "Volume not found"

# Step 7: Cleanup
echo ""
echo "Step 7: Cleaning up temporary files..."
rm -rf "$BACKUP_DIR"

echo ""
echo "=== Migration Complete! ==="
echo ""
echo "Next steps:"
echo "1. Test by visiting your services page in the browser"
echo "2. If images still don't load, they may need to be re-uploaded"
echo "3. Check logs if issues persist:"
echo "   docker logs sphyra-frontend --tail 50"
echo "   docker logs sphyra-backend --tail 50"
echo ""
