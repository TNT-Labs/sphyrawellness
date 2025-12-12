#!/bin/bash
# ========================================
# SSL Certificate Generation Script
# Sphyra Wellness Lab - Private Network
# ========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="${PRIVATE_DOMAIN:-sphyra.local}"
DAYS_VALID=3650  # 10 years
KEY_FILE="$CERT_DIR/sphyra.key"
CERT_FILE="$CERT_DIR/sphyra.crt"
CSR_FILE="$CERT_DIR/sphyra.csr"
CNF_FILE="$CERT_DIR/openssl.cnf"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SSL Certificate Generator${NC}"
echo -e "${BLUE}Sphyra Wellness Lab${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if OpenSSL is installed
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}ERROR: OpenSSL is not installed!${NC}"
    echo "Please install OpenSSL:"
    echo "  - Windows: https://slproweb.com/products/Win32OpenSSL.html"
    echo "  - Linux: sudo apt-get install openssl"
    echo "  - macOS: brew install openssl"
    exit 1
fi

# Check if config file exists
if [ ! -f "$CNF_FILE" ]; then
    echo -e "${RED}ERROR: OpenSSL config file not found: $CNF_FILE${NC}"
    exit 1
fi

# Backup existing certificates
if [ -f "$CERT_FILE" ] || [ -f "$KEY_FILE" ]; then
    echo -e "${YELLOW}⚠ Existing certificates found!${NC}"
    echo -n "Do you want to backup and regenerate? (y/N): "
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        BACKUP_DIR="$CERT_DIR/backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        [ -f "$KEY_FILE" ] && mv "$KEY_FILE" "$BACKUP_DIR/"
        [ -f "$CERT_FILE" ] && mv "$CERT_FILE" "$BACKUP_DIR/"
        [ -f "$CSR_FILE" ] && mv "$CSR_FILE" "$BACKUP_DIR/"
        echo -e "${GREEN}✓ Backed up to: $BACKUP_DIR${NC}"
    else
        echo -e "${YELLOW}Aborted.${NC}"
        exit 0
    fi
fi

# Generate private key
echo ""
echo -e "${BLUE}Step 1: Generating private key...${NC}"
openssl genrsa -out "$KEY_FILE" 4096 2>/dev/null
chmod 600 "$KEY_FILE"
echo -e "${GREEN}✓ Private key created: $KEY_FILE${NC}"

# Generate Certificate Signing Request (CSR)
echo ""
echo -e "${BLUE}Step 2: Generating Certificate Signing Request (CSR)...${NC}"
openssl req -new \
    -key "$KEY_FILE" \
    -out "$CSR_FILE" \
    -config "$CNF_FILE" \
    2>/dev/null
echo -e "${GREEN}✓ CSR created: $CSR_FILE${NC}"

# Generate self-signed certificate
echo ""
echo -e "${BLUE}Step 3: Generating self-signed certificate...${NC}"
openssl x509 -req \
    -in "$CSR_FILE" \
    -signkey "$KEY_FILE" \
    -out "$CERT_FILE" \
    -days $DAYS_VALID \
    -sha256 \
    -extensions v3_ca \
    -extfile "$CNF_FILE" \
    2>/dev/null
chmod 644 "$CERT_FILE"
echo -e "${GREEN}✓ Certificate created: $CERT_FILE${NC}"

# Display certificate information
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Certificate Information${NC}"
echo -e "${BLUE}========================================${NC}"
openssl x509 -in "$CERT_FILE" -noout -text | grep -A 2 "Subject:"
openssl x509 -in "$CERT_FILE" -noout -text | grep -A 1 "Validity"
echo ""
echo -e "${YELLOW}Subject Alternative Names (SANs):${NC}"
openssl x509 -in "$CERT_FILE" -noout -text | grep -A 10 "Subject Alternative Name" | tail -n 9

# Verify certificate
echo ""
echo -e "${BLUE}Step 4: Verifying certificate...${NC}"
openssl verify -CAfile "$CERT_FILE" "$CERT_FILE" 2>/dev/null || true
echo -e "${GREEN}✓ Certificate verification complete${NC}"

# Clean up CSR
rm -f "$CSR_FILE"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ SSL Certificates Generated Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Generated files:${NC}"
echo "  • Certificate: $CERT_FILE"
echo "  • Private Key: $KEY_FILE"
echo ""
echo -e "${YELLOW}Valid for: ${DAYS_VALID} days (~10 years)${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Add domain to hosts file:"
echo "     Windows: C:\\Windows\\System32\\drivers\\etc\\hosts"
echo "     Linux/Mac: /etc/hosts"
echo ""
echo "     Add line: 127.0.0.1 $DOMAIN traefik.$DOMAIN"
echo ""
echo "  2. Restart Docker containers:"
echo "     docker compose -f docker-compose.https-private.yml restart"
echo ""
echo "  3. Trust certificate in browser (optional):"
echo "     - Import $CERT_FILE as trusted root certificate"
echo ""
echo -e "${YELLOW}⚠ Note: Self-signed certificates will show browser warnings${NC}"
echo "   This is normal for development environments."
echo ""
