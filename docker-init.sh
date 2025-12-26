#!/bin/bash
# docker-init.sh - Script di inizializzazione Docker per Sphyra Wellness Lab

set -e

echo "🐳 Sphyra Wellness Lab - Docker Initialization"
echo "================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker non è installato!"
    echo "   Installa Docker da: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker compose &> /dev/null; then
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose non è disponibile!"
        exit 1
    else
        COMPOSE_CMD="docker-compose"
    fi
else
    COMPOSE_CMD="docker compose"
fi

echo "✅ Docker e Docker Compose sono installati"
echo ""

# Create .env.docker if it doesn't exist
if [ ! -f .env.docker ]; then
    echo "📝 Creazione file .env.docker da .env.docker.example..."
    cp .env.docker.example .env.docker
    echo "✅ File .env.docker creato!"
    echo "⚠️  IMPORTANTE: Modifica .env.docker con le tue configurazioni se necessario"
    echo ""
else
    echo "✅ File .env.docker già esistente"
    echo ""
fi

# Ask user which services to start
echo "Quale configurazione vuoi avviare?"
echo ""
echo "1) Solo Database (PostgreSQL)"
echo "2) Database + Backend API"
echo "3) Stack Completo (Database + Backend + Frontend)"
echo "4) Stack Completo + pgAdmin (per debug)"
echo ""
read -p "Seleziona [1-4] (default: 3): " choice
choice=${choice:-3}

case $choice in
    1)
        echo ""
        echo "🚀 Avvio solo PostgreSQL..."
        $COMPOSE_CMD --env-file .env.docker up -d postgres
        ;;
    2)
        echo ""
        echo "🚀 Avvio Database + Backend..."
        $COMPOSE_CMD --env-file .env.docker up -d postgres backend
        ;;
    3)
        echo ""
        echo "🚀 Avvio Stack Completo (Database + Backend + Frontend)..."
        $COMPOSE_CMD --env-file .env.docker up -d
        ;;
    4)
        echo ""
        echo "🚀 Avvio Stack Completo + pgAdmin..."
        $COMPOSE_CMD --env-file .env.docker --profile debug up -d
        ;;
    *)
        echo "❌ Scelta non valida!"
        exit 1
        ;;
esac

echo ""
echo "⏳ Attendere l'inizializzazione dei servizi..."
sleep 5

echo ""
echo "📊 Stato dei servizi:"
$COMPOSE_CMD --env-file .env.docker ps

echo ""
echo "✅ Inizializzazione completata!"
echo ""
echo "📍 URL Servizi:"
echo "   • Frontend:  http://localhost"
echo "   • Backend:   http://localhost:3001"
echo "   • pgAdmin:   http://localhost:5050 (se avviato)"
echo ""
echo "🔐 Credenziali di default:"
echo "   • Admin:     admin / admin123"
echo "   • User:      user / user123"
echo ""
echo "📝 Comandi utili:"
echo "   • Logs:      $COMPOSE_CMD --env-file .env.docker logs -f"
echo "   • Stop:      $COMPOSE_CMD --env-file .env.docker down"
echo "   • Restart:   $COMPOSE_CMD --env-file .env.docker restart"
echo "   • Shell:     $COMPOSE_CMD --env-file .env.docker exec backend sh"
echo ""
echo "🎉 Buon lavoro!"
