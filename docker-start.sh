#!/bin/bash

# ============================================================================
# Script di avvio Docker per Sphyra Wellness
# ============================================================================
# Questo script facilita l'avvio dell'applicazione con Docker Compose
# ============================================================================

set -e

echo "============================================"
echo "  SPHYRA WELLNESS - Docker Startup"
echo "============================================"
echo ""

# Verifica che Docker sia installato
if ! command -v docker &> /dev/null; then
    echo "❌ ERRORE: Docker non è installato!"
    echo "   Installa Docker seguendo il manuale DOCKER_INSTALL_GUIDE.md"
    exit 1
fi

# Verifica che Docker Compose sia disponibile
if ! docker compose version &> /dev/null; then
    echo "❌ ERRORE: Docker Compose non è disponibile!"
    echo "   Installa Docker Compose seguendo il manuale DOCKER_INSTALL_GUIDE.md"
    exit 1
fi

# Verifica che il file .env esista
if [ ! -f .env ]; then
    echo "⚠️  ATTENZIONE: File .env non trovato!"
    echo ""
    echo "Copio .env.docker.example in .env..."
    cp .env.docker.example .env
    echo "✅ File .env creato"
    echo ""
    echo "⚠️  IMPORTANTE: Modifica il file .env con i tuoi valori!"
    echo "   Devi configurare almeno:"
    echo "   - SENDGRID_API_KEY (obbligatorio per email)"
    echo "   - SENDGRID_FROM_EMAIL"
    echo "   - FRONTEND_URL"
    echo ""
    read -p "Premi INVIO dopo aver configurato .env, o CTRL+C per uscire..."
fi

# Verifica che SENDGRID_API_KEY sia configurato
source .env
if [ "$SENDGRID_API_KEY" = "your_sendgrid_api_key_here" ]; then
    echo "⚠️  ATTENZIONE: SENDGRID_API_KEY non è stato configurato!"
    echo "   Le funzionalità email non funzioneranno."
    echo ""
    read -p "Vuoi continuare comunque? (s/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

echo "🐳 Avvio dei container Docker..."
echo ""

# Avvia Docker Compose
docker compose up -d

echo ""
echo "✅ Container avviati con successo!"
echo ""
echo "============================================"
echo "  INFORMAZIONI ACCESSO"
echo "============================================"
echo ""
echo "📱 Frontend (PWA):     http://localhost"
echo "🔧 Backend API:        http://localhost:3001"
echo "🗄️  CouchDB Fauxton:   http://localhost:5984/_utils"
echo ""
echo "   Username CouchDB: admin"
echo "   Password CouchDB: (vedi .env)"
echo ""
echo "============================================"
echo "  COMANDI UTILI"
echo "============================================"
echo ""
echo "📊 Visualizza i log:"
echo "   docker compose logs -f"
echo ""
echo "🔄 Riavvia i servizi:"
echo "   docker compose restart"
echo ""
echo "🛑 Ferma i servizi:"
echo "   docker compose down"
echo ""
echo "🗑️  Ferma e rimuovi volumi:"
echo "   docker compose down -v"
echo ""
echo "============================================"

# Attendi che i servizi siano pronti
echo "⏳ Attendo che i servizi siano pronti..."
echo ""

# Attendi CouchDB
echo -n "   CouchDB... "
timeout 60 bash -c 'until curl -s http://localhost:5984/_up > /dev/null; do sleep 2; done' && echo "✅" || echo "⚠️ timeout"

# Attendi Backend
echo -n "   Backend... "
timeout 60 bash -c 'until curl -s http://localhost:3001/api/health > /dev/null; do sleep 2; done' && echo "✅" || echo "⚠️ timeout"

# Attendi Frontend
echo -n "   Frontend... "
timeout 60 bash -c 'until curl -s http://localhost > /dev/null; do sleep 2; done' && echo "✅" || echo "⚠️ timeout"

echo ""
echo "🎉 Sphyra Wellness è pronto!"
echo "   Apri il browser su: http://localhost"
echo ""
