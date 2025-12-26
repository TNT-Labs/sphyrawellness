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
- 🔒 **Sicurezza** - Autenticazione JWT e password cifrate

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

## 🌐 Deploy con HTTPS Pubblico (DuckDNS + Let's Encrypt)

Per esporre l'applicazione pubblicamente con HTTPS:

**📖 Guida Completa**: Vedi [DEPLOY_DUCKDNS.md](DEPLOY_DUCKDNS.md) e [SETUP_HTTPS_DUCKDNS_COMPLETE.md](SETUP_HTTPS_DUCKDNS_COMPLETE.md)

**Quick Start:**
```bash
# 1. Configura ambiente
cp .env.letsencrypt.example .env
# Modifica .env con il tuo dominio e email

# 2. Avvia deploy automatico
chmod +x deploy-duckdns.sh
./deploy-duckdns.sh
```

**Stack:**
- ✅ Docker + Docker Compose
- ✅ Nginx reverse proxy
- ✅ PostgreSQL 16 database
- ✅ HTTPS con Let's Encrypt
- ✅ DuckDNS per DNS dinamico

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

### Frontend
- **React 18** - UI Framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Axios** - HTTP client
- **Vite PWA Plugin** - Service Worker e Manifest
- **Lucide React** - Icons
- **date-fns** - Date utilities
- **Zod** - Schema validation

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Prisma** - ORM
- **PostgreSQL 16** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **SendGrid** - Email service
- **Multer** - File uploads

## 📱 PWA Features

- ✅ Service Worker per caching
- ✅ Web App Manifest
- ✅ Icone ottimizzate (192x192, 512x512)
- ✅ Theme color e splash screen
- ✅ Installabile su dispositivi
- ✅ Funzionamento offline
- ✅ Update automatici

## 📝 Licenza

MIT License - vedi [LICENSE](LICENSE)

## 🤝 Contributi

I contributi sono benvenuti! Sentiti libero di aprire issue o pull request.

---

Sviluppato con ❤️ per il settore wellness
