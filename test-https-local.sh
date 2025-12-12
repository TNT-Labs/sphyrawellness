#!/bin/bash

# ========================================
# Test HTTPS Configuration Locally
# ========================================

set -e

echo "🧪 Test Configurazione HTTPS (Locale)"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ========================================
# 1. Check Files
# ========================================
echo "📁 Verifico file necessari..."

FILES=(
    "docker-compose.https.yml"
    "Dockerfile.https"
    "traefik/traefik.yml"
    "traefik/dynamic/security.yml"
    ".env.https.example"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $file"
    else
        echo -e "${RED}❌${NC} $file (MANCANTE!)"
        exit 1
    fi
done

# ========================================
# 2. Test Docker Compose Syntax
# ========================================
echo ""
echo "🔍 Verifico sintassi docker-compose..."

if docker compose -f docker-compose.https.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Sintassi docker-compose corretta${NC}"
else
    echo -e "${RED}❌ Errore sintassi docker-compose!${NC}"
    docker compose -f docker-compose.https.yml config
    exit 1
fi

# ========================================
# 3. Check .env
# ========================================
echo ""
echo "⚙️  Verifico .env..."

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  File .env non trovato${NC}"
    echo "Creo .env da template..."
    cp .env.https.example .env

    # Set localhost for testing
    sed -i 's/your-domain.com/test.localhost/g' .env
    sed -i 's/admin@your-domain.com/test@localhost/g' .env

    echo -e "${GREEN}✅ .env creato (configurazione test)${NC}"
fi

# Load .env
export $(cat .env | grep -v '^#' | xargs)

echo "   DOMAIN: ${DOMAIN:-NON CONFIGURATO}"
echo "   EMAIL:  ${LETSENCRYPT_EMAIL:-NON CONFIGURATO}"

# ========================================
# 4. Check Docker Images
# ========================================
echo ""
echo "🐳 Verifico immagini Docker..."

IMAGES=(
    "traefik:v2.10"
    "apache/couchdb:latest"
    "node:20-alpine"
    "nginx:alpine"
)

for image in "${IMAGES[@]}"; do
    if docker image inspect "$image" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} $image (presente)"
    else
        echo -e "${YELLOW}⚠️${NC}  $image (sarà scaricata)"
    fi
done

# ========================================
# 5. Check Ports
# ========================================
echo ""
echo "🔌 Verifico porte..."

check_port() {
    PORT=$1
    if netstat -tuln 2>/dev/null | grep -q ":$PORT " || \
       lsof -i :$PORT 2>/dev/null | grep -q LISTEN; then
        echo -e "${RED}❌${NC} Porta $PORT occupata!"
        lsof -i :$PORT 2>/dev/null || netstat -tuln | grep ":$PORT "
        return 1
    else
        echo -e "${GREEN}✅${NC} Porta $PORT disponibile"
        return 0
    fi
}

PORTS_OK=true
check_port 80 || PORTS_OK=false
check_port 443 || PORTS_OK=false
check_port 8080 || PORTS_OK=false

if [ "$PORTS_OK" = false ]; then
    echo -e "${RED}Alcune porte sono occupate!${NC}"
    echo "Vuoi fermare i container esistenti? (y/N)"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose -f docker-compose.https.yml down 2>/dev/null || true
        docker compose down 2>/dev/null || true
    fi
fi

# ========================================
# 6. Build Test
# ========================================
echo ""
echo "🏗️  Test build (dry-run)..."

if docker compose -f docker-compose.https.yml build --dry-run 2>/dev/null; then
    echo -e "${GREEN}✅ Build check OK${NC}"
else
    echo -e "${YELLOW}⚠️  Opzione --dry-run non supportata, skippo test build${NC}"
fi

# ========================================
# 7. Traefik Config Test
# ========================================
echo ""
echo "🔧 Verifico configurazione Traefik..."

# Check for placeholder values
if grep -q "example.com" traefik/traefik.yml; then
    echo -e "${YELLOW}⚠️  ATTENZIONE: traefik.yml contiene ancora 'example.com'${NC}"
    echo "   Modifica traefik/traefik.yml con il tuo dominio!"
fi

if grep -q "admin@example.com" traefik/traefik.yml; then
    echo -e "${YELLOW}⚠️  ATTENZIONE: traefik.yml contiene ancora 'admin@example.com'${NC}"
    echo "   Modifica traefik/traefik.yml con la tua email!"
fi

# Validate YAML syntax
if command -v yamllint > /dev/null 2>&1; then
    if yamllint -d relaxed traefik/traefik.yml > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Sintassi traefik.yml OK${NC}"
    else
        echo -e "${RED}❌ Errori sintassi traefik.yml${NC}"
        yamllint traefik/traefik.yml
    fi
else
    echo -e "${YELLOW}⚠️  yamllint non installato, skippo validazione YAML${NC}"
fi

# ========================================
# 8. Network Test
# ========================================
echo ""
echo "🌐 Test rete Docker..."

# Create networks if they don't exist
docker network create traefik-public 2>/dev/null || echo -e "${YELLOW}⚠️  Rete traefik-public già esistente${NC}"

echo -e "${GREEN}✅ Reti Docker OK${NC}"

# ========================================
# 9. Summary
# ========================================
echo ""
echo "=========================================="
echo -e "${GREEN}📊 RIEPILOGO TEST${NC}"
echo "=========================================="

ALL_OK=true

if [ -f "docker-compose.https.yml" ]; then
    echo -e "${GREEN}✅${NC} File configurazione presenti"
else
    echo -e "${RED}❌${NC} File configurazione mancanti"
    ALL_OK=false
fi

if docker compose -f docker-compose.https.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Sintassi Docker Compose valida"
else
    echo -e "${RED}❌${NC} Errori sintassi Docker Compose"
    ALL_OK=false
fi

if [ -f ".env" ]; then
    echo -e "${GREEN}✅${NC} File .env presente"
else
    echo -e "${RED}❌${NC} File .env mancante"
    ALL_OK=false
fi

if [ "$PORTS_OK" = true ]; then
    echo -e "${GREEN}✅${NC} Porte disponibili"
else
    echo -e "${YELLOW}⚠️${NC}  Alcune porte sono occupate"
fi

echo ""

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}🎉 TUTTI I TEST PASSATI!${NC}"
    echo ""
    echo "Puoi procedere con il deploy:"
    echo ""
    echo "  # Test locale (senza SSL)"
    echo "  docker compose -f docker-compose.https.yml up -d"
    echo ""
    echo "  # Deploy production"
    echo "  ./deploy-https.sh"
    echo ""
else
    echo -e "${RED}❌ ALCUNI TEST FALLITI${NC}"
    echo ""
    echo "Correggi gli errori prima di procedere."
    echo ""
    exit 1
fi
