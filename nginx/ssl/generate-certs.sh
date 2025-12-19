#!/bin/bash
# ========================================
# SSL Certificate Generation Script
# Sphyra Wellness Lab
# ========================================

set -e

DOMAIN="${1:-sphyra.local}"
DAYS_VALID="${2:-3650}"

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_FILE="$CERT_DIR/sphyra.key"
CERT_FILE="$CERT_DIR/sphyra.crt"
CSR_FILE="$CERT_DIR/sphyra.csr"
CNF_FILE="$CERT_DIR/openssl.cnf"

echo ""
echo "========================================"
echo "SSL Certificate Generator"
echo "Sphyra Wellness Lab"
echo "========================================"
echo ""

# Check if OpenSSL is installed
if ! command -v openssl &> /dev/null; then
    echo "ERROR: OpenSSL is not installed!"
    echo ""
    echo "Install with: sudo apt-get install openssl"
    exit 1
fi

echo "Found OpenSSL: $(command -v openssl)"
echo ""

# Check if config file exists
if [ ! -f "$CNF_FILE" ]; then
    echo "ERROR: Config file not found: $CNF_FILE"
    exit 1
fi

# Backup existing certs
if [ -f "$CERT_FILE" ] || [ -f "$KEY_FILE" ]; then
    echo "Existing certificates found!"
    read -p "Backup and regenerate? (y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        BACKUP_DIR="$CERT_DIR/backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"

        [ -f "$KEY_FILE" ] && mv "$KEY_FILE" "$BACKUP_DIR/"
        [ -f "$CERT_FILE" ] && mv "$CERT_FILE" "$BACKUP_DIR/"
        [ -f "$CSR_FILE" ] && mv "$CSR_FILE" "$BACKUP_DIR/"

        echo "Backed up to: $BACKUP_DIR"
    else
        echo "Aborted."
        exit 0
    fi
fi

# Generate private key
echo ""
echo "Step 1: Generating private key..."
openssl genrsa -out "$KEY_FILE" 4096 2>/dev/null
echo "Private key created: $KEY_FILE"

# Generate CSR
echo ""
echo "Step 2: Generating CSR..."
openssl req -new -key "$KEY_FILE" -out "$CSR_FILE" -config "$CNF_FILE" 2>/dev/null
echo "CSR created: $CSR_FILE"

# Generate certificate
echo ""
echo "Step 3: Generating certificate..."
openssl x509 -req -in "$CSR_FILE" -signkey "$KEY_FILE" -out "$CERT_FILE" \
    -days "$DAYS_VALID" -sha256 -extensions v3_ca -extfile "$CNF_FILE" 2>/dev/null
echo "Certificate created: $CERT_FILE"

# Verify
echo ""
echo "Step 4: Verifying certificate..."
openssl x509 -in "$CERT_FILE" -noout -subject -dates
openssl verify -CAfile "$CERT_FILE" "$CERT_FILE" 2>/dev/null || true
echo "Certificate verified!"

# Cleanup
[ -f "$CSR_FILE" ] && rm -f "$CSR_FILE"

# Summary
echo ""
echo "========================================"
echo "Certificates Generated Successfully!"
echo "========================================"
echo ""
echo "Generated files:"
echo "  Certificate: $CERT_FILE"
echo "  Private Key: $KEY_FILE"
echo ""
echo "Valid for: $DAYS_VALID days (~10 years)"
echo ""
echo "Next steps:"
echo "  1. Add to hosts file (as root/sudo):"
echo "     /etc/hosts"
echo "     Add: 192.168.1.95 $DOMAIN"
echo ""
echo "  2. Restart Docker containers:"
echo "     docker compose -f docker-compose.https-private.yml restart"
echo ""
echo "  3. Test: https://$DOMAIN"
echo ""
echo "Note: Self-signed certificates will show browser warnings"
echo "This is normal for development."
echo ""
