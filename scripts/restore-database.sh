#!/bin/bash
# ============================================================================
# Database Restore Script - Sphyra Wellness Lab
# ============================================================================
# Ripristina il database PostgreSQL da un backup
#
# UTILIZZO:
# ./scripts/restore-database.sh <backup_file>
#
# ESEMPIO:
# ./scripts/restore-database.sh backups/sphyra_wellness_20240115_020000.sql.gz
#
# ⚠️ ATTENZIONE: Questo script SOVRASCRIVE il database esistente!
# ============================================================================

set -e  # Exit on error

# Configuration
CONTAINER_NAME="sphyra-postgres"
DB_NAME="${POSTGRES_DB:-sphyra_wellness}"
DB_USER="${POSTGRES_USER:-sphyra_user}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ ERROR: No backup file specified${NC}"
    echo ""
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 backups/sphyra_wellness_20240115_020000.sql.gz"
    echo ""
    echo "Available backups:"
    if [ -d "./backups" ]; then
        ls -lh ./backups/*.sql.gz 2>/dev/null || echo "  No backups found"
    else
        echo "  No backup directory found"
    fi
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ ERROR: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo "============================================================================"
echo "♻️  Sphyra Wellness Lab - Database Restore"
echo "============================================================================"
echo "Date: $(date)"
echo "Database: $DB_NAME"
echo "Container: $CONTAINER_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
    echo -e "${RED}❌ ERROR: Container $CONTAINER_NAME is not running${NC}"
    exit 1
fi

# Warning prompt
echo -e "${YELLOW}⚠️  WARNING: This will OVERWRITE the current database!${NC}"
echo -e "${YELLOW}   All current data will be LOST!${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled by user"
    exit 0
fi

echo ""
echo "🔄 Starting restore..."

# Create a safety backup before restore
SAFETY_BACKUP="./backups/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
echo "📦 Creating safety backup first: $SAFETY_BACKUP"
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$SAFETY_BACKUP"
echo -e "${GREEN}✅ Safety backup created${NC}"
echo ""

# Drop existing connections
echo "🔌 Dropping existing database connections..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
    2>/dev/null || true

# Restore from backup
echo "♻️  Restoring database from backup..."
if gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database restored successfully${NC}"
else
    echo -e "${RED}❌ ERROR: Restore failed${NC}"
    echo -e "${YELLOW}   You can restore from safety backup: $SAFETY_BACKUP${NC}"
    exit 1
fi

echo ""
echo "============================================================================"
echo -e "${GREEN}✅ Restore process completed${NC}"
echo "   Restored from: $BACKUP_FILE"
echo "   Safety backup: $SAFETY_BACKUP"
echo "============================================================================"
echo ""

exit 0
