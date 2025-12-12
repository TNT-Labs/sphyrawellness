#!/bin/bash

# ========================================
# Genera Certificati Self-Signed
# Per HTTPS in Rete Privata
# ========================================

set -e

echo "🔒 Generazione Certificati Self-Signed"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ========================================
# Configuration
# ========================================

# Load .env if exists
if [ -f .env ]; then
    export $(cat .env | grep PRIVATE_DOMAIN | xargs)
fi

# Domain name
DOMAIN=${PRIVATE_DOMAIN:-sphyra.local}
CERT_DIR="./traefik/certs"

echo "Dominio: $DOMAIN"
echo "Directory certificati: $CERT_DIR"
echo ""

# ========================================
# Create Directory
# ========================================

mkdir -p "$CERT_DIR"

# ========================================
# Generate Certificate
# ========================================

echo "📝 Generazione certificato per: $DOMAIN"

# Generate private key
openssl genrsa -out "$CERT_DIR/sphyra.key" 4096

# Generate certificate signing request (CSR)
openssl req -new -key "$CERT_DIR/sphyra.key" \
    -out "$CERT_DIR/sphyra.csr" \
    -subj "/C=IT/ST=Italy/L=Rome/O=Sphyra Wellness Lab/CN=$DOMAIN"

# Create config file for SAN (Subject Alternative Names)
cat > "$CERT_DIR/openssl.cnf" <<EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = IT
ST = Italy
L = Rome
O = Sphyra Wellness Lab
CN = $DOMAIN

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = *.$DOMAIN
DNS.3 = localhost
DNS.4 = *.localhost
IP.1 = 127.0.0.1
IP.2 = 192.168.1.95
IP.3 = 192.168.1.100
IP.4 = 192.168.0.100
EOF

# Generate self-signed certificate (valid for 10 years)
openssl x509 -req \
    -in "$CERT_DIR/sphyra.csr" \
    -signkey "$CERT_DIR/sphyra.key" \
    -out "$CERT_DIR/sphyra.crt" \
    -days 3650 \
    -sha256 \
    -extensions v3_req \
    -extfile "$CERT_DIR/openssl.cnf"

# Set permissions
chmod 600 "$CERT_DIR/sphyra.key"
chmod 644 "$CERT_DIR/sphyra.crt"

echo ""
echo -e "${GREEN}✅ Certificati generati con successo!${NC}"
echo ""

# ========================================
# Certificate Info
# ========================================

echo "📋 Informazioni Certificato:"
echo "----------------------------"
openssl x509 -in "$CERT_DIR/sphyra.crt" -text -noout | grep -A2 "Subject:"
openssl x509 -in "$CERT_DIR/sphyra.crt" -text -noout | grep -A1 "Validity"
openssl x509 -in "$CERT_DIR/sphyra.crt" -text -noout | grep -A10 "Subject Alternative Name"

echo ""
echo "📁 File creati:"
echo "  - $CERT_DIR/sphyra.key (private key)"
echo "  - $CERT_DIR/sphyra.crt (certificato)"
echo "  - $CERT_DIR/sphyra.csr (CSR)"
echo ""

# ========================================
# Import Instructions
# ========================================

echo -e "${YELLOW}⚠️  IMPORTANTE - Importa il certificato nel browser!${NC}"
echo ""
echo "Il certificato è self-signed, quindi i browser mostreranno un warning."
echo "Per rimuovere il warning, importa il certificato nel browser:"
echo ""
echo "🔹 Chrome/Edge (Windows/Linux/Mac):"
echo "   1. Apri chrome://settings/certificates"
echo "   2. Tab 'Authorities'"
echo "   3. Import → Seleziona: $CERT_DIR/sphyra.crt"
echo "   4. ✓ Trust this certificate for identifying websites"
echo ""
echo "🔹 Firefox:"
echo "   1. Apri about:preferences#privacy"
echo "   2. Scroll → View Certificates"
echo "   3. Tab 'Authorities'"
echo "   4. Import → Seleziona: $CERT_DIR/sphyra.crt"
echo "   5. ✓ Trust this CA to identify websites"
echo ""
echo "🔹 Safari (Mac):"
echo "   1. Apri Keychain Access"
echo "   2. Drag & drop: $CERT_DIR/sphyra.crt"
echo "   3. Double-click certificato → Trust → Always Trust"
echo ""
echo "🔹 iOS/iPadOS:"
echo "   1. Invia il file .crt via AirDrop o email"
echo "   2. Settings → Profile Downloaded → Install"
echo "   3. Settings → General → About → Certificate Trust Settings"
echo "   4. Enable certificato Sphyra"
echo ""
echo "🔹 Android:"
echo "   1. Copia $CERT_DIR/sphyra.crt sul dispositivo"
echo "   2. Settings → Security → Install from storage"
echo "   3. Seleziona il file .crt"
echo ""

# ========================================
# Export CA for system trust
# ========================================

echo "📦 Vuoi installare il certificato nel sistema? (y/N)"
read -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ "$(uname)" == "Linux" ]; then
        echo "Installing on Linux..."
        sudo cp "$CERT_DIR/sphyra.crt" /usr/local/share/ca-certificates/sphyra.crt
        sudo update-ca-certificates
        echo -e "${GREEN}✅ Certificato installato nel sistema${NC}"
    elif [ "$(uname)" == "Darwin" ]; then
        echo "Installing on macOS..."
        sudo security add-trusted-cert -d -r trustRoot \
            -k /Library/Keychains/System.keychain "$CERT_DIR/sphyra.crt"
        echo -e "${GREEN}✅ Certificato installato nel sistema${NC}"
    else
        echo -e "${YELLOW}OS non supportato per installazione automatica${NC}"
        echo "Importa manualmente il certificato nel browser."
    fi
fi

echo ""
echo "🎉 Fatto!"
echo ""
echo "Prossimi passi:"
echo "  1. Importa il certificato nel browser (vedi istruzioni sopra)"
echo "  2. Deploy: docker compose -f docker-compose.https-private.yml up -d"
echo "  3. Apri: https://$DOMAIN"
echo ""
