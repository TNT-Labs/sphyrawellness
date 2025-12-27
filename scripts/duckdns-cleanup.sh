#!/bin/bash
# ========================================
# DuckDNS DNS-01 Challenge - Cleanup
# ========================================
# Questo script viene chiamato da certbot per rimuovere
# il record TXT dopo la validazione
# ========================================

set -e

# Variabili di ambiente richieste:
# - CERTBOT_DOMAIN: Il dominio validato
# - DUCKDNS_TOKEN: Il token API di DuckDNS

# Estrai il sottodominio da DuckDNS (rimuovi .duckdns.org)
SUBDOMAIN=$(echo "$CERTBOT_DOMAIN" | sed 's/\.duckdns\.org$//')

echo "=========================================="
echo "DuckDNS DNS-01 Cleanup"
echo "=========================================="
echo "Domain: $CERTBOT_DOMAIN"
echo "Subdomain: $SUBDOMAIN"
echo "=========================================="

# Rimuovi il record TXT su DuckDNS (imposta txt vuoto)
RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=${SUBDOMAIN}&token=${DUCKDNS_TOKEN}&txt=&clear=true")

echo "DuckDNS API Response: $RESPONSE"

if [ "$RESPONSE" != "OK" ]; then
    echo "WARNING: DuckDNS API returned: $RESPONSE"
    # Non facciamo exit 1 perché il cleanup non è critico
fi

echo "✅ Record TXT rimosso"
