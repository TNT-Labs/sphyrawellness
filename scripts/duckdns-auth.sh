#!/bin/bash
# ========================================
# DuckDNS DNS-01 Challenge - Authentication
# ========================================
# Questo script viene chiamato da certbot per creare
# il record TXT necessario per la validazione DNS-01
# ========================================

set -e

# Variabili di ambiente richieste:
# - CERTBOT_DOMAIN: Il dominio da validare (es: sphyrawellnesslab.duckdns.org)
# - CERTBOT_VALIDATION: Il valore del record TXT da creare
# - DUCKDNS_TOKEN: Il token API di DuckDNS

# Estrai il sottodominio da DuckDNS (rimuovi .duckdns.org)
SUBDOMAIN=$(echo "$CERTBOT_DOMAIN" | sed 's/\.duckdns\.org$//')

echo "=========================================="
echo "DuckDNS DNS-01 Authentication"
echo "=========================================="
echo "Domain: $CERTBOT_DOMAIN"
echo "Subdomain: $SUBDOMAIN"
echo "Validation: $CERTBOT_VALIDATION"
echo "=========================================="

# Crea il record TXT su DuckDNS
# L'API di DuckDNS permette di impostare un record TXT tramite il parametro 'txt'
RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=${SUBDOMAIN}&token=${DUCKDNS_TOKEN}&txt=${CERTBOT_VALIDATION}")

echo "DuckDNS API Response: $RESPONSE"

if [ "$RESPONSE" != "OK" ]; then
    echo "ERROR: DuckDNS API returned: $RESPONSE"
    exit 1
fi

echo "✅ Record TXT creato con successo"
echo "Attendo 60 secondi per la propagazione DNS..."

# Attendi la propagazione DNS (DuckDNS è generalmente veloce, ma attendiamo comunque)
sleep 60

echo "✅ Propagazione DNS completata"
