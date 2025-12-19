#!/bin/bash

# Script per rinnovare manualmente i certificati Let's Encrypt
# Normalmente il rinnovo è automatico, ma questo script può essere utile per test

set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_message "$BLUE" "========================================="
print_message "$BLUE" "   Rinnovo Certificati Let's Encrypt"
print_message "$BLUE" "========================================="
echo ""

# Verifica se docker-compose è in esecuzione
if ! docker ps | grep -q sphyra-certbot; then
    print_message "$RED" "Errore: Il container certbot non è in esecuzione!"
    print_message "$YELLOW" "Avvia i servizi con: docker-compose -f docker-compose.letsencrypt.yml up -d"
    exit 1
fi

# Esegui il rinnovo
print_message "$YELLOW" "Tentativo di rinnovo certificati..."
docker-compose -f docker-compose.letsencrypt.yml run --rm certbot renew --webroot --webroot-path=/var/www/certbot

if [ $? -eq 0 ]; then
    print_message "$GREEN" "✓ Rinnovo completato (o certificati ancora validi)"

    # Ricarica Nginx
    print_message "$YELLOW" "Ricaricamento configurazione Nginx..."
    docker-compose -f docker-compose.letsencrypt.yml exec nginx nginx -s reload
    print_message "$GREEN" "✓ Nginx ricaricato"

    echo ""
    print_message "$GREEN" "========================================="
    print_message "$GREEN" "  Rinnovo completato con successo!"
    print_message "$GREEN" "========================================="
else
    print_message "$RED" "✗ Errore durante il rinnovo"
    exit 1
fi

# Mostra informazioni sui certificati
print_message "$BLUE" "Informazioni certificati:"
docker-compose -f docker-compose.letsencrypt.yml run --rm certbot certificates

echo ""
