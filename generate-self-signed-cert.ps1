# ========================================
# Genera Certificati Self-Signed
# Per HTTPS in Rete Privata
# ========================================

# Imposta la policy di esecuzione per lo script corrente
$ErrorActionPreference = "Stop"

Write-Host "[*] Generazione Certificati Self-Signed" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ========================================
# Configuration
# ========================================

# Load .env if exists
$DOMAIN = "sphyra.local"
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "PRIVATE_DOMAIN=(.+)") {
            $DOMAIN = $matches[1].Trim()
        }
    }
}

$CERT_DIR = "./traefik/certs"

Write-Host "Dominio: $DOMAIN"
Write-Host "Directory certificati: $CERT_DIR"
Write-Host ""

# ========================================
# Check OpenSSL
# ========================================

$opensslPath = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $opensslPath) {
    Write-Host "[!] ERRORE: OpenSSL non trovato!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installa OpenSSL per Windows:" -ForegroundColor Yellow
    Write-Host "  - Opzione 1: Scarica da https://slproweb.com/products/Win32OpenSSL.html"
    Write-Host "  - Opzione 2: Usa Chocolatey: choco install openssl"
    Write-Host "  - Opzione 3: Usa Git Bash (include OpenSSL): ./generate-self-signed-cert.sh"
    Write-Host ""
    exit 1
}

Write-Host "[+] OpenSSL trovato: $($opensslPath.Path)" -ForegroundColor Green
Write-Host ""

# ========================================
# Create Directory
# ========================================

if (-not (Test-Path $CERT_DIR)) {
    New-Item -ItemType Directory -Path $CERT_DIR -Force | Out-Null
    Write-Host "[+] Directory creata: $CERT_DIR" -ForegroundColor Green
}

# ========================================
# Generate Certificate
# ========================================

Write-Host "[*] Generazione certificato per: $DOMAIN"
Write-Host ""

# Generate private key
Write-Host "[1/4] Generazione chiave privata..." -ForegroundColor Cyan
openssl genrsa -out "$CERT_DIR/sphyra.key" 4096 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Errore durante la generazione della chiave" -ForegroundColor Red
    exit 1
}

# Generate certificate signing request (CSR)
Write-Host "[2/4] Generazione CSR..." -ForegroundColor Cyan
openssl req -new -key "$CERT_DIR/sphyra.key" `
    -out "$CERT_DIR/sphyra.csr" `
    -subj "/C=IT/ST=Italy/L=Rome/O=Sphyra Wellness Lab/CN=$DOMAIN" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Errore durante la generazione del CSR" -ForegroundColor Red
    exit 1
}

# Create config file for SAN (Subject Alternative Names)
Write-Host "[3/4] Creazione configurazione SAN..." -ForegroundColor Cyan
$opensslConfig = @"
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
IP.2 = 192.168.1.100
IP.3 = 192.168.0.100
IP.4 = 10.0.0.100
"@

$opensslConfig | Out-File -FilePath "$CERT_DIR/openssl.cnf" -Encoding ASCII

# Generate self-signed certificate (valid for 10 years)
Write-Host "[4/4] Generazione certificato self-signed (valido 10 anni)..." -ForegroundColor Cyan
$output = openssl x509 -req `
    -in "$CERT_DIR/sphyra.csr" `
    -signkey "$CERT_DIR/sphyra.key" `
    -out "$CERT_DIR/sphyra.crt" `
    -days 3650 `
    -sha256 `
    -extensions v3_req `
    -extfile "$CERT_DIR/openssl.cnf" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Errore durante la generazione del certificato" -ForegroundColor Red
    Write-Host $output
    exit 1
}

Write-Host ""
Write-Host "[+] Certificati generati con successo!" -ForegroundColor Green
Write-Host ""

# ========================================
# Certificate Info
# ========================================

Write-Host "--- Informazioni Certificato ---" -ForegroundColor Cyan
openssl x509 -in "$CERT_DIR/sphyra.crt" -text -noout | Select-String -Pattern "Subject:", "Not Before", "Not After", "DNS:" -Context 0,2
Write-Host ""

Write-Host "--- File creati ---" -ForegroundColor Cyan
Write-Host "  - $CERT_DIR/sphyra.key (private key)"
Write-Host "  - $CERT_DIR/sphyra.crt (certificato)"
Write-Host "  - $CERT_DIR/sphyra.csr (CSR)"
Write-Host ""

# ========================================
# Import Instructions
# ========================================

Write-Host "[!] IMPORTANTE - Importa il certificato nel browser!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Il certificato e' self-signed, quindi i browser mostreranno un warning."
Write-Host "Per rimuovere il warning, importa il certificato:"
Write-Host ""

Write-Host "--- Windows - Installazione nel sistema ---" -ForegroundColor Cyan
Write-Host "   1. Apri PowerShell come Amministratore"
Write-Host "   2. Esegui:"
Write-Host "      Import-Certificate -FilePath '$CERT_DIR\sphyra.crt' -CertStoreLocation Cert:\LocalMachine\Root"
Write-Host ""

Write-Host "--- Chrome/Edge (Windows) ---" -ForegroundColor Cyan
Write-Host "   1. Apri chrome://settings/certificates o edge://settings/privacy"
Write-Host "   2. Tab 'Autorita' di certificazione radice attendibili'"
Write-Host "   3. Import -> Seleziona: $CERT_DIR\sphyra.crt"
Write-Host "   4. [X] Considera attendibile il certificato per identificare i siti web"
Write-Host ""

Write-Host "--- Firefox ---" -ForegroundColor Cyan
Write-Host "   1. Apri about:preferences#privacy"
Write-Host "   2. Scroll -> Visualizza certificati"
Write-Host "   3. Tab 'Autorita'"
Write-Host "   4. Importa -> Seleziona: $CERT_DIR\sphyra.crt"
Write-Host "   5. [X] Considera attendibile questa CA per identificare i siti web"
Write-Host ""

Write-Host "--- iOS/iPadOS ---" -ForegroundColor Cyan
Write-Host "   1. Invia il file .crt via AirDrop o email"
Write-Host "   2. Impostazioni -> Profilo scaricato -> Installa"
Write-Host "   3. Impostazioni -> Generali -> Info -> Impostazioni certificati"
Write-Host "   4. Abilita certificato Sphyra"
Write-Host ""

Write-Host "--- Android ---" -ForegroundColor Cyan
Write-Host "   1. Copia $CERT_DIR\sphyra.crt sul dispositivo"
Write-Host "   2. Impostazioni -> Sicurezza -> Installa da archivio"
Write-Host "   3. Seleziona il file .crt"
Write-Host ""

# ========================================
# Windows System Installation
# ========================================

Write-Host "[?] Vuoi installare il certificato nel sistema Windows? (S/N)" -ForegroundColor Yellow
$reply = Read-Host

if ($reply -match "^[SsYy]") {
    # Check if running as Administrator
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    $isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    if ($isAdmin) {
        Write-Host "[*] Installazione certificato nel sistema Windows..." -ForegroundColor Cyan
        try {
            $certPath = Resolve-Path "$CERT_DIR/sphyra.crt"
            Import-Certificate -FilePath $certPath -CertStoreLocation Cert:\LocalMachine\Root | Out-Null
            Write-Host "[+] Certificato installato nel sistema Windows" -ForegroundColor Green
            Write-Host "    I browser Chrome/Edge riconosceranno automaticamente il certificato."
        }
        catch {
            Write-Host "[!] Errore durante l'installazione: $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "[!] Riavvia PowerShell come Amministratore per installare il certificato" -ForegroundColor Yellow
        Write-Host "    Poi esegui:"
        Write-Host "    Import-Certificate -FilePath '$CERT_DIR\sphyra.crt' -CertStoreLocation Cert:\LocalMachine\Root"
    }
}

Write-Host ""
Write-Host "[+] Fatto!" -ForegroundColor Green
Write-Host ""
Write-Host "Prossimi passi:"
Write-Host "  1. Importa il certificato nel browser (vedi istruzioni sopra)"
Write-Host "  2. Deploy: docker compose -f docker-compose.https-private.yml up -d"
Write-Host "  3. Apri: https://$DOMAIN"
Write-Host ""
