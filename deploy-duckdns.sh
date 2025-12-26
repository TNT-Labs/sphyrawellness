#!/bin/bash

# ========================================
# Sphyra Wellness Lab - Deploy HTTPS con DuckDNS
# Domain: sphyrawellnesslab.duckdns.org
# ========================================

set -e

echo "🚀 Sphyra Wellness Lab - Deploy HTTPS con DuckDNS"
echo "=================================================="
echo "Domain: sphyrawellnesslab.duckdns.org"
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
    echo -e "${RED}❌ File .env non trovato!${NC}"
    echo "Creo .env dal template..."

    # Controlla se esiste il template
    if [ -f .env.letsencrypt.example ]; then
        cp .env.letsencrypt.example .env
        echo -e "${YELLOW}⚠️  File .env creato. Modifica i seguenti valori:${NC}"
        echo "   - DOMAIN=sphyrawellnesslab.duckdns.org"
        echo "   - EMAIL=tua-email@esempio.com"
        echo "   - COUCHDB_PASSWORD=password-sicura"
        echo "   - JWT_SECRET=jwt-secret-sicuro"
        echo ""
        echo "Modifica .env con: nano .env"
        exit 1
    else
        echo -e "${RED}❌ Template .env.letsencrypt.example non trovato!${NC}"
        exit 1
    fi
fi

# Load .env
export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)

# Check mandatory variables
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ DOMAIN non configurato in .env!${NC}"
    exit 1
fi

if [ "$DOMAIN" != "sphyrawellnesslab.duckdns.org" ]; then
    echo -e "${YELLOW}⚠️  ATTENZIONE: DOMAIN è '$DOMAIN' invece di 'sphyrawellnesslab.duckdns.org'${NC}"
    read -p "Vuoi continuare comunque? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if [ -z "$EMAIL" ] || [ "$EMAIL" = "tua@email.com" ] || [ "$EMAIL" = "admin@sphyrawellnesslab.duckdns.org" ]; then
    echo -e "${YELLOW}⚠️  ATTENZIONE: EMAIL non configurata o di default!${NC}"
    echo "   Imposta una email valida in .env per ricevere notifiche Let's Encrypt"
    read -p "Vuoi continuare comunque? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if [ -z "$COUCHDB_PASSWORD" ] || [ "$COUCHDB_PASSWORD" = "your-secure-password-here" ]; then
    echo -e "${YELLOW}⚠️  ATTENZIONE: Password database di default!${NC}"
    read -p "Vuoi continuare comunque? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ Configurazione OK${NC}"
echo "   DOMAIN: $DOMAIN"
echo "   EMAIL:  $EMAIL"
echo "   STAGING: ${STAGING:-0}"

# ========================================
# 3. Create Directories
# ========================================
echo ""
echo "📁 Creo directory necessarie..."

mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p nginx/conf.d
mkdir -p nginx/ssl

echo -e "${GREEN}✅ Directory create${NC}"

# ========================================
# 4. Check Ports
# ========================================
echo ""
echo "🔌 Verifico porte..."

check_port() {
    PORT=$1
    if command -v netstat &> /dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
            echo -e "${YELLOW}⚠️  Porta $PORT già in uso${NC}"
            return 1
        fi
    elif command -v ss &> /dev/null; then
        if ss -tuln 2>/dev/null | grep -q ":$PORT "; then
            echo -e "${YELLOW}⚠️  Porta $PORT già in uso${NC}"
            return 1
        fi
    fi
    return 0
}

PORTS_OK=true
check_port 80 || PORTS_OK=false
check_port 443 || PORTS_OK=false

if [ "$PORTS_OK" = false ]; then
    echo -e "${YELLOW}Alcune porte potrebbero essere occupate${NC}"
    read -p "Vuoi fermare eventuali container esistenti? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose -f docker-compose.letsencrypt.yml down 2>/dev/null || true
        docker compose down 2>/dev/null || true
    fi
fi

echo -e "${GREEN}✅ Porte verificate${NC}"

# ========================================
# 5. Test DNS Resolution
# ========================================
echo ""
echo "🌐 Verifico DNS per $DOMAIN..."

# Prova diversi comandi per verificare DNS
DNS_OK=false
if command -v nslookup &> /dev/null; then
    if nslookup $DOMAIN > /dev/null 2>&1; then
        DNS_IP=$(nslookup $DOMAIN 2>/dev/null | grep -A1 "Name:" | tail -1 | awk '{print $2}')
        echo -e "${GREEN}✅ DNS risolve correttamente${NC}"
        echo "   $DOMAIN → $DNS_IP"
        DNS_OK=true
    fi
elif command -v host &> /dev/null; then
    if host $DOMAIN > /dev/null 2>&1; then
        DNS_IP=$(host $DOMAIN 2>/dev/null | grep "has address" | awk '{print $4}' | head -1)
        echo -e "${GREEN}✅ DNS risolve correttamente${NC}"
        echo "   $DOMAIN → $DNS_IP"
        DNS_OK=true
    fi
elif command -v dig &> /dev/null; then
    if dig +short $DOMAIN > /dev/null 2>&1; then
        DNS_IP=$(dig +short $DOMAIN 2>/dev/null | head -1)
        if [ ! -z "$DNS_IP" ]; then
            echo -e "${GREEN}✅ DNS risolve correttamente${NC}"
            echo "   $DOMAIN → $DNS_IP"
            DNS_OK=true
        fi
    fi
fi

if [ "$DNS_OK" = false ]; then
    echo -e "${YELLOW}⚠️  Non riesco a verificare DNS (comando non disponibile o DNS non configurato)${NC}"
    echo "   Assicurati che DuckDNS punti all'IP pubblico di questo server"
    echo "   Verifica su: https://www.duckdns.org/domains"
    echo ""
    read -p "Vuoi continuare comunque? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ========================================
# 6. Backup Existing Data (if any)
# ========================================
echo ""
echo "💾 Verifico dati esistenti..."

BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"

if docker volume ls 2>/dev/null | grep -q "couchdb_data"; then
    echo "Backup volume CouchDB..."
    mkdir -p $BACKUP_DIR
    docker run --rm -v sphyrawellness_couchdb_data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/couchdb_data.tar.gz -C /data . 2>/dev/null || true
    if [ -f "$BACKUP_DIR/couchdb_data.tar.gz" ]; then
        echo -e "${GREEN}✅ Backup salvato in $BACKUP_DIR${NC}"
    fi
fi

# ========================================
# 7. Stop Existing Containers
# ========================================
echo ""
echo "🛑 Fermo eventuali container esistenti..."

docker compose down 2>/dev/null || true
docker compose -f docker-compose.letsencrypt.yml down 2>/dev/null || true

echo -e "${GREEN}✅ Container fermati${NC}"

# ========================================
# 8. Build & Deploy
# ========================================
echo ""
echo "🏗️  Build e deploy con Let's Encrypt..."

# Pull latest images
echo "Pulling immagini Docker..."
docker compose -f docker-compose.letsencrypt.yml pull || true

# Build custom images
echo "Building applicazione..."
docker compose -f docker-compose.letsencrypt.yml build --no-cache

# Start services
echo "Avvio servizi..."
docker compose -f docker-compose.letsencrypt.yml up -d

echo -e "${GREEN}✅ Deploy completato!${NC}"

# ========================================
# 9. Wait for Services
# ========================================
echo ""
echo "⏳ Attendo avvio servizi (30 secondi)..."

for i in {1..30}; do
    echo -n "."
    sleep 1
done
echo ""

# Check container status
echo ""
echo "📊 Stato container:"
docker compose -f docker-compose.letsencrypt.yml ps

# ========================================
# 10. Monitor Certificate Request
# ========================================
echo ""
echo "🔒 Monitoraggio richiesta certificato SSL..."
echo "   (Può richiedere fino a 2 minuti)"
echo ""
echo "   Let's Encrypt verificherà che il dominio punti a questo server"
echo "   Verifica che DuckDNS sia configurato correttamente!"
echo ""

TIMEOUT=120
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
    # Check certbot logs
    if docker logs sphyra-certbot 2>&1 | grep -q "Successfully received certificate"; then
        echo ""
        echo -e "${GREEN}✅ Certificato SSL ottenuto con successo!${NC}"
        break
    fi

    if docker logs sphyra-certbot 2>&1 | grep -q "Some challenges have failed"; then
        echo ""
        echo -e "${RED}❌ Errore: Let's Encrypt non riesce a verificare il dominio!${NC}"
        echo ""
        echo "Possibili cause:"
        echo "1. DuckDNS non punta all'IP pubblico corretto"
        echo "2. Porte 80/443 non raggiungibili (firewall/NAT)"
        echo "3. DNS non ancora propagato"
        echo ""
        echo "Verifica:"
        echo "- DuckDNS: https://www.duckdns.org/domains"
        echo "- Firewall: porte 80 e 443 aperte"
        echo ""
        echo "Logs Certbot:"
        docker logs sphyra-certbot 2>&1 | tail -30
        exit 1
    fi

    sleep 5
    ELAPSED=$((ELAPSED + 5))
    echo -n "."
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Timeout: certificato non ancora ottenuto${NC}"
    echo ""
    echo "Verifica i logs:"
    echo "   docker logs sphyra-certbot -f"
    echo ""
    echo "Se necessario, riprova con:"
    echo "   docker compose -f docker-compose.letsencrypt.yml restart certbot"
fi

# ========================================
# 11. Final Tests
# ========================================
echo ""
echo "🧪 Test finali..."

# Wait a bit for services to be fully ready
sleep 5

# Test HTTP (should redirect to HTTPS)
echo "Test HTTP redirect..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L http://localhost 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✅ HTTP OK (code: $HTTP_CODE)${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP response: $HTTP_CODE${NC}"
fi

# ========================================
# 12. Success Message
# ========================================
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 DEPLOY COMPLETATO!${NC}"
echo "=========================================="
echo ""
echo "🌐 La tua applicazione dovrebbe essere disponibile su:"
echo -e "   ${BLUE}https://sphyrawellnesslab.duckdns.org${NC}"
echo ""
echo "⏳ Nota: Se il certificato non è ancora stato ottenuto,"
echo "   attendi qualche minuto e controlla i logs:"
echo "   docker logs sphyra-certbot -f"
echo ""
echo "📊 Comandi utili:"
echo "   Status:     docker compose -f docker-compose.letsencrypt.yml ps"
echo "   Logs:       docker compose -f docker-compose.letsencrypt.yml logs -f"
echo "   Certbot:    docker logs sphyra-certbot -f"
echo "   Nginx:      docker logs sphyra-nginx -f"
echo "   Backend:    docker logs sphyra-backend -f"
echo "   Frontend:   docker logs sphyra-frontend -f"
echo "   Restart:    docker compose -f docker-compose.letsencrypt.yml restart"
echo "   Stop:       docker compose -f docker-compose.letsencrypt.yml down"
echo ""
echo "🔍 Verifica certificato SSL:"
echo "   https://www.ssllabs.com/ssltest/analyze.html?d=sphyrawellnesslab.duckdns.org"
echo ""
echo "📚 Documentazione:"
echo "   cat DEPLOY_DUCKDNS.md"
echo ""
echo "=========================================="
