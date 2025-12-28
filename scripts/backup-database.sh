#!/bin/bash
# ============================================================================
# Database Backup Script - Sphyra Wellness Lab
# ============================================================================
# Esegue backup automatico del database PostgreSQL
#
# UTILIZZO:
# 1. Manuale: ./scripts/backup-database.sh
# 2. Crontab: 0 2 * * * /path/to/sphyrawellness/scripts/backup-database.sh
#
# REQUISITI:
# - Docker e docker compose installati
# - Container sphyra-postgres in esecuzione
# ============================================================================

set -e  # Exit on error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER_NAME="sphyra-postgres"
DB_NAME="${POSTGRES_DB:-sphyra_wellness}"
DB_USER="${POSTGRES_USER:-sphyra_user}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"  # Keep backups for 30 days
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sphyra_wellness_$DATE.sql.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================================================"
echo "📦 Sphyra Wellness Lab - Database Backup"
echo "============================================================================"
echo "Date: $(date)"
echo "Database: $DB_NAME"
echo "Container: $CONTAINER_NAME"
echo ""

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    echo "📁 Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
    echo -e "${RED}❌ ERROR: Container $CONTAINER_NAME is not running${NC}"
    exit 1
fi

# Perform backup
echo "🔄 Starting backup..."
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup completed successfully${NC}"
    echo "   File: $BACKUP_FILE"
    echo "   Size: $BACKUP_SIZE"
else
    echo -e "${RED}❌ ERROR: Backup failed${NC}"
    rm -f "$BACKUP_FILE"  # Remove incomplete backup
    exit 1
fi

# Clean old backups (older than RETENTION_DAYS)
echo ""
echo "🧹 Cleaning old backups (keeping last $RETENTION_DAYS days)..."
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "sphyra_wellness_*.sql.gz" -type f -mtime +$RETENTION_DAYS)

if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r file; do
        echo "   Deleting: $file"
        rm -f "$file"
    done
    echo -e "${GREEN}✅ Old backups cleaned${NC}"
else
    echo "   No old backups to delete"
fi

# Summary
echo ""
echo "============================================================================"
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "sphyra_wellness_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "📊 Backup Summary:"
echo "   Total backups: $TOTAL_BACKUPS"
echo "   Total size: $TOTAL_SIZE"
echo "   Latest: $BACKUP_FILE"
echo "============================================================================"
echo -e "${GREEN}✅ Backup process completed${NC}"
echo ""

# Optional: Test backup integrity (uncomment to enable)
# echo "🔍 Testing backup integrity..."
# if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
#     echo -e "${GREEN}✅ Backup file integrity verified${NC}"
# else
#     echo -e "${RED}❌ WARNING: Backup file may be corrupted${NC}"
#     exit 1
# fi

exit 0
