# 🔒 Setup Sphyra Wellness - Ambiente Privato HTTPS

Guida completa per l'installazione di Sphyra Wellness Lab in ambiente **Docker + HTTPS + Nginx** su rete privata.

---

## 📋 Contesto

Questa applicazione è configurata per essere eseguita in:

✅ **Docker**
✅ **Ambiente privato** (rete locale)
✅ **HTTPS** con certificati self-signed
✅ **Nginx** come reverse proxy

**Domini supportati:**
- `https://sphyra.local` (dominio locale mDNS)
- `https://192.168.1.95` (IP privato - configurabile)

❌ **NON supporta:**
- Deploy pubblici su cloud
- Domini pubblici con Let's Encrypt
- HTTP senza SSL
- Servizi esposti direttamente senza Nginx

---

## 🎯 Quick Start

### 1️⃣ Prerequisiti

- **Docker** e **Docker Compose** installati
- **Rete privata** configurata
- **Accesso al PC server** (dove gireranno i container)

**Guide di riferimento:**
- [DOCKER_INSTALL_GUIDE.md](DOCKER_INSTALL_GUIDE.md) - Installazione Docker
- [QUICK-START-PRIVATE.md](QUICK-START-PRIVATE.md) - Setup rapido

---

### 2️⃣ Configurazione Environment

```bash
# Copia il template
cp .env.private.example .env

# Modifica le variabili
nano .env
```

**Variabili obbligatorie da modificare:**

```bash
# Dominio privato (scegli una delle opzioni)
PRIVATE_DOMAIN=sphyra.local          # Opzione 1: dominio .local
# PRIVATE_DOMAIN=192.168.1.95       # Opzione 2: IP diretto

# JWT Secret (genera una chiave casuale)
JWT_SECRET=<genera-stringa-casuale-32-caratteri>

# CouchDB Password (IMPORTANTE: cambiare!)
COUCHDB_PASSWORD=<password-sicura>

# SendGrid (per email reminders)
SENDGRID_API_KEY=SG.your-api-key
SENDGRID_FROM_EMAIL=noreply@tuodominio.it
```

**Genera JWT Secret:**
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

---

### 3️⃣ Generazione Certificati SSL

**Linux/Mac:**
```bash
./generate-self-signed-cert.sh
```

**Windows PowerShell:**
```powershell
.\generate-self-signed-cert.ps1
```

I certificati verranno creati in `nginx/ssl/`:
- `sphyra.crt` - Certificato pubblico
- `sphyra.key` - Chiave privata

> **Nota:** I certificati self-signed causeranno un warning nel browser. È normale per ambienti privati.

**Per eliminare il warning:**
- **Windows:** Vedi [README-CERTIFICATI-WINDOWS.md](README-CERTIFICATI-WINDOWS.md)
- **Linux/Mac:** Importa `sphyra.crt` nel keychain del sistema

---

### 4️⃣ Configurazione Nginx (se usi IP diverso)

Se usi un IP diverso da `192.168.1.95`, modifica:

```bash
nano nginx/conf.d/sphyra.conf
```

Cambia la riga:
```nginx
server_name sphyra.local 192.168.1.95;
```

In:
```nginx
server_name sphyra.local 192.168.1.XXX;  # Il tuo IP
```

---

### 5️⃣ Avvio Stack Docker

```bash
# Avvia tutti i servizi
docker-compose -f docker-compose.https-private.yml up -d

# Verifica che tutti i container siano running
docker-compose -f docker-compose.https-private.yml ps

# Visualizza i log
docker-compose -f docker-compose.https-private.yml logs -f
```

**Servizi avviati:**
- `sphyra-nginx` - Reverse proxy HTTPS
- `sphyra-frontend` - Applicazione React PWA
- `sphyra-backend` - API Node.js
- `sphyra-couchdb` - Database

---

### 6️⃣ Accesso Applicazione

**Apri il browser e vai a:**
- `https://sphyra.local` (se hai configurato dominio .local)
- `https://192.168.1.95` (se hai configurato IP diretto)

> ⚠️ **Warning "Connessione non sicura":**
> È normale per certificati self-signed. Clicca su "Avanzate" → "Procedi comunque".

---

### 7️⃣ Configurazione Iniziale App

1. **Accedi all'app** (usa credenziali predefinite o crea primo utente)
2. **Vai in Impostazioni**
3. **Configura CouchDB Sync** (opzionale):
   - URL: `https://sphyra.local/db` oppure `https://192.168.1.95/db`
   - Username: `admin`
   - Password: quella impostata in `.env`

4. **Configura Reminders Email** (opzionale):
   - Accessibile solo dal PC server
   - Imposta orario invio automatico

---

## 📂 File Utilizzati (Stack Corretto)

### ✅ File Docker
- `docker-compose.https-private.yml` - Compose principale
- `Dockerfile.https` - Frontend
- `server/Dockerfile` - Backend

### ✅ Configurazione
- `.env` (creato da `.env.private.example`)
- `nginx/nginx.conf`
- `nginx/conf.d/sphyra.conf`
- `nginx/ssl/sphyra.crt` e `sphyra.key`

### ❌ File Deprecati (NON usare)
- `docker-compose.http.deprecated.yml` - Espone porte HTTP
- `docker-compose.traefik.deprecated.yml` - Per domini pubblici
- `Dockerfile.with-proxy.deprecated` - Proxy interno non necessario
- `.env.http.deprecated` - Configurazione HTTP
- `.env.traefik.deprecated` - Per Let's Encrypt pubblico

---

## 🔧 Comandi Utili

### Gestione Stack

```bash
# Arresta tutti i servizi
docker-compose -f docker-compose.https-private.yml down

# Riavvia
docker-compose -f docker-compose.https-private.yml restart

# Rebuild dopo modifiche
docker-compose -f docker-compose.https-private.yml up -d --build

# Visualizza log di un servizio specifico
docker-compose -f docker-compose.https-private.yml logs -f backend
```

### Gestione Database

```bash
# Accedi a CouchDB Admin
# Browser: https://sphyra.local/db/_utils
# Username: admin
# Password: quella in .env

# Backup database
docker exec sphyra-couchdb curl -X GET http://admin:password@localhost:5984/sphyra-appointments/_all_docs?include_docs=true > backup.json

# Setup database (crea database se non esistono)
npm run setup-couchdb
```

### Debugging

```bash
# Verifica health dei servizi
curl -k https://sphyra.local/health

# Controlla certificati SSL
openssl s_client -connect sphyra.local:443 -servername sphyra.local

# Accedi al container backend
docker exec -it sphyra-backend sh

# Accedi al container Nginx
docker exec -it sphyra-nginx sh
```

---

## 🌐 Accesso da Altri Dispositivi (Rete Privata)

### Da PC/Laptop sulla stessa rete

1. **Usa l'IP del server:**
   ```
   https://192.168.1.95
   ```

2. **Oppure configura hosts file:**

   **Windows:** `C:\Windows\System32\drivers\etc\hosts`
   **Linux/Mac:** `/etc/hosts`

   Aggiungi:
   ```
   192.168.1.95  sphyra.local
   ```

3. **Installa certificato** (per eliminare warning):
   - Scarica `nginx/ssl/sphyra.crt`
   - Importa nel keychain del dispositivo

### Da Mobile/Tablet

1. **Connetti al WiFi** della rete locale
2. **Apri browser** e vai a `https://192.168.1.95`
3. **Accetta warning** certificato self-signed
4. **Installa PWA** cliccando "Aggiungi a schermata Home"

---

## 🔐 Security Best Practices

### ✅ Configurazioni Sicure

- ✅ **HTTPS obbligatorio** (HTTP redirect a HTTPS)
- ✅ **CouchDB non esposto** direttamente (solo via Nginx `/db/*`)
- ✅ **Backend non esposto** direttamente (solo via Nginx `/api/*`)
- ✅ **CORS ristretto** a domini HTTPS privati
- ✅ **Security headers** (HSTS, CSP, X-Frame-Options)
- ✅ **Rate limiting** su API

### ⚠️ Da Configurare

- [ ] **JWT_SECRET:** Genera stringa casuale forte
- [ ] **COUCHDB_PASSWORD:** Cambia password default
- [ ] **Firewall:** Limita accesso solo a rete privata
- [ ] **Backup regolari:** Configura backup CouchDB

### 🚨 Warning Normali

- **"Connessione non sicura" browser:** Normale per certificati self-signed
- **Mixed Content warnings:** Verifica che tutti gli URL siano HTTPS

---

## 📖 Documentazione Completa

- **[QUICK-START-PRIVATE.md](QUICK-START-PRIVATE.md)** - Setup rapido
- **[HTTPS-PRIVATE-NETWORK.md](HTTPS-PRIVATE-NETWORK.md)** - Guida HTTPS dettagliata
- **[DOCKER_INSTALL_GUIDE.md](DOCKER_INSTALL_GUIDE.md)** - Installazione Docker
- **[COUCHDB_SETUP.md](COUCHDB_SETUP.md)** - Configurazione CouchDB
- **[EMAIL_REMINDERS_GUIDE.md](EMAIL_REMINDERS_GUIDE.md)** - Setup email reminders
- **[README-CERTIFICATI-WINDOWS.md](README-CERTIFICATI-WINDOWS.md)** - Certificati Windows

---

## ❓ Troubleshooting

### Problema: "Impossibile raggiungere il sito"

**Soluzioni:**
1. Verifica che i container siano running: `docker-compose ps`
2. Controlla i log: `docker-compose logs -f nginx`
3. Verifica che la porta 443 non sia occupata: `sudo lsof -i :443`
4. Controlla firewall: `sudo ufw status`

### Problema: "Certificato non valido"

**Soluzioni:**
1. Rigenera certificati: `./generate-self-signed-cert.sh`
2. Verifica che `nginx/ssl/sphyra.crt` esista
3. Installa certificato nel sistema (vedi guide specifiche OS)

### Problema: "CORS error"

**Soluzioni:**
1. Verifica `.env`: `VITE_API_URL=https://sphyra.local/api`
2. Controlla `server/src/index.ts` allowedOrigins
3. Assicurati di usare HTTPS (non HTTP)

### Problema: "CouchDB non si connette"

**Soluzioni:**
1. Verifica container: `docker-compose ps couchdb`
2. Testa connessione: `curl -k https://sphyra.local/db`
3. Controlla credenziali in `.env`

---

## 🎓 Architettura

```
┌─────────────────────────────────────────┐
│         Browser (Client)                │
│   https://sphyra.local                  │
└────────────────┬────────────────────────┘
                 │ HTTPS (443)
                 ▼
┌─────────────────────────────────────────┐
│         Nginx (Reverse Proxy)           │
│  - SSL/TLS Termination                  │
│  - Routing                              │
│  - Security Headers                     │
└─┬───────────┬──────────────┬────────────┘
  │           │              │
  │ /         │ /api/*       │ /db/*
  ▼           ▼              ▼
┌─────┐  ┌─────────┐  ┌──────────┐
│Front│  │ Backend │  │ CouchDB  │
│ end │  │ Node.js │  │ Database │
│React│  │ Express │  │          │
└─────┘  └─────────┘  └──────────┘
  :80       :3001        :5984
(internal) (internal)  (internal)
```

**Tutte le porte interne (80, 3001, 5984) NON sono esposte all'esterno.**
**Solo Nginx sulla porta 443 (HTTPS) è accessibile.**

---

## ✅ Checklist Verifica

Dopo il setup, verifica:

- [ ] Stack Docker running: `docker-compose ps` mostra tutti "Up"
- [ ] HTTPS funzionante: `https://sphyra.local` carica l'app
- [ ] Certificati SSL presenti in `nginx/ssl/`
- [ ] File `.env` configurato con password sicure
- [ ] CouchDB accessibile solo via `/db/*`
- [ ] Backend accessibile solo via `/api/*`
- [ ] HTTP redirect a HTTPS funzionante
- [ ] App installabile come PWA
- [ ] Funzionamento offline attivo

---

## 🚀 Prossimi Passi

Dopo l'installazione:

1. **Configura utenti** nell'applicazione
2. **Importa dati** (clienti, servizi, staff)
3. **Configura email reminders** (se necessario)
4. **Setup backup automatici** CouchDB
5. **Installa PWA** sui dispositivi client
6. **Testa sincronizzazione** multi-dispositivo

---

## 📞 Supporto

Per problemi o domande:

1. Controlla [TROUBLESHOOTING-BACKEND.md](TROUBLESHOOTING-BACKEND.md)
2. Verifica i log: `docker-compose logs -f`
3. Apri issue su GitHub

---

**Sviluppato con ❤️ per il settore wellness**
