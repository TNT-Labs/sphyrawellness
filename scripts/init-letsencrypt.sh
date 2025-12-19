#!/bin/bash

# Script di inizializzazione Let's Encrypt
# Questo script configura i certificati SSL/TLS tramite Let's Encrypt per Sphyra Wellness

set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per stampare messaggi colorati
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Banner
print_message "$BLUE" "========================================="
print_message "$BLUE" "   Sphyra Wellness - Let's Encrypt Setup"
print_message "$BLUE" "========================================="
echo ""

# Verifica se il file .env esiste
if [ ! -f .env ]; then
    print_message "$RED" "Errore: File .env non trovato!"
    print_message "$YELLOW" "Copia .env.example in .env e configura i parametri necessari."
    exit 1
fi

# Carica variabili d'ambiente
source .env

# Verifica variabili richieste
if [ -z "$DOMAIN" ]; then
    print_message "$RED" "Errore: DOMAIN non configurato nel file .env"
    print_message "$YELLOW" "Aggiungi: DOMAIN=tuodominio.com"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    print_message "$RED" "Errore: EMAIL non configurato nel file .env"
    print_message "$YELLOW" "Aggiungi: EMAIL=tua@email.com"
    exit 1
fi

# Variabili configurabili
DOMAIN=${DOMAIN}
EMAIL=${EMAIL}
STAGING=${STAGING:-0} # 0 = production, 1 = staging
DATA_PATH="./certbot"
RSA_KEY_SIZE=4096

print_message "$GREEN" "Configurazione:"
print_message "$BLUE" "  Dominio: $DOMAIN"
print_message "$BLUE" "  Email: $EMAIL"
print_message "$BLUE" "  Ambiente: $([ $STAGING -eq 1 ] && echo 'Staging (Test)' || echo 'Production')"
echo ""

# Chiedi conferma
read -p "Continuare con questa configurazione? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_message "$YELLOW" "Operazione annullata."
    exit 0
fi

# Crea directory necessarie
print_message "$YELLOW" "Creazione directory..."
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"
mkdir -p "$DATA_PATH/www"

# Scarica i parametri DH raccomandati
if [ ! -e "$DATA_PATH/conf/ssl-dhparams.pem" ]; then
    print_message "$YELLOW" "Scaricamento parametri SSL DH (Diffie-Hellman)..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$DATA_PATH/conf/options-ssl-nginx.conf"
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$DATA_PATH/conf/ssl-dhparams.pem"
    print_message "$GREEN" "✓ Parametri SSL scaricati"
fi

# Crea certificato dummy temporaneo
if [ ! -e "$DATA_PATH/conf/live/$DOMAIN/fullchain.pem" ]; then
    print_message "$YELLOW" "Creazione certificato dummy temporaneo..."

    CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
    docker-compose -f docker-compose.letsencrypt.yml run --rm --entrypoint "\
        openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
        -keyout '$CERT_PATH/privkey.pem' \
        -out '$CERT_PATH/fullchain.pem' \
        -subj '/CN=localhost'" certbot

    print_message "$GREEN" "✓ Certificato dummy creato"
fi

# Avvia Nginx
print_message "$YELLOW" "Avvio Nginx..."
docker-compose -f docker-compose.letsencrypt.yml up -d nginx
print_message "$GREEN" "✓ Nginx avviato"

# Rimuove certificato dummy
print_message "$YELLOW" "Rimozione certificato dummy..."
docker-compose -f docker-compose.letsencrypt.yml run --rm --entrypoint "\
    rm -rf /etc/letsencrypt/live/$DOMAIN && \
    rm -rf /etc/letsencrypt/archive/$DOMAIN && \
    rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot
print_message "$GREEN" "✓ Certificato dummy rimosso"

# Richiedi certificato Let's Encrypt
print_message "$YELLOW" "Richiesta certificato Let's Encrypt..."

# Seleziona server staging o production
STAGING_ARG=""
if [ $STAGING -eq 1 ]; then
    STAGING_ARG="--staging"
    print_message "$BLUE" "  Modalità: STAGING (certificato di test)"
else
    print_message "$BLUE" "  Modalità: PRODUCTION (certificato valido)"
fi

# Esegui certbot
docker-compose -f docker-compose.letsencrypt.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    $STAGING_ARG \
    -d $DOMAIN

if [ $? -eq 0 ]; then
    print_message "$GREEN" "✓ Certificato Let's Encrypt ottenuto con successo!"
else
    print_message "$RED" "✗ Errore durante l'ottenimento del certificato"
    print_message "$YELLOW" "Controlla che:"
    print_message "$YELLOW" "  1. Il dominio $DOMAIN punti all'IP pubblico di questo server"
    print_message "$YELLOW" "  2. Le porte 80 e 443 siano aperte e raggiungibili"
    print_message "$YELLOW" "  3. Non ci siano firewall che bloccano le connessioni"
    exit 1
fi

# Ricarica Nginx per usare il nuovo certificato
print_message "$YELLOW" "Ricaricamento configurazione Nginx..."
docker-compose -f docker-compose.letsencrypt.yml exec nginx nginx -s reload
print_message "$GREEN" "✓ Nginx ricaricato"

echo ""
print_message "$GREEN" "========================================="
print_message "$GREEN" "  Setup completato con successo!"
print_message "$GREEN" "========================================="
echo ""
print_message "$BLUE" "Il tuo sito è ora accessibile tramite HTTPS su:"
print_message "$GREEN" "  https://$DOMAIN"
echo ""
print_message "$YELLOW" "Note importanti:"
print_message "$BLUE" "  • I certificati si rinnovano automaticamente ogni 12 ore"
print_message "$BLUE" "  • I certificati Let's Encrypt scadono dopo 90 giorni"
print_message "$BLUE" "  • Il rinnovo automatico è gestito dal container certbot"
if [ $STAGING -eq 1 ]; then
    echo ""
    print_message "$YELLOW" "  ⚠ ATTENZIONE: Stai usando certificati STAGING (test)"
    print_message "$YELLOW" "  Questi certificati NON sono fidati dai browser!"
    print_message "$YELLOW" "  Per ottenere certificati production, imposta STAGING=0 nel file .env"
fi
echo ""
