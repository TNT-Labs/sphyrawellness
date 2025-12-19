#!/bin/bash

# ========================================
# Sphyra Wellness Lab - Quick Tunnel URL Manager
# Gestisce e monitora l'URL del Quick Tunnel
# ========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
RED='\033[0;31m'
NC='\033[0m' # No Color

URL_FILE=".quicktunnel-url"
CONTAINER_NAME="sphyra-quicktunnel"

# ========================================
# Funzione: Ottieni URL corrente dai logs
# ========================================
get_current_url() {
    docker logs $CONTAINER_NAME 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | head -1
}

# ========================================
# Funzione: Carica URL salvato
# ========================================
get_saved_url() {
    if [ -f "$URL_FILE" ]; then
        cat "$URL_FILE"
    fi
}

# ========================================
# Funzione: Salva URL
# ========================================
save_url() {
    local url=$1
    echo "$url" > "$URL_FILE"
    echo -e "${GREEN}✅ URL salvato in $URL_FILE${NC}"
}

# ========================================
# Funzione: Mostra URL
# ========================================
show_url() {
    local current_url=$(get_current_url)
    local saved_url=$(get_saved_url)

    echo ""
    echo "=========================================="
    echo -e "${BLUE}🌐 Quick Tunnel URL Manager${NC}"
    echo "=========================================="
    echo ""

    if [ -n "$current_url" ]; then
        echo -e "${GREEN}✅ URL corrente (da container):${NC}"
        echo ""
        echo -e "   ${MAGENTA}$current_url${NC}"
        echo ""

        # Salva automaticamente
        if [ "$current_url" != "$saved_url" ]; then
            echo "$current_url" > "$URL_FILE"
            if [ -n "$saved_url" ]; then
                echo -e "${YELLOW}⚠️  L'URL è cambiato!${NC}"
                echo -e "${YELLOW}   Vecchio: $saved_url${NC}"
                echo ""
            fi
        fi
    elif [ -n "$saved_url" ]; then
        echo -e "${YELLOW}⚠️  Container non in esecuzione${NC}"
        echo ""
        echo -e "${BLUE}ℹ️  Ultimo URL noto:${NC}"
        echo ""
        echo -e "   ${MAGENTA}$saved_url${NC}"
        echo ""
        echo -e "${YELLOW}   (Potrebbe non essere più valido)${NC}"
        echo ""
    else
        echo -e "${RED}❌ Nessun URL trovato${NC}"
        echo ""
        echo "Il container Quick Tunnel non è mai stato avviato"
        echo "o non ha ancora generato un URL."
        echo ""
        echo "Avvia il tunnel con:"
        echo "   ./deploy-quicktunnel.sh"
        echo ""
        return 1
    fi

    echo "=========================================="
    echo ""
}

# ========================================
# Funzione: Monitora URL in tempo reale
# ========================================
watch_url() {
    echo -e "${BLUE}🔍 Monitoraggio URL in tempo reale...${NC}"
    echo "Premi CTRL+C per fermare"
    echo ""

    local last_url=""

    while true; do
        local current_url=$(get_current_url)

        if [ -n "$current_url" ] && [ "$current_url" != "$last_url" ]; then
            clear
            echo -e "${GREEN}✅ URL rilevato: $(date '+%H:%M:%S')${NC}"
            echo ""
            echo -e "${MAGENTA}$current_url${NC}"
            echo ""
            echo "$current_url" > "$URL_FILE"
            last_url="$current_url"
        fi

        sleep 5
    done
}

# ========================================
# Funzione: Genera QR Code (opzionale)
# ========================================
generate_qr() {
    local url=$(get_current_url)

    if [ -z "$url" ]; then
        url=$(get_saved_url)
    fi

    if [ -z "$url" ]; then
        echo -e "${RED}❌ Nessun URL disponibile${NC}"
        return 1
    fi

    echo -e "${BLUE}📱 QR Code per: $url${NC}"
    echo ""

    if command -v qrencode &> /dev/null; then
        qrencode -t ANSI "$url"
        echo ""
        echo "Scansiona il QR code con il tuo smartphone!"
    else
        echo -e "${YELLOW}⚠️  qrencode non installato${NC}"
        echo ""
        echo "Installa con:"
        echo "   sudo apt install qrencode"
        echo ""
        echo "Oppure usa un servizio online:"
        echo "   https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=$url"
    fi
}

# ========================================
# Funzione: Aiuto
# ========================================
show_help() {
    echo ""
    echo "Quick Tunnel URL Manager"
    echo ""
    echo "Uso:"
    echo "   ./quicktunnel-url.sh [comando]"
    echo ""
    echo "Comandi:"
    echo "   show     Mostra l'URL corrente (default)"
    echo "   watch    Monitora l'URL in tempo reale"
    echo "   qr       Genera QR code per l'URL"
    echo "   copy     Copia l'URL negli appunti"
    echo "   open     Apri l'URL nel browser"
    echo "   help     Mostra questo aiuto"
    echo ""
}

# ========================================
# Main
# ========================================
case "${1:-show}" in
    show)
        show_url
        ;;
    watch)
        watch_url
        ;;
    qr)
        generate_qr
        ;;
    copy)
        url=$(get_current_url)
        if [ -z "$url" ]; then
            url=$(get_saved_url)
        fi
        if [ -n "$url" ]; then
            echo -n "$url" | xclip -selection clipboard 2>/dev/null || \
            echo -n "$url" | pbcopy 2>/dev/null || \
            echo "$url"
            echo -e "${GREEN}✅ URL copiato: $url${NC}"
        else
            echo -e "${RED}❌ Nessun URL disponibile${NC}"
            exit 1
        fi
        ;;
    open)
        url=$(get_current_url)
        if [ -z "$url" ]; then
            url=$(get_saved_url)
        fi
        if [ -n "$url" ]; then
            echo -e "${BLUE}🌐 Apertura browser...${NC}"
            xdg-open "$url" 2>/dev/null || open "$url" 2>/dev/null || echo "Vai su: $url"
        else
            echo -e "${RED}❌ Nessun URL disponibile${NC}"
            exit 1
        fi
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Comando non riconosciuto: $1${NC}"
        show_help
        exit 1
        ;;
esac
