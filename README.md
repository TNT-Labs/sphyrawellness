# 💆‍♀️ Sphyra Wellness Lab - PWA Gestione Centro Estetico

Applicazione Progressive Web App (PWA) per la gestione completa di centri estetici e spa.

## ✨ Caratteristiche

- 📱 **Progressive Web App** - Installabile su tutti i dispositivi
- 📅 **Gestione Appuntamenti** - Sistema completo di prenotazioni
- 👥 **Gestione Clienti** - Archivio clienti con storico trattamenti
- 💅 **Catalogo Trattamenti** - Gestione servizi e listino prezzi
- 📊 **Dashboard** - Statistiche e metriche in tempo reale
- 🔔 **Notifiche** - Sistema di promemoria appuntamenti
- 💳 **Gestione Pagamenti** - Tracciamento incassi e fatturazione
- 📱 **Responsive** - Ottimizzato per mobile, tablet e desktop
- 🔒 **Offline-first** - Funziona anche senza connessione
- 🔄 **Sincronizzazione CouchDB** - Sync multi-dispositivo opzionale (vedi [COUCHDB_SETUP.md](COUCHDB_SETUP.md))

## 🏗️ Architettura

**Nuova architettura (PostgreSQL + REST API):**
- **Frontend:** React + Vite (PWA)
- **Backend:** Node.js + Express + Prisma ORM
- **Database:** PostgreSQL 16
- **Autenticazione:** JWT
- **API:** REST endpoints type-safe

> ℹ️ **Migrazione completata:** L'applicazione è stata migrata da PouchDB/CouchDB a PostgreSQL + REST API. Vedi [MIGRATION_SUCCESS.md](MIGRATION_SUCCESS.md) per dettagli.

---

## 🐳 Deploy con Docker (NUOVO - Raccomandato)

**Stack completo dockerizzato:** Frontend + Backend + Database

### Quick Start Docker

```bash
# 1. Setup automatico con script interattivo
chmod +x docker-init.sh
./docker-init.sh

# 2. Accedi all'applicazione
# Frontend: http://localhost
# Backend API: http://localhost:3001
# Login: admin / admin123
```

### Deploy Manuale

```bash
# 1. Crea configurazione
cp .env.docker.example .env.docker

# 2. Avvia tutti i servizi
docker compose --env-file .env.docker up -d

# 3. Verifica stato
docker compose --env-file .env.docker ps
```

### Servizi Disponibili

| Servizio | Container | Porta | Descrizione |
|----------|-----------|-------|-------------|
| **Frontend** | sphyra-frontend | 80 | React + Nginx |
| **Backend** | sphyra-backend | 3001 | Node.js + Prisma |
| **Database** | sphyra-postgres | 5432 | PostgreSQL 16 |
| **pgAdmin** | sphyra-pgadmin | 5050 | GUI Database (opzionale) |

**📖 Guida completa Docker:** Vedi [DOCKER_GUIDE.md](DOCKER_GUIDE.md)

**Vantaggi:**
- ✅ Setup completo in 2 minuti
- ✅ Zero configurazione richiesta
- ✅ Database PostgreSQL professionale
- ✅ API REST type-safe con Prisma
- ✅ Isolamento completo dei servizi
- ✅ Health checks automatici
- ✅ Volumi persistenti per i dati

---

## 🚀 Deploy Alternativi (Vecchia Architettura)

> ⚠️ **Nota:** Le seguenti guide si riferiscono alla vecchia architettura con CouchDB e sono mantenute per retrocompatibilità.

L'applicazione era progettata per l'esecuzione in ambiente **Docker con HTTPS privato**.

### 🔒 Deployment HTTPS Privato (Rete Locale)

Per installare l'applicazione in ambiente privato con HTTPS e Nginx:

1. **Quick Start**: Vedi [QUICK-START-PRIVATE.md](QUICK-START-PRIVATE.md)
2. **Setup Completo**: Vedi [HTTPS-PRIVATE-NETWORK.md](HTTPS-PRIVATE-NETWORK.md)
3. **Installazione Docker**: Vedi [DOCKER_INSTALL_GUIDE.md](DOCKER_INSTALL_GUIDE.md)

**Domini supportati:**
- `https://sphyra.local` (dominio locale)
- `https://192.168.1.95` (IP privato configurabile)

**Stack:**
- ✅ Docker + Docker Compose
- ✅ Nginx reverse proxy
- ✅ HTTPS con certificati self-signed
- ✅ CouchDB per storage dati
- ✅ Backend Node.js per email reminders

### 🚀 Deployment HTTPS Pubblico - Quick Tunnel (ZERO CONFIG)

**🎯 La soluzione PIÙ VELOCE: URL pubblico in 2 minuti senza configurare NULLA!**

Ottieni un URL pubblico tipo `sphyrawellness-xxx.trycloudflare.com` **automaticamente**!

**📖 Guida Completa**: Vedi [docs/QUICKTUNNEL_SETUP_IT.md](docs/QUICKTUNNEL_SETUP_IT.md)

**Vantaggi:**
- ✅ **ZERO configurazione** richiesta
- ✅ **NESSUN dominio** necessario
- ✅ **NESSUN token** richiesto
- ✅ **NESSUNA configurazione DNS**
- ✅ Deploy in **2 minuti**!
- ✅ **HTTPS automatico** con certificato valido
- ✅ Funziona con **CGNAT** (Fastweb, WindTre, ecc.)
- ✅ Completamente **GRATUITO**

**⚠️ Limitazioni:**
- ⚠️ URL **casuale** generato ad ogni riavvio
- ⚠️ Ideale per **test, demo, sviluppo**
- ⚠️ Per produzione → usa Cloudflare Tunnel con dominio personalizzato

**Quick Start:**
```bash
# 1. Configura ambiente (opzionale, usa default)
cp .env.quicktunnel.example .env

# 2. Deploy immediato!
chmod +x deploy-quicktunnel.sh
./deploy-quicktunnel.sh

# 3. Lo script mostrerà l'URL pubblico tipo:
#    https://sphyrawellness-abc123.trycloudflare.com
```

**Caso d'uso ideale:**
- 🎯 Demo rapide a clienti
- 🧪 Test e sviluppo
- 📱 Accesso remoto temporaneo
- 🚀 Proof of concept

**Stack:**
- ✅ Docker + Docker Compose
- ✅ Cloudflare Quick Tunnel (cloudflared)
- ✅ Nginx reverse proxy
- ✅ HTTPS automatico
- ✅ CouchDB per storage dati
- ✅ Backend Node.js per email reminders

---

### 🌐 Deployment HTTPS Pubblico - Cloudflare Tunnel (CONSIGLIATO per produzione)

**🎯 Soluzione ideale per connessioni Fastweb, WindTre e altri ISP con CGNAT**

Esponi il sito pubblicamente **SENZA aprire alcuna porta sul router**!

**📖 Guida Completa**: Vedi [docs/CLOUDFLARE_TUNNEL_SETUP_IT.md](docs/CLOUDFLARE_TUNNEL_SETUP_IT.md)

**Vantaggi:**
- ✅ **NESSUNA porta da aprire** (né 80, né 443)
- ✅ Funziona con **CGNAT** (Fastweb, WindTre, ecc.)
- ✅ **IP nascosto** al pubblico (maggiore sicurezza)
- ✅ **CDN globale** incluso
- ✅ **Protezione DDoS** automatica
- ✅ **SSL/TLS** gestito da Cloudflare
- ✅ Completamente **GRATUITO**

**Requisiti:**
- ✅ Account Cloudflare (gratuito)
- ✅ Dominio gestito da Cloudflare DNS
- ✅ Docker + Docker Compose
- ✅ Connessione Internet (solo outbound)

**Quick Start:**
```bash
# 1. Configura ambiente
cp .env.cloudflare.example .env
# Modifica .env con dominio e token Cloudflare

# 2. Deploy automatico
chmod +x deploy-cloudflare.sh
./deploy-cloudflare.sh
```

**Stack:**
- ✅ Docker + Docker Compose
- ✅ Cloudflare Tunnel (cloudflared)
- ✅ Nginx reverse proxy
- ✅ HTTPS gestito da Cloudflare
- ✅ CouchDB per storage dati
- ✅ Backend Node.js per email reminders

---

### 🌐 Deployment HTTPS Pubblico - Let's Encrypt (alternativa)

**⚠️ Richiede porte aperte sul router - NON funziona con CGNAT**

Per installare l'applicazione con certificati SSL/TLS validi tramite Let's Encrypt:

**📖 Guida Completa**: Vedi [docs/LETSENCRYPT_SETUP_IT.md](docs/LETSENCRYPT_SETUP_IT.md)

**Requisiti:**
- ✅ Dominio pubblico registrato
- ✅ DNS configurato correttamente
- ✅ **Porte 80 e 443 aperte** sul router
- ✅ **IP pubblico statico o dinamico** (NO CGNAT)
- ✅ Docker + Docker Compose

**Quick Start:**
```bash
# 1. Configura ambiente
cp .env.letsencrypt.example .env
# Modifica .env con il tuo dominio e email

# 2. Genera certificati
chmod +x scripts/init-letsencrypt.sh
./scripts/init-letsencrypt.sh

# 3. Avvia servizi
docker-compose -f docker-compose.letsencrypt.yml up -d
```

**Stack:**
- ✅ Docker + Docker Compose
- ✅ Nginx reverse proxy
- ✅ HTTPS con certificati Let's Encrypt (validi e fidati)
- ✅ Rinnovo automatico certificati ogni 12 ore
- ✅ CouchDB per storage dati
- ✅ Backend Node.js per email reminders

## 🛠️ Sviluppo

### Prerequisiti

- Node.js 18+
- npm

### Installazione

```bash
npm install
```

### Sviluppo locale

```bash
npm run dev
```

L'app sarà disponibile su `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview build

```bash
npm run preview
```

## 📦 Tecnologie

- **React 18** - UI Framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Vite PWA Plugin** - Service Worker e Manifest
- **Workbox** - Caching strategies
- **PouchDB** - Local database
- **CouchDB** - Remote sync (opzionale)
- **Lucide React** - Icons
- **date-fns** - Date utilities

## 📱 PWA Features

- ✅ Service Worker per caching
- ✅ Web App Manifest
- ✅ Icone ottimizzate (192x192, 512x512)
- ✅ Theme color e splash screen
- ✅ Installabile su dispositivi
- ✅ Funzionamento offline
- ✅ Update automatici

## 🔄 Sincronizzazione Multi-Dispositivo

L'app supporta la sincronizzazione opzionale con **CouchDB** per mantenere i dati aggiornati su più dispositivi.

### Setup CouchDB

Per configurare la sincronizzazione:

1. **Installa CouchDB** (vedi [COUCHDB_SETUP.md](COUCHDB_SETUP.md) per istruzioni dettagliate)
   - Docker (consigliato)
   - Installazione locale

2. **Crea i database automaticamente**:
   ```bash
   npm run setup-couchdb -- http://localhost:5984 admin password
   ```

3. **Configura l'app**:
   - Apri Impostazioni nell'app
   - Inserisci URL CouchDB e credenziali
   - Abilita sincronizzazione

**📖 Documentazione completa**: [COUCHDB_SETUP.md](COUCHDB_SETUP.md)

### Database Creati

Lo script di setup crea automaticamente questi database:
- `sphyra-customers` - Clienti
- `sphyra-services` - Servizi
- `sphyra-staff` - Personale
- `sphyra-appointments` - Appuntamenti
- `sphyra-payments` - Pagamenti
- `sphyra-reminders` - Promemoria
- `sphyra-staff-roles` - Ruoli
- `sphyra-service-categories` - Categorie

## 📝 Licenza

MIT License - vedi [LICENSE](LICENSE)

## 🤝 Contributi

I contributi sono benvenuti! Sentiti libero di aprire issue o pull request.

---

Sviluppato con ❤️ per il settore wellness
