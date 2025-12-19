#!/bin/bash

# ========================================
# Sphyra Wellness Lab - Cloudflare Quick Tunnel Deploy
# Deploy IMMEDIATO senza configurazione DNS!
# ========================================

set -e

echo "🚀 Sphyra Wellness Lab - Deploy Quick Tunnel"
echo "=============================================="
echo ""
echo "ℹ️  Quick Tunnel genera automaticamente un URL tipo:"
echo "   https://sphyrawellness-xxx.trycloudflare.com"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
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
    echo "Copio .env.quicktunnel.example → .env"
    cp .env.quicktunnel.example .env
    echo -e "${YELLOW}⚠️  IMPORTANTE: Modifica le password in .env!${NC}"
    echo ""
    read -p "Vuoi modificare .env ora? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        nano .env
    else
        echo -e "${YELLOW}⚠️  Ricordati di modificare .env prima del deploy in produzione!${NC}"
    fi
fi

# Load .env
export $(cat .env | grep -v '^#' | xargs 2>/dev/null || true)

# Check important variables
if [ -z "$COUCHDB_PASSWORD" ] || [ "$COUCHDB_PASSWORD" = "your-secure-password-here" ]; then
    echo -e "${YELLOW}⚠️  ATTENZIONE: Password database non modificata!${NC}"
    read -p "Vuoi continuare comunque? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-jwt-secret-here-change-me" ]; then
    echo -e "${YELLOW}⚠️  ATTENZIONE: JWT_SECRET non modificato!${NC}"
    read -p "Vuoi continuare comunque? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ Configurazione OK${NC}"

# ========================================
# 3. Info Quick Tunnel
# ========================================
echo ""
echo -e "${BLUE}ℹ️  Cloudflare Quick Tunnel Info:${NC}"
echo "   ✅ NESSUNA configurazione DNS necessaria"
echo "   ✅ NESSUN token richiesto"
echo "   ✅ URL generato automaticamente"
echo "   ✅ Deploy in 2 minuti!"
echo ""
echo -e "${YELLOW}⚠️  Limitazioni:${NC}"
echo "   • URL casuale ad ogni riavvio (non permanente)"
echo "   • Ideale per test, demo, sviluppo"
echo "   • Per produzione: usa deploy-cloudflare.sh con dominio personalizzato"
echo ""

# ========================================
# 4. Create Directories
# ========================================
echo "📁 Creo directory necessarie..."

mkdir -p nginx/conf.d
mkdir -p nginx_logs

echo -e "${GREEN}✅ Directory create${NC}"

# ========================================
# 5. Backup Existing Data
# ========================================
echo ""
echo "💾 Backup dati esistenti..."

BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

if docker volume ls | grep -q "couchdb_data"; then
    echo "Backup volume CouchDB..."
    docker run --rm -v sphyrawellness_couchdb_data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/couchdb_data.tar.gz -C /data . 2>/dev/null || true
    if [ -f "$BACKUP_DIR/couchdb_data.tar.gz" ]; then
        echo -e "${GREEN}✅ Backup salvato in $BACKUP_DIR${NC}"
    fi
fi

# ========================================
# 6. Stop Existing Services
# ========================================
echo ""
echo "🛑 Fermo servizi esistenti..."

# Stop any existing deployment
docker compose -f docker-compose.letsencrypt.yml down 2>/dev/null || true
docker compose -f docker-compose.https-private.yml down 2>/dev/null || true
docker compose -f docker-compose.cloudflare.yml down 2>/dev/null || true
docker compose -f docker-compose.quicktunnel.yml down 2>/dev/null || true

echo -e "${GREEN}✅ Servizi fermati${NC}"

# ========================================
# 7. Build & Deploy
# ========================================
echo ""
echo "🏗️  Build e deploy..."

# Pull latest images
echo "Pulling immagini Docker..."
docker compose -f docker-compose.quicktunnel.yml pull

# Build custom images
echo "Building applicazione..."
docker compose -f docker-compose.quicktunnel.yml build --no-cache

# Start services
echo "Avvio servizi..."
docker compose -f docker-compose.quicktunnel.yml up -d

echo -e "${GREEN}✅ Deploy completato!${NC}"

# ========================================
# 8. Wait for Services
# ========================================
echo ""
echo "⏳ Attendo avvio servizi..."

sleep 10

# Check container status
echo ""
echo "📊 Stato container:"
docker compose -f docker-compose.quicktunnel.yml ps

# ========================================
# 9. Get Quick Tunnel URL
# ========================================
echo ""
echo "🔍 Recupero URL del Quick Tunnel..."
echo "(Attendo 20 secondi per generare l'URL)"
echo ""

sleep 20

# Try to extract URL from logs
TUNNEL_URL=$(docker logs sphyra-quicktunnel 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | head -1)

if [ -n "$TUNNEL_URL" ]; then
    echo ""
    echo "=========================================="
    echo -e "${GREEN}🎉 TUNNEL ATTIVO!${NC}"
    echo "=========================================="
    echo ""
    echo -e "${MAGENTA}🌐 Il tuo sito è disponibile su:${NC}"
    echo ""
    echo -e "   ${GREEN}${TUNNEL_URL}${NC}"
    echo ""
    echo "=========================================="
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
    echo "   • Questo URL è TEMPORANEO"
    echo "   • Cambierà ad ogni riavvio del container"
    echo "   • Salva questo URL per usare il sito"
    echo ""
    echo -e "${BLUE}💡 Per un URL permanente:${NC}"
    echo "   1. Registra un dominio"
    echo "   2. Configura Cloudflare DNS"
    echo "   3. Usa: ./deploy-cloudflare.sh"
    echo ""
else
    echo -e "${YELLOW}⚠️  URL non ancora disponibile nei log${NC}"
    echo ""
    echo "Attendi altri 30 secondi e controlla manualmente:"
    echo ""
    echo "   ${BLUE}docker logs sphyra-quicktunnel${NC}"
    echo ""
    echo "Cerca una riga tipo:"
    echo "   https://sphyrawellness-xxx.trycloudflare.com"
    echo ""
fi

# ========================================
# 10. Final Info
# ========================================
echo "📝 Comandi utili:"
echo "   URL tunnel:  docker logs sphyra-quicktunnel | grep trycloudflare"
echo "   Status:      docker compose -f docker-compose.quicktunnel.yml ps"
echo "   Logs:        docker compose -f docker-compose.quicktunnel.yml logs -f"
echo "   Logs tunnel: docker logs -f sphyra-quicktunnel"
echo "   Stop:        docker compose -f docker-compose.quicktunnel.yml down"
echo ""
echo "🔒 Primo accesso:"
echo "   Username: admin"
echo "   Password: admin123 (cambiala subito!)"
echo ""
echo "📚 Documentazione:"
echo "   cat docs/QUICKTUNNEL_SETUP_IT.md"
echo ""
echo "=========================================="
