#!/bin/bash
# ========================================
# Ottieni certificato SSL con DuckDNS
# DNS-01 Challenge - Prima configurazione
# ========================================

set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Sphyra Wellness Lab - Setup HTTPS"
echo "Let's Encrypt con DuckDNS (DNS-01)"
echo "=========================================="

# Controlla che esista il file .env
if [ ! -f .env ]; then
    echo -e "${RED}ERROR: File .env non trovato!${NC}"
    echo "Copia .env.duckdns.example in .env e configura le variabili"
    echo "  cp .env.duckdns.example .env"
    echo "  nano .env"
    exit 1
fi

# Carica le variabili dal file .env
source .env

# Controlla le variabili obbligatorie
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}ERROR: Variabile DOMAIN non configurata in .env${NC}"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    echo -e "${RED}ERROR: Variabile EMAIL non configurata in .env${NC}"
    exit 1
fi

if [ -z "$DUCKDNS_TOKEN" ]; then
    echo -e "${RED}ERROR: Variabile DUCKDNS_TOKEN non configurata in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Configurazione valida${NC}"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "=========================================="

# Crea le directory necessarie
mkdir -p certbot/conf
mkdir -p certbot/www

# Rendi eseguibili gli script di autenticazione
chmod +x scripts/duckdns-auth.sh
chmod +x scripts/duckdns-cleanup.sh

echo -e "${YELLOW}📦 Costruzione immagine certbot con supporto DuckDNS...${NC}"
docker build -t sphyra-certbot-duckdns -f docker/certbot/Dockerfile.duckdns .

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Impossibile costruire l'immagine certbot${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Immagine costruita${NC}"
echo ""
echo -e "${YELLOW}📝 Ottenimento certificato SSL...${NC}"
echo "Questo processo può richiedere alcuni minuti."
echo ""

# Ottieni il certificato usando certbot in modalità manuale con DNS-01
docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/scripts:/usr/local/bin:ro" \
    -e "DUCKDNS_TOKEN=$DUCKDNS_TOKEN" \
    sphyra-certbot-duckdns \
    certonly \
    --manual \
    --preferred-challenges dns \
    --manual-auth-hook /usr/local/bin/duckdns-auth.sh \
    --manual-cleanup-hook /usr/local/bin/duckdns-cleanup.sh \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "✅ Certificato SSL ottenuto con successo!"
    echo "==========================================${NC}"
    echo ""
    echo "I certificati sono stati salvati in:"
    echo "  certbot/conf/live/$DOMAIN/"
    echo ""
    echo -e "${YELLOW}Prossimi passi:${NC}"
    echo "1. Avvia l'applicazione con:"
    echo "   docker compose -f docker-compose.duckdns.yml up -d"
    echo ""
    echo "2. Il rinnovo automatico è già configurato"
    echo "   I certificati saranno rinnovati ogni 12 ore"
    echo ""
    echo -e "${GREEN}La tua applicazione sarà disponibile su:${NC}"
    echo "  https://$DOMAIN"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================="
    echo "❌ Errore durante l'ottenimento del certificato"
    echo "==========================================${NC}"
    echo ""
    echo "Possibili cause:"
    echo "1. Token DuckDNS non valido"
    echo "2. Dominio non configurato su DuckDNS"
    echo "3. Problemi di connessione internet"
    echo ""
    echo "Verifica la configurazione e riprova."
    exit 1
fi
