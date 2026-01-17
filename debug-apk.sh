#!/bin/bash

echo "=== APK Repository Debug Script ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Checking if apk_files table exists in database...${NC}"
docker compose -f docker-compose.duckdns.yml exec -T postgres psql -U sphyra_user -d sphyra_wellness -c "\dt apk_files" 2>&1

echo ""
echo -e "${YELLOW}2. Checking apk_files table structure...${NC}"
docker compose -f docker-compose.duckdns.yml exec -T postgres psql -U sphyra_user -d sphyra_wellness -c "\d apk_files" 2>&1

echo ""
echo -e "${YELLOW}3. Checking applied migrations...${NC}"
docker compose -f docker-compose.duckdns.yml exec -T postgres psql -U sphyra_user -d sphyra_wellness -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;" 2>&1

echo ""
echo -e "${YELLOW}4. Checking backend container logs (last 30 lines)...${NC}"
docker compose -f docker-compose.duckdns.yml logs backend --tail=30 2>&1

echo ""
echo -e "${YELLOW}5. Checking if uploads/apk directory exists in backend container...${NC}"
docker compose -f docker-compose.duckdns.yml exec backend ls -la /app/uploads/ 2>&1

echo ""
echo -e "${YELLOW}6. Testing backend health endpoint...${NC}"
curl -s http://localhost:3001/health | jq . 2>&1 || echo "Backend not responding or jq not installed"

echo ""
echo -e "${YELLOW}7. Testing APK info endpoint (requires auth token)...${NC}"
echo "You need to provide your JWT token to test this endpoint"
echo "Run: curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:3001/api/upload/apk/info"

echo ""
echo -e "${GREEN}=== Debug Complete ===${NC}"
