# ========================================
# SSL Certificate Generation Script
# Sphyra Wellness Lab
# ========================================

param(
    [string]$Domain = "sphyra.local",
    [int]$DaysValid = 3650
)

$ErrorActionPreference = "Stop"

$CertDir = $PSScriptRoot
$KeyFile = Join-Path $CertDir "sphyra.key"
$CertFile = Join-Path $CertDir "sphyra.crt"
$CsrFile = Join-Path $CertDir "sphyra.csr"
$CnfFile = Join-Path $CertDir "openssl.cnf"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SSL Certificate Generator" -ForegroundColor Cyan
Write-Host "Sphyra Wellness Lab" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find OpenSSL
$OpenSSL = $null
$PossiblePaths = @(
    "openssl",
    "C:\Program Files\OpenSSL-Win64\bin\openssl.exe",
    "C:\Program Files (x86)\OpenSSL-Win32\bin\openssl.exe"
)

foreach ($Path in $PossiblePaths) {
    try {
        if ($Path -eq "openssl") {
            $TestResult = Get-Command openssl -ErrorAction SilentlyContinue
            if ($TestResult) {
                $OpenSSL = "openssl"
                break
            }
        } else {
            if (Test-Path $Path) {
                $OpenSSL = $Path
                break
            }
        }
    } catch {
        continue
    }
}

if (-not $OpenSSL) {
    Write-Host "ERROR: OpenSSL is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found OpenSSL: $OpenSSL" -ForegroundColor Green
Write-Host ""

if (-not (Test-Path $CnfFile)) {
    Write-Host "ERROR: Config file not found: $CnfFile" -ForegroundColor Red
    exit 1
}

# Backup existing certs
if ((Test-Path $CertFile) -or (Test-Path $KeyFile)) {
    Write-Host "Existing certificates found!" -ForegroundColor Yellow
    $Response = Read-Host "Backup and regenerate? (y/N)"

    if ($Response -match '^[yY]') {
        $BackupDir = Join-Path $CertDir "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

        if (Test-Path $KeyFile) { Move-Item $KeyFile $BackupDir -Force }
        if (Test-Path $CertFile) { Move-Item $CertFile $BackupDir -Force }
        if (Test-Path $CsrFile) { Move-Item $CsrFile $BackupDir -Force }

        Write-Host "Backed up to: $BackupDir" -ForegroundColor Green
    } else {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 0
    }
}

# Generate private key
Write-Host ""
Write-Host "Step 1: Generating private key..." -ForegroundColor Cyan
& $OpenSSL genrsa -out $KeyFile 4096 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate private key" -ForegroundColor Red
    exit 1
}
Write-Host "Private key created: $KeyFile" -ForegroundColor Green

# Generate CSR
Write-Host ""
Write-Host "Step 2: Generating CSR..." -ForegroundColor Cyan
& $OpenSSL req -new -key $KeyFile -out $CsrFile -config $CnfFile 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate CSR" -ForegroundColor Red
    exit 1
}
Write-Host "CSR created: $CsrFile" -ForegroundColor Green

# Generate certificate
Write-Host ""
Write-Host "Step 3: Generating certificate..." -ForegroundColor Cyan
& $OpenSSL x509 -req -in $CsrFile -signkey $KeyFile -out $CertFile -days $DaysValid -sha256 -extensions v3_ca -extfile $CnfFile 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate certificate" -ForegroundColor Red
    exit 1
}
Write-Host "Certificate created: $CertFile" -ForegroundColor Green

# Verify
Write-Host ""
Write-Host "Step 4: Verifying certificate..." -ForegroundColor Cyan
& $OpenSSL x509 -in $CertFile -noout -subject -dates
& $OpenSSL verify -CAfile $CertFile $CertFile 2>$null
Write-Host "Certificate verified!" -ForegroundColor Green

# Cleanup
if (Test-Path $CsrFile) {
    Remove-Item $CsrFile -Force
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Certificates Generated Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Generated files:" -ForegroundColor Yellow
Write-Host "  Certificate: $CertFile"
Write-Host "  Private Key: $KeyFile"
Write-Host ""
Write-Host "Valid for: $DaysValid days (~10 years)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Add to hosts file (as Administrator):"
Write-Host "     C:\Windows\System32\drivers\etc\hosts"
Write-Host "     Add: 127.0.0.1 $Domain"
Write-Host ""
Write-Host "  2. Restart Docker containers:"
Write-Host "     docker compose -f docker-compose.https-private.yml restart"
Write-Host ""
Write-Host "  3. Test: https://$Domain"
Write-Host ""
Write-Host "Note: Self-signed certificates will show browser warnings" -ForegroundColor Yellow
Write-Host "This is normal for development." -ForegroundColor Gray
Write-Host ""
