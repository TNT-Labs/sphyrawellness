# 🐳 Manuale di Installazione Docker - Sphyra Wellness

**Versione:** 1.0
**Ultima modifica:** Dicembre 2024

Questo manuale guida l'installazione completa di **Sphyra Wellness** utilizzando Docker su piattaforme Windows e Linux (incluso Raspberry Pi 5).

---

## 📋 Indice

1. [Introduzione](#introduzione)
2. [Requisiti di Sistema](#requisiti-di-sistema)
3. [Installazione Docker](#installazione-docker)
   - [Windows](#installazione-docker-su-windows)
   - [Linux (Ubuntu/Debian)](#installazione-docker-su-linux-ubuntudebian)
   - [Raspberry Pi 5](#installazione-docker-su-raspberry-pi-5)
4. [Installazione Sphyra Wellness](#installazione-sphyra-wellness)
5. [Configurazione](#configurazione)
6. [Avvio dell'Applicazione](#avvio-dellapplicazione)
7. [Configurazione Iniziale CouchDB](#configurazione-iniziale-couchdb)
8. [Accesso all'Applicazione](#accesso-allapplicazione)
9. [Gestione dei Container](#gestione-dei-container)
10. [Backup e Ripristino](#backup-e-ripristino)
11. [Aggiornamento](#aggiornamento)
12. [Troubleshooting](#troubleshooting)
13. [FAQ](#faq)

---

## 🎯 Introduzione

Sphyra Wellness è una Progressive Web App (PWA) completa per la gestione di centri estetici e spa. L'applicazione è composta da:

- **Frontend PWA**: Interfaccia utente React (porta 80)
- **Backend API**: Server Node.js Express (porta 3001)
- **Database CouchDB**: Database NoSQL con sincronizzazione (porta 5984)

Docker semplifica l'installazione e garantisce che tutto funzioni correttamente su qualsiasi sistema.

---

## 💻 Requisiti di Sistema

### Requisiti Minimi

| Piattaforma | CPU | RAM | Spazio Disco | Sistema Operativo |
|-------------|-----|-----|--------------|-------------------|
| **Windows** | Dual-core 2.0 GHz | 4 GB | 10 GB | Windows 10/11 64-bit (Pro, Enterprise, Education) |
| **Linux** | Dual-core 2.0 GHz | 4 GB | 10 GB | Ubuntu 20.04+, Debian 11+, Fedora 33+ |
| **Raspberry Pi 5** | Quad-core ARM | 4 GB | 16 GB (SD/SSD) | Raspberry Pi OS 64-bit (Bookworm) |

### Requisiti Raccomandati

| Piattaforma | CPU | RAM | Spazio Disco |
|-------------|-----|-----|--------------|
| **Windows/Linux** | Quad-core 3.0 GHz | 8 GB | 20 GB SSD |
| **Raspberry Pi 5** | Quad-core ARM | 8 GB | 32 GB SSD (USB) |

### Software Richiesto

- **Docker Engine** 24.0+ o **Docker Desktop** 4.20+
- **Docker Compose** v2.20+ (incluso in Docker Desktop)
- **Git** (opzionale, per clonare il repository)

---

## 🐳 Installazione Docker

### Installazione Docker su Windows

#### Metodo 1: Docker Desktop (Consigliato)

1. **Verifica i requisiti**:
   - Windows 10/11 64-bit Pro, Enterprise o Education
   - WSL 2 abilitato (Windows Subsystem for Linux)
   - Virtualizzazione hardware abilitata nel BIOS

2. **Abilita WSL 2**:
   ```powershell
   # Esegui come Amministratore in PowerShell
   wsl --install
   ```
   Riavvia il computer dopo l'installazione.

3. **Scarica Docker Desktop**:
   - Vai su: https://www.docker.com/products/docker-desktop/
   - Scarica la versione per Windows
   - Dimensione: ~500 MB

4. **Installa Docker Desktop**:
   - Esegui l'installer scaricato
   - Accetta i termini di licenza
   - Seleziona "Use WSL 2 instead of Hyper-V"
   - Completa l'installazione
   - Riavvia il computer

5. **Verifica l'installazione**:
   ```powershell
   # Apri PowerShell o CMD
   docker --version
   docker compose version
   ```

   Output atteso:
   ```
   Docker version 24.x.x
   Docker Compose version v2.x.x
   ```

6. **Configura Docker Desktop**:
   - Apri Docker Desktop
   - Vai su Settings → Resources
   - Alloca almeno 4 GB di RAM
   - Alloca almeno 2 CPU
   - Clicca "Apply & Restart"

#### Metodo 2: Docker Engine con WSL 2 (Avanzato)

Se hai Windows 10/11 Home o preferisci usare Docker Engine senza Docker Desktop:

```powershell
# In WSL 2 (Ubuntu)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

---

### Installazione Docker su Linux (Ubuntu/Debian)

#### Installazione Automatica

```bash
# Scarica e esegui lo script di installazione ufficiale
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Aggiungi il tuo utente al gruppo docker (evita sudo)
sudo usermod -aG docker $USER

# Abilita Docker all'avvio
sudo systemctl enable docker
sudo systemctl start docker

# Ricarica i gruppi (o esegui logout/login)
newgrp docker
```

#### Installazione Manuale (Ubuntu 22.04/24.04)

```bash
# 1. Rimuovi vecchie versioni
sudo apt-get remove docker docker-engine docker.io containerd runc

# 2. Aggiorna il sistema
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg lsb-release

# 3. Aggiungi la chiave GPG di Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 4. Aggiungi il repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Installa Docker
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 6. Verifica l'installazione
docker --version
docker compose version
```

#### Debian 11/12

Stesso procedimento di Ubuntu, ma usa:
```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

---

### Installazione Docker su Raspberry Pi 5

#### Prerequisiti

1. **Sistema Operativo**: Raspberry Pi OS 64-bit (Bookworm o superiore)
   - Scarica: https://www.raspberrypi.com/software/
   - Usa Raspberry Pi Imager per installare

2. **Aggiorna il sistema**:
   ```bash
   sudo apt-get update
   sudo apt-get upgrade -y
   sudo reboot
   ```

#### Installazione Docker

```bash
# 1. Installa Docker con lo script automatico
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Aggiungi l'utente al gruppo docker
sudo usermod -aG docker $USER

# 3. Abilita Docker all'avvio
sudo systemctl enable docker
sudo systemctl start docker

# 4. Riavvia per applicare i gruppi
sudo reboot

# 5. Dopo il riavvio, verifica l'installazione
docker --version
docker compose version
```

#### Ottimizzazione per Raspberry Pi

```bash
# 1. Aumenta lo swap (consigliato per RPi con 4GB RAM)
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Cambia CONF_SWAPSIZE=100 in CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# 2. Usa un SSD USB invece della SD card (molto consigliato)
# - Migliora drasticamente le performance
# - Allunga la vita del supporto di memoria
# - Guida: https://www.raspberrypi.com/documentation/computers/raspberry-pi.html

# 3. Limita i log di Docker
sudo nano /etc/docker/daemon.json
```

Aggiungi:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Riavvia Docker:
```bash
sudo systemctl restart docker
```

---

## 📦 Installazione Sphyra Wellness

### Opzione 1: Clona il Repository (Consigliato)

```bash
# Installa Git (se non già installato)
# Ubuntu/Debian/Raspberry Pi:
sudo apt-get install git

# Windows (usa Git for Windows):
# Download: https://git-scm.com/download/win

# Clona il repository
git clone https://github.com/TNT-Labs/sphyrawellness.git
cd sphyrawellness
```

### Opzione 2: Download Manuale

1. Vai su: https://github.com/TNT-Labs/sphyrawellness
2. Clicca su "Code" → "Download ZIP"
3. Estrai l'archivio
4. Apri il terminale nella cartella estratta

---

## ⚙️ Configurazione

### 1. Crea il File di Configurazione

```bash
# Copia il file di esempio
cp .env.docker.example .env

# Modifica il file (usa il tuo editor preferito)
# Linux/macOS:
nano .env

# Windows:
notepad .env
```

### 2. Configura i Parametri

Apri il file `.env` e modifica i seguenti valori:

```env
# ============================================================================
# SENDGRID EMAIL CONFIGURATION (OBBLIGATORIO)
# ============================================================================
# Vai su https://app.sendgrid.com/settings/api_keys e crea una API Key
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@tuodominio.com
SENDGRID_FROM_NAME=Sphyra Wellness

# ============================================================================
# FRONTEND URL
# ============================================================================
# Per installazione locale:
FRONTEND_URL=http://localhost

# Per Raspberry Pi (usa l'IP locale):
# FRONTEND_URL=http://192.168.1.100

# Per produzione:
# FRONTEND_URL=http://tuodominio.com

# ============================================================================
# API URL (per il frontend)
# ============================================================================
# Per installazione locale:
VITE_API_URL=http://localhost:3001/api

# Per Raspberry Pi:
# VITE_API_URL=http://192.168.1.100:3001/api

# ============================================================================
# REMINDER CONFIGURATION
# ============================================================================
# Orario invio reminder automatici (24h)
REMINDER_SEND_HOUR=10
REMINDER_SEND_MINUTE=0

# ============================================================================
# COUCHDB CONFIGURATION
# ============================================================================
# ⚠️ CAMBIA QUESTI VALORI PER PRODUZIONE!
COUCHDB_USER=admin
COUCHDB_PASSWORD=tuaPasswordSicura123!
```

### 3. Ottieni SendGrid API Key

SendGrid è necessario per l'invio di email di promemoria ai clienti.

1. **Crea un account SendGrid**:
   - Vai su: https://signup.sendgrid.com/
   - Registrati (piano gratuito: 100 email/giorno)

2. **Verifica il dominio/email**:
   - Vai su Settings → Sender Authentication
   - Verifica il tuo indirizzo email mittente

3. **Crea una API Key**:
   - Vai su Settings → API Keys
   - Clicca "Create API Key"
   - Nome: "Sphyra Wellness"
   - Permissions: "Full Access"
   - Copia la chiave (la vedrai solo una volta!)

4. **Inserisci la chiave nel file `.env`**:
   ```env
   SENDGRID_API_KEY=SG.tu_chiave_qui
   ```

**Guida completa**: Vedi `EMAIL_REMINDERS_GUIDE.md` per configurazione dettagliata.

---

## 🚀 Avvio dell'Applicazione

### Metodo 1: Script Automatico (Consigliato)

```bash
# Linux/macOS/Raspberry Pi:
./docker-start.sh

# Windows (Git Bash):
bash docker-start.sh

# Windows (PowerShell):
.\docker-start.ps1
```

Lo script automatico:
- ✅ Verifica la configurazione
- ✅ Avvia i container
- ✅ Attende che tutti i servizi siano pronti
- ✅ Mostra le informazioni di accesso

### Metodo 2: Docker Compose Manuale

```bash
# Avvia tutti i servizi in background
docker compose up -d

# Visualizza i log in tempo reale
docker compose logs -f

# Verifica lo stato dei container
docker compose ps
```

Output atteso:
```
NAME                IMAGE                    STATUS         PORTS
sphyra-frontend     sphyra-wellness-frontend Up 2 minutes   0.0.0.0:80->80/tcp
sphyra-backend      sphyra-wellness-backend  Up 2 minutes   0.0.0.0:3001->3001/tcp
sphyra-couchdb      apache/couchdb:latest    Up 2 minutes   0.0.0.0:5984->5984/tcp
```

### Verifica che tutto funzioni

```bash
# Verifica CouchDB
curl http://localhost:5984/_up

# Verifica Backend
curl http://localhost:3001/api/health

# Verifica Frontend (browser)
# Apri: http://localhost
```

---

## 🗄️ Configurazione Iniziale CouchDB

Dopo il primo avvio, devi configurare i database CouchDB.

### Metodo 1: Interfaccia Web (Semplice)

1. **Accedi all'applicazione**:
   ```
   http://localhost
   ```

2. **Vai su Impostazioni**:
   - Clicca sull'icona dell'ingranaggio in alto a destra
   - Seleziona il tab "Sincronizzazione"

3. **Configura CouchDB**:
   ```
   URL CouchDB: http://localhost:5984
   Username: admin
   Password: (quella che hai messo in .env)
   ```

4. **Clicca "Inizializza Database"**:
   - Questo crea automaticamente tutti gli 8 database necessari
   - Attendi il messaggio di successo

5. **Abilita la sincronizzazione**:
   - Attiva l'interruttore "Sincronizzazione Automatica"
   - Verifica che lo stato sia "Connesso"

### Metodo 2: Script Automatico

```bash
# Dalla directory del progetto
cd scripts
node setup-couchdb.js

# Oppure dal docker-compose:
docker compose exec backend node scripts/setup-couchdb.js
```

### Metodo 3: Interfaccia Fauxton (Avanzato)

1. **Accedi a Fauxton**:
   ```
   http://localhost:5984/_utils
   ```
   Username: `admin`
   Password: (quella in `.env`)

2. **Crea i database manualmente** (clicca "Create Database"):
   - `sphyra-customers`
   - `sphyra-services`
   - `sphyra-staff`
   - `sphyra-appointments`
   - `sphyra-payments`
   - `sphyra-reminders`
   - `sphyra-staff-roles`
   - `sphyra-service-categories`

3. **Configura CORS**:
   ```bash
   cd scripts
   node configure-couchdb-cors.cjs
   ```

**Guida completa**: Vedi `COUCHDB_SETUP.md` per dettagli avanzati.

---

## 🌐 Accesso all'Applicazione

Dopo l'avvio, l'applicazione è accessibile su:

| Servizio | URL Locale | URL Rete Locale (RPi) | Porta |
|----------|------------|------------------------|-------|
| **Frontend PWA** | http://localhost | http://192.168.1.X | 80 |
| **Backend API** | http://localhost:3001 | http://192.168.1.X:3001 | 3001 |
| **CouchDB Fauxton** | http://localhost:5984/_utils | http://192.168.1.X:5984/_utils | 5984 |

### Accesso da Altri Dispositivi (Rete Locale)

Se hai installato su Raspberry Pi o server locale:

1. **Trova l'indirizzo IP**:
   ```bash
   # Linux/Raspberry Pi:
   hostname -I

   # Windows:
   ipconfig
   ```

2. **Accedi dal browser di altri dispositivi**:
   ```
   http://192.168.1.X
   ```
   (Sostituisci X con l'IP del tuo server)

3. **Installa come PWA**:
   - Su Chrome/Edge: clicca sull'icona "Installa" nella barra degli indirizzi
   - Su Safari iOS: "Condividi" → "Aggiungi a Home"
   - Su Android: "Menu" → "Installa app"

---

## 🔧 Gestione dei Container

### Visualizza lo Stato

```bash
# Lista tutti i container
docker compose ps

# Visualizza l'uso delle risorse
docker stats

# Visualizza i log
docker compose logs -f

# Log di un singolo servizio
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f couchdb
```

### Riavvio

```bash
# Riavvia tutti i servizi
docker compose restart

# Riavvia un singolo servizio
docker compose restart backend

# Riavvio completo (ricrea i container)
docker compose down
docker compose up -d
```

### Ferma l'Applicazione

```bash
# Ferma i container (mantiene i dati)
docker compose stop

# Ferma e rimuovi i container (mantiene i dati)
docker compose down

# Ferma e rimuovi TUTTO (⚠️ cancella anche i dati!)
docker compose down -v
```

### Aggiorna un Servizio

```bash
# Dopo modifiche al codice, rebuilda e riavvia
docker compose up -d --build

# Rebuilda un singolo servizio
docker compose up -d --build frontend
docker compose up -d --build backend
```

---

## 💾 Backup e Ripristino

### Backup dei Dati CouchDB

#### Metodo 1: Backup del Volume Docker

```bash
# Ferma i container
docker compose stop couchdb

# Backup del volume
docker run --rm \
  -v sphyrawellness_couchdb_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/couchdb-backup-$(date +%Y%m%d).tar.gz -C /data .

# Riavvia CouchDB
docker compose start couchdb
```

#### Metodo 2: Export tramite CouchDB API

```bash
# Script di backup completo
#!/bin/bash
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

DATABASES=("sphyra-customers" "sphyra-services" "sphyra-staff" "sphyra-appointments" "sphyra-payments" "sphyra-reminders" "sphyra-staff-roles" "sphyra-service-categories")

for db in "${DATABASES[@]}"; do
  echo "Backup di $db..."
  curl -X GET "http://admin:password@localhost:5984/$db/_all_docs?include_docs=true" \
    -o "$BACKUP_DIR/$db.json"
done

echo "Backup completato in: $BACKUP_DIR"
```

### Ripristino

```bash
# Ripristino del volume
docker compose stop couchdb
docker run --rm \
  -v sphyrawellness_couchdb_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/couchdb-backup-YYYYMMDD.tar.gz -C /data
docker compose start couchdb
```

### Backup Automatico

Aggiungi al crontab:
```bash
# Backup giornaliero alle 2:00 AM
0 2 * * * /path/to/sphyrawellness/backup.sh
```

---

## 🔄 Aggiornamento

### Aggiornamento dell'Applicazione

```bash
# 1. Backup dei dati (vedi sezione precedente)
./backup.sh

# 2. Scarica gli aggiornamenti
git pull origin main

# 3. Rebuilda le immagini
docker compose build --no-cache

# 4. Riavvia i container
docker compose up -d

# 5. Verifica che tutto funzioni
docker compose ps
docker compose logs -f
```

### Aggiornamento Docker

#### Windows (Docker Desktop)
- Docker Desktop → Settings → Software Updates → "Check for updates"

#### Linux/Raspberry Pi
```bash
sudo apt-get update
sudo apt-get upgrade docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

---

## 🛠️ Troubleshooting

### Container non si avviano

```bash
# Verifica gli errori nei log
docker compose logs

# Verifica lo spazio disco
df -h

# Verifica la memoria
free -h

# Pulisci risorse Docker inutilizzate
docker system prune -a
```

### CouchDB non si connette

```bash
# Verifica che CouchDB sia in esecuzione
docker compose ps couchdb

# Testa la connessione
curl http://localhost:5984/_up

# Verifica le credenziali nel .env
cat .env | grep COUCHDB

# Controlla i log di CouchDB
docker compose logs couchdb
```

### Backend non invia email

```bash
# Verifica la configurazione SendGrid
docker compose logs backend | grep -i sendgrid

# Testa la API Key
curl --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header "Authorization: Bearer $SENDGRID_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@example.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
```

### Porte già in uso

Se ricevi errori tipo "port is already allocated":

```bash
# Linux/macOS: trova il processo sulla porta
sudo lsof -i :80
sudo lsof -i :3001
sudo lsof -i :5984

# Windows:
netstat -ano | findstr :80
netstat -ano | findstr :3001
netstat -ano | findstr :5984

# Opzione 1: ferma il processo
sudo kill -9 <PID>

# Opzione 2: cambia porta nel docker-compose.yml
# Esempio: "8080:80" invece di "80:80"
```

### Performance lente su Raspberry Pi

```bash
# 1. Verifica temperatura
vcgencmd measure_temp

# 2. Limita memoria dei container nel docker-compose.yml
# Aggiungi sotto ogni servizio:
    deploy:
      resources:
        limits:
          memory: 512M

# 3. Usa un SSD USB invece della SD card

# 4. Disabilita servizi non necessari
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
```

### Reset Completo

Se tutto il resto fallisce:

```bash
# ⚠️ ATTENZIONE: Cancella tutti i dati!

# Ferma e rimuovi tutto
docker compose down -v

# Pulisci Docker
docker system prune -a --volumes

# Ricrea tutto da zero
docker compose up -d
```

---

## ❓ FAQ

### 1. Posso usare un database diverso da CouchDB?

No, l'applicazione è progettata specificamente per PouchDB/CouchDB per la sincronizzazione offline-first.

### 2. Devo esporre la porta 5984 (CouchDB) su Internet?

**Sconsigliato per sicurezza**. Usa un reverse proxy con SSL se necessario. Meglio accedere via VPN.

### 3. Come configuro HTTPS?

Usa un reverse proxy come Nginx o Traefik con Let's Encrypt:

```yaml
# docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
```

### 4. Posso installare senza Docker?

Sì, ma è più complesso. Vedi `DEPLOY_GUIDE.md` per istruzioni manuali.

### 5. Come cambio la porta del frontend?

Modifica `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "8080:80"  # Cambia 8080 con la porta desiderata
```

### 6. L'applicazione funziona offline?

Sì! È una PWA. Una volta installata, funziona completamente offline. I dati si sincronizzano quando torni online.

### 7. Quanti utenti può gestire?

Dipende dall'hardware:
- **Raspberry Pi 5 (8GB)**: 5-10 utenti simultanei
- **Server dedicato**: 50+ utenti simultanei
- **Cloud (4 CPU, 8GB RAM)**: 100+ utenti

### 8. Come faccio backup automatici?

Usa cron (Linux) o Task Scheduler (Windows):

```bash
# Cron (Linux/Raspberry Pi)
0 2 * * * /home/user/sphyrawellness/backup.sh

# Task Scheduler (Windows)
# Pianifica backup.bat ogni giorno alle 2:00 AM
```

### 9. Posso usare Cloudant invece di CouchDB locale?

Sì! Modifica `.env`:
```env
COUCHDB_URL=https://username.cloudant.com
COUCHDB_USERNAME=your-api-key
COUCHDB_PASSWORD=your-api-password
```

Poi rimuovi il servizio `couchdb` da `docker-compose.yml`.

### 10. Come monitoro l'applicazione?

Usa strumenti come:
- **Portainer**: interfaccia web per Docker
- **Grafana + Prometheus**: metriche avanzate
- **Uptime Kuma**: monitoring uptime

```bash
# Portainer (esempio)
docker volume create portainer_data
docker run -d -p 9000:9000 --name=portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data portainer/portainer-ce
```

---

## 📚 Risorse Aggiuntive

### Documentazione Correlata

- `README.md` - Panoramica del progetto
- `COUCHDB_SETUP.md` - Configurazione dettagliata CouchDB
- `EMAIL_REMINDERS_GUIDE.md` - Configurazione SendGrid
- `DEPLOY_GUIDE.md` - Deploy su GitHub Pages
- `MANUALE_CONFIGURAZIONE_NOTEBOOK.md` - Manuale operativo

### Link Utili

- **Documentazione Docker**: https://docs.docker.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **CouchDB Docs**: https://docs.couchdb.org/
- **SendGrid Docs**: https://docs.sendgrid.com/
- **Raspberry Pi**: https://www.raspberrypi.com/documentation/

### Supporto

- **Repository GitHub**: https://github.com/TNT-Labs/sphyrawellness
- **Issues**: https://github.com/TNT-Labs/sphyrawellness/issues

---

## 📝 Note Finali

### Raccomandazioni di Sicurezza

1. ✅ **Cambia sempre** la password di CouchDB in produzione
2. ✅ **Non esporre** la porta 5984 su Internet
3. ✅ **Usa HTTPS** per accesso remoto
4. ✅ **Fai backup** regolari dei dati
5. ✅ **Aggiorna** Docker e l'applicazione regolarmente
6. ✅ **Monitora** i log per attività sospette

### Performance Tips

1. 🚀 Usa SSD invece di HDD/SD card
2. 🚀 Alloca RAM sufficiente ai container
3. 🚀 Per Raspberry Pi: usa dissipatori e ventole
4. 🚀 Limita i log di Docker (vedi sezione RPi)
5. 🚀 Usa un reverse proxy con caching (Nginx)

### Prossimi Passi

Dopo l'installazione:

1. ✅ Configura SendGrid per le email
2. ✅ Importa/crea i dati iniziali (servizi, personale)
3. ✅ Configura il backup automatico
4. ✅ Installa la PWA sui dispositivi
5. ✅ Leggi `MANUALE_CONFIGURAZIONE_NOTEBOOK.md` per l'uso

---

**🎉 Congratulazioni! Sphyra Wellness è ora installato e pronto all'uso!**

Per domande o problemi, apri una issue su GitHub o consulta la documentazione.

---

**Licenza**: MIT
**Autore**: TNT Labs
**Versione**: 1.0.0
