# ========================================
# SSL Certificate Generation Script
# Sphyra Wellness Lab - Private Network
# PowerShell Version for Windows
# ========================================

param(
    [string]$Domain = "sphyra.local",
    [int]$DaysValid = 3650
)

$ErrorActionPreference = "Stop"

# Configuration
$CertDir = $PSScriptRoot
$KeyFile = Join-Path $CertDir "sphyra.key"
$CertFile = Join-Path $CertDir "sphyra.crt"
$CsrFile = Join-Path $CertDir "sphyra.csr"
$CnfFile = Join-Path $CertDir "openssl.cnf"

# Colors
function Write-ColorOutput($Message, $Color = "White") {
    Write-Host $Message -ForegroundColor $Color
}

# Header
Write-ColorOutput "`n========================================" "Cyan"
Write-ColorOutput "SSL Certificate Generator" "Cyan"
Write-ColorOutput "Sphyra Wellness Lab" "Cyan"
Write-ColorOutput "========================================`n" "Cyan"

# Check if OpenSSL is available
$OpenSSL = $null
$PossiblePaths = @(
    "openssl",
    "C:\Program Files\OpenSSL-Win64\bin\openssl.exe",
    "C:\Program Files (x86)\OpenSSL-Win32\bin\openssl.exe",
    "C:\OpenSSL-Win64\bin\openssl.exe",
    "C:\OpenSSL-Win32\bin\openssl.exe"
)

foreach ($Path in $PossiblePaths) {
    try {
        $TestResult = if ($Path -eq "openssl") {
            Get-Command openssl -ErrorAction SilentlyContinue
        } else {
            if (Test-Path $Path) { $Path } else { $null }
        }

        if ($TestResult) {
            $OpenSSL = if ($Path -eq "openssl") { "openssl" } else { $Path }
            break
        }
    } catch {
        continue
    }
}

if (-not $OpenSSL) {
    Write-ColorOutput "ERROR: OpenSSL is not installed or not found!" "Red"
    Write-ColorOutput "`nOpenSSL is required to generate SSL certificates." "Yellow"
    Write-ColorOutput "`nInstallation options:" "Yellow"
    Write-ColorOutput "  1. Download from: https://slproweb.com/products/Win32OpenSSL.html" "White"
    Write-ColorOutput "  2. Install via Chocolatey: choco install openssl" "White"
    Write-ColorOutput "  3. Use Docker method (see README.md)`n" "White"
    exit 1
}

Write-ColorOutput "✓ Found OpenSSL: $OpenSSL`n" "Green"

# Check if config file exists
if (-not (Test-Path $CnfFile)) {
    Write-ColorOutput "ERROR: OpenSSL config file not found: $CnfFile" "Red"
    exit 1
}

# Backup existing certificates
if ((Test-Path $CertFile) -or (Test-Path $KeyFile)) {
    Write-ColorOutput "⚠ Existing certificates found!" "Yellow"
    $Response = Read-Host "Do you want to backup and regenerate? (y/N)"

    if ($Response -match '^[yY]') {
        $BackupDir = Join-Path $CertDir "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

        if (Test-Path $KeyFile) { Move-Item $KeyFile $BackupDir -Force }
        if (Test-Path $CertFile) { Move-Item $CertFile $BackupDir -Force }
        if (Test-Path $CsrFile) { Move-Item $CsrFile $BackupDir -Force }

        Write-ColorOutput "✓ Backed up to: $BackupDir`n" "Green"
    } else {
        Write-ColorOutput "Aborted.`n" "Yellow"
        exit 0
    }
}

# Generate private key
Write-ColorOutput "Step 1: Generating private key..." "Cyan"
& $OpenSSL genrsa -out $KeyFile 4096 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "ERROR: Failed to generate private key" "Red"
    exit 1
}
Write-ColorOutput "✓ Private key created: $KeyFile`n" "Green"

# Generate Certificate Signing Request (CSR)
Write-ColorOutput "Step 2: Generating Certificate Signing Request (CSR)..." "Cyan"
& $OpenSSL req -new -key $KeyFile -out $CsrFile -config $CnfFile 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "ERROR: Failed to generate CSR" "Red"
    exit 1
}
Write-ColorOutput "✓ CSR created: $CsrFile`n" "Green"

# Generate self-signed certificate
Write-ColorOutput "Step 3: Generating self-signed certificate..." "Cyan"
& $OpenSSL x509 -req -in $CsrFile -signkey $KeyFile -out $CertFile -days $DaysValid -sha256 -extensions v3_ca -extfile $CnfFile 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "ERROR: Failed to generate certificate" "Red"
    exit 1
}
Write-ColorOutput "✓ Certificate created: $CertFile`n" "Green"

# Display certificate information
Write-ColorOutput "========================================" "Cyan"
Write-ColorOutput "Certificate Information" "Cyan"
Write-ColorOutput "========================================" "Cyan"
& $OpenSSL x509 -in $CertFile -noout -subject -dates

Write-ColorOutput "`nSubject Alternative Names (SANs):" "Yellow"
& $OpenSSL x509 -in $CertFile -noout -text | Select-String -Pattern "DNS:|IP Address:" -Context 0,0

# Verify certificate
Write-ColorOutput "`nStep 4: Verifying certificate..." "Cyan"
& $OpenSSL verify -CAfile $CertFile $CertFile 2>$null
Write-ColorOutput "✓ Certificate verification complete`n" "Green"

# Clean up CSR
if (Test-Path $CsrFile) {
    Remove-Item $CsrFile -Force
}

# Summary
Write-ColorOutput "========================================" "Green"
Write-ColorOutput "✓ SSL Certificates Generated Successfully!" "Green"
Write-ColorOutput "========================================`n" "Green"

Write-ColorOutput "Generated files:" "Yellow"
Write-ColorOutput "  • Certificate: $CertFile" "White"
Write-ColorOutput "  • Private Key: $KeyFile`n" "White"

Write-ColorOutput "Valid for: $DaysValid days (~10 years)`n" "Yellow"

Write-ColorOutput "Next steps:" "Cyan"
Write-ColorOutput "  1. Add domain to hosts file:" "White"
Write-ColorOutput "     File: C:\Windows\System32\drivers\etc\hosts" "Gray"
Write-ColorOutput "     Run as Administrator and add:" "Gray"
Write-ColorOutput "     127.0.0.1 $Domain traefik.$Domain`n" "White"

Write-ColorOutput "  2. Restart Docker containers:" "White"
Write-ColorOutput "     docker compose -f docker-compose.https-private.yml restart`n" "Gray"

Write-ColorOutput "  3. (Optional) Import certificate to Windows Trusted Root:" "White"
Write-ColorOutput "     Run: certutil -addstore -f `"ROOT`" `"$CertFile`"`n" "Gray"

Write-ColorOutput "  4. Test your setup:" "White"
Write-ColorOutput "     Open: https://$Domain" "Gray"
Write-ColorOutput "     Open: https://traefik.$Domain`n" "Gray"

Write-ColorOutput "⚠ Note: Self-signed certificates will show browser warnings" "Yellow"
Write-ColorOutput "  This is normal for development environments.`n" "Gray"

Write-ColorOutput "========================================`n" "Green"
