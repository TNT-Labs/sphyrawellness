#!/bin/bash

# ========================================
# Sphyra Wellness Lab - Cloudflare Tunnel Deploy Script
# ========================================

set -e

echo "🌐 Sphyra Wellness Lab - Deploy con Cloudflare Tunnel"
echo "======================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    echo "Copio .env.cloudflare.example → .env"
    cp .env.cloudflare.example .env
    echo -e "${RED}❌ IMPORTANTE: Modifica .env con i tuoi dati prima di continuare!${NC}"
    echo "nano .env"
    exit 1
fi

# Load .env
export $(cat .env | grep -v '^#' | xargs)

# Check mandatory variables
if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "esempio.com" ]; then
    echo -e "${RED}❌ DOMAIN non configurato in .env!${NC}"
    echo "Modifica .env e imposta il tuo dominio:"
    echo "DOMAIN=tuodominio.com"
    exit 1
fi

if [ -z "$CLOUDFLARE_TUNNEL_TOKEN" ] || [ "$CLOUDFLARE_TUNNEL_TOKEN" = "your-cloudflare-tunnel-token-here" ]; then
    echo -e "${RED}❌ CLOUDFLARE_TUNNEL_TOKEN non configurato in .env!${NC}"
    echo ""
    echo "Per ottenere il token:"
    echo "1. Vai su Cloudflare Dashboard"
    echo "2. Zero Trust → Networks → Tunnels"
    echo "3. Crea un tunnel e copia il token"
    echo ""
    echo "Vedi la guida: docs/CLOUDFLARE_TUNNEL_SETUP_IT.md"
    exit 1
fi

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
echo "   DOMAIN: $DOMAIN"

# ========================================
# 3. Info Cloudflare Tunnel
# ========================================
echo ""
echo -e "${BLUE}ℹ️  Cloudflare Tunnel Info:${NC}"
echo "   ✅ Nessuna porta da aprire sul router"
echo "   ✅ Funziona con CGNAT (es. Fastweb)"
echo "   ✅ SSL/TLS gestito da Cloudflare"
echo "   ✅ IP del server nascosto"
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

echo -e "${GREEN}✅ Servizi fermati${NC}"

# ========================================
# 7. Build & Deploy
# ========================================
echo ""
echo "🏗️  Build e deploy..."

# Pull latest images
echo "Pulling immagini Docker..."
docker compose -f docker-compose.cloudflare.yml pull

# Build custom images
echo "Building applicazione..."
docker compose -f docker-compose.cloudflare.yml build --no-cache

# Start services
echo "Avvio servizi..."
docker compose -f docker-compose.cloudflare.yml up -d

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
docker compose -f docker-compose.cloudflare.yml ps

# ========================================
# 9. Check Cloudflare Tunnel Connection
# ========================================
echo ""
echo "🔍 Verifico connessione Cloudflare Tunnel..."
echo "(Attendo 15 secondi per stabilire la connessione)"

sleep 15

# Check cloudflared logs
if docker logs sphyra-cloudflared 2>&1 | grep -q "Connection.*registered"; then
    echo -e "${GREEN}✅ Tunnel Cloudflare connesso!${NC}"
elif docker logs sphyra-cloudflared 2>&1 | grep -q "failed"; then
    echo -e "${RED}❌ Errore connessione tunnel!${NC}"
    echo ""
    echo "Logs cloudflared:"
    docker logs sphyra-cloudflared 2>&1 | tail -20
    echo ""
    echo "Verifica:"
    echo "1. Che il token in .env sia corretto"
    echo "2. Che il tunnel sia attivo in Cloudflare Dashboard"
    echo "3. Che il routing sia configurato (nginx:80)"
    exit 1
else
    echo -e "${YELLOW}⚠️  Stato tunnel non chiaro, verifica i logs:${NC}"
    echo "docker logs sphyra-cloudflared"
fi

# ========================================
# 10. Final Checks
# ========================================
echo ""
echo "✅ Verifiche finali..."

# Test HTTPS (da remoto)
echo ""
echo "Test connessione HTTPS..."
echo "(Attendi 30 secondi per propagazione DNS)"
sleep 30

HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN 2>/dev/null || echo "000")
if [ "$HTTPS_CODE" = "200" ]; then
    echo -e "${GREEN}✅ HTTPS OK - Sito raggiungibile!${NC}"
elif [ "$HTTPS_CODE" = "000" ]; then
    echo -e "${YELLOW}⚠️  Non riesco a raggiungere il sito${NC}"
    echo "   Potrebbero essere necessari alcuni minuti per la propagazione DNS"
    echo "   Riprova tra 5-10 minuti"
else
    echo -e "${YELLOW}⚠️  HTTPS response: $HTTPS_CODE${NC}"
    echo "   Verifica la configurazione del tunnel in Cloudflare"
fi

# ========================================
# 11. Success Message
# ========================================
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 DEPLOY COMPLETATO!${NC}"
echo "=========================================="
echo ""
echo "🌐 La tua applicazione dovrebbe essere disponibile su:"
echo "   https://$DOMAIN"
echo ""
echo "📊 Verifica tunnel su Cloudflare Dashboard:"
echo "   Zero Trust → Networks → Tunnels"
echo "   Il tunnel dovrebbe essere 'Healthy' (verde)"
echo ""
echo "📝 Comandi utili:"
echo "   Status:     docker compose -f docker-compose.cloudflare.yml ps"
echo "   Logs:       docker compose -f docker-compose.cloudflare.yml logs -f"
echo "   Logs tunnel: docker logs -f sphyra-cloudflared"
echo "   Stop:       docker compose -f docker-compose.cloudflare.yml down"
echo ""
echo "🔒 Primo accesso:"
echo "   Username: admin"
echo "   Password: admin123 (cambiala subito!)"
echo ""
echo "📚 Documentazione completa:"
echo "   cat docs/CLOUDFLARE_TUNNEL_SETUP_IT.md"
echo ""
echo "🎯 Prossimi passi:"
echo "   1. Visita https://$DOMAIN"
echo "   2. Cambia la password di admin"
echo "   3. Configura SendGrid per le email (opzionale)"
echo "   4. Configura backup automatici"
echo ""
echo "=========================================="
