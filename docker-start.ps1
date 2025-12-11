# ============================================================================
# Script di avvio Docker per Sphyra Wellness Lab (Windows PowerShell)
# ============================================================================
# Questo script facilita l'avvio dell'applicazione con Docker Compose su Windows
# ============================================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SPHYRA WELLNESS - Docker Startup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verifica che Docker sia installato
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker trovato: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERRORE: Docker non è installato!" -ForegroundColor Red
    Write-Host "   Installa Docker Desktop seguendo il manuale DOCKER_INSTALL_GUIDE.md" -ForegroundColor Yellow
    Read-Host "Premi INVIO per uscire"
    exit 1
}

# Verifica che Docker Compose sia disponibile
try {
    $composeVersion = docker compose version
    Write-Host "✅ Docker Compose trovato: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERRORE: Docker Compose non è disponibile!" -ForegroundColor Red
    Write-Host "   Installa Docker Compose seguendo il manuale DOCKER_INSTALL_GUIDE.md" -ForegroundColor Yellow
    Read-Host "Premi INVIO per uscire"
    exit 1
}

Write-Host ""

# Verifica che il file .env esista
if (-Not (Test-Path ".env")) {
    Write-Host "⚠️  ATTENZIONE: File .env non trovato!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Copio .env.docker.example in .env..." -ForegroundColor Cyan
    Copy-Item ".env.docker.example" ".env"
    Write-Host "✅ File .env creato" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Modifica il file .env con i tuoi valori!" -ForegroundColor Yellow
    Write-Host "   Devi configurare almeno:" -ForegroundColor Yellow
    Write-Host "   - SENDGRID_API_KEY (obbligatorio per email)" -ForegroundColor Yellow
    Write-Host "   - SENDGRID_FROM_EMAIL" -ForegroundColor Yellow
    Write-Host "   - FRONTEND_URL" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Apro il file .env nell'editor di testo..." -ForegroundColor Cyan
    Start-Process notepad.exe ".env"
    Write-Host ""
    Read-Host "Premi INVIO dopo aver configurato .env"
}

# Carica il file .env e verifica SENDGRID_API_KEY
$envContent = Get-Content ".env" -Raw
if ($envContent -match "SENDGRID_API_KEY=your_sendgrid_api_key_here" -or $envContent -match "SENDGRID_API_KEY=\s*$") {
    Write-Host "⚠️  ATTENZIONE: SENDGRID_API_KEY non è stato configurato!" -ForegroundColor Yellow
    Write-Host "   Le funzionalità email non funzioneranno." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Vuoi continuare comunque? (s/n)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
}

Write-Host ""
Write-Host "🐳 Avvio dei container Docker..." -ForegroundColor Cyan
Write-Host ""

# Avvia Docker Compose
docker compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ ERRORE durante l'avvio dei container!" -ForegroundColor Red
    Write-Host "   Controlla i log con: docker compose logs" -ForegroundColor Yellow
    Read-Host "Premi INVIO per uscire"
    exit 1
}

Write-Host ""
Write-Host "✅ Container avviati con successo!" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  INFORMAZIONI ACCESSO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Frontend (PWA):     " -NoNewline; Write-Host "http://localhost" -ForegroundColor Yellow
Write-Host "🔧 Backend API:        " -NoNewline; Write-Host "http://localhost:3001" -ForegroundColor Yellow
Write-Host "🗄️  CouchDB Fauxton:   " -NoNewline; Write-Host "http://localhost:5984/_utils" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Username CouchDB: admin" -ForegroundColor Gray
Write-Host "   Password CouchDB: (vedi .env)" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  COMANDI UTILI" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Visualizza i log:" -ForegroundColor White
Write-Host "   docker compose logs -f" -ForegroundColor Gray
Write-Host ""
Write-Host "🔄 Riavvia i servizi:" -ForegroundColor White
Write-Host "   docker compose restart" -ForegroundColor Gray
Write-Host ""
Write-Host "🛑 Ferma i servizi:" -ForegroundColor White
Write-Host "   docker compose down" -ForegroundColor Gray
Write-Host ""
Write-Host "🗑️  Ferma e rimuovi volumi:" -ForegroundColor White
Write-Host "   docker compose down -v" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan

# Attendi che i servizi siano pronti
Write-Host "⏳ Attendo che i servizi siano pronti..." -ForegroundColor Cyan
Write-Host ""

# Funzione per testare una URL
function Test-ServiceUrl {
    param($url, $name, $timeout = 60)

    Write-Host "   $name... " -NoNewline
    $elapsed = 0
    $interval = 2

    while ($elapsed -lt $timeout) {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "✅" -ForegroundColor Green
                return $true
            }
        } catch {
            # Ignora errori e riprova
        }

        Start-Sleep -Seconds $interval
        $elapsed += $interval
    }

    Write-Host "⚠️ timeout" -ForegroundColor Yellow
    return $false
}

# Attendi CouchDB
Test-ServiceUrl -url "http://localhost:5984/_up" -name "CouchDB"

# Attendi Backend (nota: potrebbe non esistere /api/health, usa una URL sicura)
Test-ServiceUrl -url "http://localhost:3001" -name "Backend"

# Attendi Frontend
Test-ServiceUrl -url "http://localhost" -name "Frontend"

Write-Host ""
Write-Host "🎉 Sphyra Wellness Lab è pronto!" -ForegroundColor Green
Write-Host "   Apri il browser su: " -NoNewline; Write-Host "http://localhost" -ForegroundColor Yellow
Write-Host ""

# Chiedi se vuoi aprire il browser
$openBrowser = Read-Host "Vuoi aprire il browser automaticamente? (s/n)"
if ($openBrowser -eq "s" -or $openBrowser -eq "S") {
    Start-Process "http://localhost"
}

Write-Host ""
Write-Host "Premi INVIO per uscire..." -ForegroundColor Gray
Read-Host
