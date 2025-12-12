#!/bin/bash

# ========================================
# Sphyra Wellness Lab - HTTPS Deploy Script
# ========================================

set -e

echo "🚀 Sphyra Wellness Lab - Deploy HTTPS"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ========================================
# 1. Check Prerequisites
# ========================================
echo "📋 Verifico prerequisiti..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker non installato!${NC}"
    echo "Installa Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose non installato!${NC}"
    echo "Installa Docker Compose v2: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker OK${NC}"

# ========================================
# 2. Check .env File
# ========================================
echo ""
echo "🔧 Verifico configurazione..."

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  File .env non trovato!${NC}"
    echo "Copio .env.https.example → .env"
    cp .env.https.example .env
    echo -e "${RED}❌ IMPORTANTE: Modifica .env con i tuoi dati prima di continuare!${NC}"
    echo "nano .env"
    exit 1
fi

# Load .env
export $(cat .env | grep -v '^#' | xargs)

# Check mandatory variables
if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "your-domain.com" ]; then
    echo -e "${RED}❌ DOMAIN non configurato in .env!${NC}"
    echo "Modifica .env e imposta il tuo dominio:"
    echo "DOMAIN=your-domain.com"
    exit 1
fi

if [ -z "$LETSENCRYPT_EMAIL" ] || [ "$LETSENCRYPT_EMAIL" = "admin@your-domain.com" ]; then
    echo -e "${RED}❌ LETSENCRYPT_EMAIL non configurato in .env!${NC}"
    echo "Modifica .env e imposta la tua email:"
    echo "LETSENCRYPT_EMAIL=admin@your-domain.com"
    exit 1
fi

if [ -z "$COUCHDB_PASSWORD" ] || [ "$COUCHDB_PASSWORD" = "change-this-secure-password-123" ]; then
    echo -e "${YELLOW}⚠️  ATTENZIONE: Password database non modificata!${NC}"
    read -p "Vuoi continuare comunque? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ Configurazione OK${NC}"
echo "   DOMAIN: $DOMAIN"
echo "   EMAIL:  $LETSENCRYPT_EMAIL"

# ========================================
# 3. Check DNS
# ========================================
echo ""
echo "🌐 Verifico DNS per $DOMAIN..."

if ! nslookup $DOMAIN > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  ATTENZIONE: DNS non risolve per $DOMAIN${NC}"
    echo "Let's Encrypt potrebbe fallire!"
    echo ""
    read -p "Vuoi continuare comunque? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    RESOLVED_IP=$(nslookup $DOMAIN | grep -A1 "Name:" | tail -1 | awk '{print $2}')
    echo -e "${GREEN}✅ DNS OK${NC}"
    echo "   $DOMAIN → $RESOLVED_IP"
fi

# ========================================
# 4. Check Ports
# ========================================
echo ""
echo "🔌 Verifico porte..."

check_port() {
    PORT=$1
    if netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
        echo -e "${YELLOW}⚠️  Porta $PORT già in uso!${NC}"
        netstat -tuln | grep ":$PORT "
        return 1
    fi
    return 0
}

PORTS_OK=true
check_port 80 || PORTS_OK=false
check_port 443 || PORTS_OK=false

if [ "$PORTS_OK" = false ]; then
    echo -e "${RED}Alcune porte sono già occupate!${NC}"
    read -p "Vuoi fermare i container esistenti? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose -f docker-compose.https.yml down
    else
        exit 1
    fi
fi

echo -e "${GREEN}✅ Porte disponibili${NC}"

# ========================================
# 5. Create Directories
# ========================================
echo ""
echo "📁 Creo directory necessarie..."

mkdir -p traefik/dynamic
mkdir -p certificates
chmod 600 certificates

echo -e "${GREEN}✅ Directory create${NC}"

# ========================================
# 6. Backup Existing Data
# ========================================
echo ""
echo "💾 Backup dati esistenti..."

BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

if docker volume ls | grep -q "couchdb_data"; then
    echo "Backup volume CouchDB..."
    docker run --rm -v sphyrawellness_couchdb_data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/couchdb_data.tar.gz -C /data .
    echo -e "${GREEN}✅ Backup salvato in $BACKUP_DIR${NC}"
fi

# ========================================
# 7. Build & Deploy
# ========================================
echo ""
echo "🏗️  Build e deploy..."

# Pull latest images
echo "Pulling immagini Docker..."
docker compose -f docker-compose.https.yml pull

# Build custom images
echo "Building applicazione..."
docker compose -f docker-compose.https.yml build --no-cache

# Start services
echo "Avvio servizi..."
docker compose -f docker-compose.https.yml up -d

echo -e "${GREEN}✅ Deploy completato!${NC}"

# ========================================
# 8. Wait for Services
# ========================================
echo ""
echo "⏳ Attendo avvio servizi..."

sleep 5

# Check container status
docker compose -f docker-compose.https.yml ps

# ========================================
# 9. Check HTTPS Certificate
# ========================================
echo ""
echo "🔒 Attendo certificato SSL..."
echo "(Potrebbe richiedere fino a 2 minuti)"

TIMEOUT=120
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
    if docker logs sphyra-traefik 2>&1 | grep -q "Certificate obtained"; then
        echo -e "${GREEN}✅ Certificato SSL ottenuto!${NC}"
        break
    fi

    if docker logs sphyra-traefik 2>&1 | grep -q "Error obtaining certificate"; then
        echo -e "${RED}❌ Errore ottenimento certificato!${NC}"
        echo ""
        echo "Logs Traefik:"
        docker logs sphyra-traefik 2>&1 | tail -20
        exit 1
    fi

    sleep 5
    ELAPSED=$((ELAPSED + 5))
    echo -n "."
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${YELLOW}⚠️  Timeout ottenimento certificato${NC}"
    echo "Verifica i logs: docker logs sphyra-traefik -f"
fi

# ========================================
# 10. Final Checks
# ========================================
echo ""
echo "✅ Verifiche finali..."

# Test HTTP redirect
echo "Test redirect HTTP → HTTPS..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L http://$DOMAIN 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✅ HTTP OK${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP response: $HTTP_CODE${NC}"
fi

# Test HTTPS
echo "Test HTTPS..."
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k https://$DOMAIN 2>/dev/null || echo "000")
if [ "$HTTPS_CODE" = "200" ]; then
    echo -e "${GREEN}✅ HTTPS OK${NC}"
else
    echo -e "${YELLOW}⚠️  HTTPS response: $HTTPS_CODE${NC}"
fi

# ========================================
# 11. Success Message
# ========================================
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 DEPLOY COMPLETATO!${NC}"
echo "=========================================="
echo ""
echo "🌐 La tua applicazione è disponibile su:"
echo "   https://$DOMAIN"
echo ""
echo "📊 Dashboard Traefik (se abilitato):"
echo "   https://traefik.$DOMAIN"
echo ""
echo "📝 Comandi utili:"
echo "   Status:  docker compose -f docker-compose.https.yml ps"
echo "   Logs:    docker compose -f docker-compose.https.yml logs -f"
echo "   Stop:    docker compose -f docker-compose.https.yml down"
echo ""
echo "🔍 Verifica SSL:"
echo "   https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
echo "📚 Documentazione:"
echo "   cat HTTPS-DEPLOYMENT.md"
echo ""
echo "=========================================="
