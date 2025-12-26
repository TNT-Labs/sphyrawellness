#!/bin/bash

# ========================================
# Script di Inizializzazione Let's Encrypt
# Per il primo deploy con DuckDNS
# ========================================

set -e

echo "🔒 Inizializzazione Let's Encrypt per sphyrawellnesslab.duckdns.org"
echo "======================================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ File .env non trovato!${NC}"
    exit 1
fi

export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)

# Check DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ DOMAIN non configurato in .env!${NC}"
    exit 1
fi

# Check EMAIL
if [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ EMAIL non configurato in .env!${NC}"
    exit 1
fi

echo "Domain: $DOMAIN"
echo "Email:  $EMAIL"
echo "Staging: ${STAGING:-0}"
echo ""

# ========================================
# 1. Download recommended TLS parameters
# ========================================
echo "📥 Download parametri TLS consigliati..."

mkdir -p certbot/conf

if [ ! -f "certbot/conf/options-ssl-nginx.conf" ]; then
    echo "Downloading options-ssl-nginx.conf..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf
fi

if [ ! -f "certbot/conf/ssl-dhparams.pem" ]; then
    echo "Downloading ssl-dhparams.pem..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem
fi

echo -e "${GREEN}✅ Parametri TLS scaricati${NC}"

# ========================================
# 2. Create dummy certificate per primo avvio Nginx
# ========================================
echo ""
echo "🔧 Creazione certificato temporaneo..."

CERT_PATH="certbot/conf/live/$DOMAIN"
mkdir -p "$CERT_PATH"

if [ ! -f "$CERT_PATH/fullchain.pem" ]; then
    echo "Generazione certificato self-signed temporaneo..."
    docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt \
        certbot/certbot \
        sh -c "
            openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
                -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
                -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
                -subj '/CN=localhost' 2>/dev/null
        "

    # Create symlinks
    cd "$CERT_PATH"
    ln -sf fullchain.pem chain.pem
    ln -sf fullchain.pem cert.pem
    cd - > /dev/null

    echo -e "${GREEN}✅ Certificato temporaneo creato${NC}"
else
    echo -e "${BLUE}ℹ️  Certificato già esistente, skip${NC}"
fi

# ========================================
# 3. Start Nginx
# ========================================
echo ""
echo "🚀 Avvio Nginx con certificato temporaneo..."

docker compose -f docker-compose.letsencrypt.yml up -d nginx

# Wait for Nginx
sleep 5

# Check if Nginx is running
if ! docker ps | grep -q sphyra-nginx; then
    echo -e "${RED}❌ Nginx non è partito!${NC}"
    echo "Logs:"
    docker logs sphyra-nginx
    exit 1
fi

echo -e "${GREEN}✅ Nginx avviato${NC}"

# ========================================
# 4. Request Let's Encrypt certificate
# ========================================
echo ""
echo "🔒 Richiesta certificato Let's Encrypt..."

# Determine staging flag
if [ "${STAGING:-0}" = "1" ]; then
    STAGING_ARG="--staging"
    echo -e "${YELLOW}⚠️  Modalità STAGING: certificati per test (non fidati dal browser)${NC}"
else
    STAGING_ARG=""
    echo -e "${GREEN}Modalità PRODUCTION: certificati validi${NC}"
fi

# Delete dummy certificate
echo "Rimozione certificato temporaneo..."
docker compose -f docker-compose.letsencrypt.yml run --rm --entrypoint "\
    rm -rf /etc/letsencrypt/live/$DOMAIN && \
    rm -rf /etc/letsencrypt/archive/$DOMAIN && \
    rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

# Request new certificate
echo "Richiesta certificato a Let's Encrypt..."
docker compose -f docker-compose.letsencrypt.yml run --rm certbot \
    certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Certificato SSL ottenuto con successo!${NC}"
else
    echo -e "${RED}❌ Errore durante l'ottenimento del certificato!${NC}"
    echo ""
    echo "Possibili cause:"
    echo "1. DuckDNS non punta all'IP pubblico di questo server"
    echo "2. Porte 80/443 non raggiungibili dall'esterno"
    echo "3. DNS non ancora propagato"
    echo ""
    echo "Verifica:"
    echo "- DuckDNS: https://www.duckdns.org/domains"
    echo "- Porta 80: curl -I http://$DOMAIN/.well-known/acme-challenge/test"
    echo ""
    exit 1
fi

# ========================================
# 5. Reload Nginx
# ========================================
echo ""
echo "🔄 Reload Nginx con certificato reale..."

docker compose -f docker-compose.letsencrypt.yml exec nginx nginx -s reload

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx ricaricato${NC}"
else
    echo -e "${YELLOW}⚠️  Reload fallito, provo restart...${NC}"
    docker compose -f docker-compose.letsencrypt.yml restart nginx
fi

# ========================================
# 6. Start remaining services
# ========================================
echo ""
echo "🚀 Avvio servizi rimanenti..."

docker compose -f docker-compose.letsencrypt.yml up -d

echo -e "${GREEN}✅ Tutti i servizi avviati${NC}"

# Wait for services
echo ""
echo "⏳ Attendo avvio completo servizi (30 secondi)..."
sleep 30

# ========================================
# 7. Final verification
# ========================================
echo ""
echo "🧪 Verifica finale..."

# Check all containers
echo "Container status:"
docker compose -f docker-compose.letsencrypt.yml ps

echo ""

# Test HTTP redirect
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L http://localhost 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✅ HTTP OK (code: $HTTP_CODE)${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP code: $HTTP_CODE${NC}"
fi

# Test HTTPS (allow self-signed if staging)
HTTPS_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" https://localhost 2>/dev/null || echo "000")
if [ "$HTTPS_CODE" = "200" ]; then
    echo -e "${GREEN}✅ HTTPS OK (code: $HTTPS_CODE)${NC}"
else
    echo -e "${YELLOW}⚠️  HTTPS code: $HTTPS_CODE${NC}"
fi

# ========================================
# Success Message
# ========================================
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 INIZIALIZZAZIONE COMPLETATA!${NC}"
echo "=========================================="
echo ""
echo "🌐 L'applicazione dovrebbe essere disponibile su:"
if [ "${STAGING:-0}" = "1" ]; then
    echo -e "   ${YELLOW}https://$DOMAIN${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  ATTENZIONE: Stai usando certificati STAGING${NC}"
    echo "   Il browser mostrerà un avviso di sicurezza (normale per staging)"
    echo ""
    echo "   Per ottenere certificati PRODUCTION:"
    echo "   1. Imposta STAGING=0 in .env"
    echo "   2. Esegui: ./deploy-duckdns.sh"
else
    echo -e "   ${GREEN}https://$DOMAIN${NC}"
fi
echo ""
echo "📊 Comandi utili:"
echo "   Status:   docker compose -f docker-compose.letsencrypt.yml ps"
echo "   Logs:     docker compose -f docker-compose.letsencrypt.yml logs -f"
echo "   Restart:  docker compose -f docker-compose.letsencrypt.yml restart"
echo "   Stop:     docker compose -f docker-compose.letsencrypt.yml down"
echo ""
echo "🔍 Test SSL:"
echo "   https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
echo "=========================================="
