# Troubleshooting Missing Uploaded Files

## Problem
After starting the HTTPS private network configuration, uploaded images return 404 errors:
```
2025/12/19 21:35:02 [error] 29#29: *33 open() "/usr/share/nginx/html/uploads/services/1000003674-1766180102372-112670337.jpg" failed (2: No such file or directory)
```

## Root Cause
The uploaded files were stored in the previous container's filesystem, which was lost when the containers were recreated with the new shared volume configuration.

Alternatively, if the migration script ran but images still don't load, the containers may not be using the updated docker-compose configuration with proper volume mounts.

## Solution

### Step 1: Fix Volume Mounts (If Migration Script Didn't Help)

If you ran the migration script but images still return 404 errors, the containers need to be recreated with proper volume mounts:

```bash
./fix-uploads-volume.sh
```

This script will:
1. Stop all containers
2. Recreate them with the correct volume configuration
3. Verify that both backend and frontend can access the shared volume
4. Test volume synchronization

**IMPORTANT**: After running this script, you'll need to re-upload all service images because previous uploads were not persisted to the shared volume.

### Step 2: Run the Migration Script (For Recovering Old Files)

If you have old files from a previous installation, run the migration script:

```bash
./migrate-uploads-https-private.sh
```

This script will:
1. Check for running containers
2. Search for old Docker volumes that might contain uploaded files
3. Attempt to extract and restore any found files
4. Verify the shared volume is working correctly
5. Provide a detailed report

### Step 3: Manual Migration (Advanced)

If you know where the old uploaded files are located:

#### From a backup directory:
```bash
# Copy files to the backend container
docker cp /path/to/backup/uploads/. sphyra-backend:/app/server/uploads/

# Verify files are accessible from both containers
docker exec sphyra-backend ls -lah /app/server/uploads/services/
docker exec sphyra-frontend ls -lah /usr/share/nginx/html/uploads/services/
```

#### From an old Docker volume:
```bash
# List all volumes
docker volume ls

# Extract from old volume (replace OLD_VOLUME_NAME)
docker run --rm \
  -v OLD_VOLUME_NAME:/source \
  -v sphyrawellness_uploads_data:/dest \
  alpine sh -c "cp -r /source/* /dest/"
```

### Step 4: Re-upload Files

If files cannot be recovered:
1. Log into the admin panel
2. Re-upload service images through the UI
3. Files will automatically be saved to the shared volume

## Verifying the Fix

After migration, verify files are accessible:

```bash
# Check backend (should have write access)
docker exec sphyra-backend ls -lah /app/server/uploads/services/

# Check frontend (should have read access)
docker exec sphyra-frontend ls -lah /usr/share/nginx/html/uploads/services/

# Check the shared volume
docker volume inspect sphyrawellness_uploads_data
```

Then visit your services page in the browser - images should load correctly.

## Understanding the Shared Volume Setup

The `docker-compose.https-private.yml` configuration uses a shared Docker volume:

```yaml
volumes:
  uploads_data:
    driver: local

services:
  backend:
    volumes:
      - uploads_data:/app/server/uploads  # Backend writes here

  frontend:
    volumes:
      - uploads_data:/usr/share/nginx/html/uploads:ro  # Frontend reads from here
```

This ensures:
- Backend can upload new files
- Frontend can serve the same files via NGINX
- Files persist across container restarts
- No need to copy files between containers

## Preventing Future Data Loss

To back up uploaded files:

```bash
# Create a backup
docker cp sphyra-backend:/app/server/uploads/. ~/sphyra-uploads-backup/

# Or backup the volume directly
docker run --rm \
  -v sphyrawellness_uploads_data:/source \
  -v ~/sphyra-uploads-backup:/backup \
  alpine sh -c "cp -r /source/* /backup/"
```

## Additional Help

If issues persist:
- Check container logs: `docker logs sphyra-frontend --tail 50`
- Check backend logs: `docker logs sphyra-backend --tail 50`
- Verify network connectivity: `docker exec sphyra-frontend wget -O- http://sphyra-backend:3001/health`
