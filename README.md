# 💆‍♀️ Sphyra Wellness Lab

**Progressive Web App per la gestione completa di centri estetici, spa e wellness**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Indice

- [Descrizione](#-descrizione)
- [Caratteristiche Principali](#-caratteristiche-principali)
- [Architettura](#%EF%B8%8F-architettura)
- [Deploy con Docker](#-deploy-con-docker-raccomandato)
- [Deploy HTTPS Pubblico](#-deploy-https-pubblico)
- [Sviluppo Locale](#%EF%B8%8F-sviluppo-locale)
- [Database](#-database)
- [API REST](#-api-rest)
- [Testing](#-testing)
- [PWA Features](#-pwa-features)
- [Sicurezza](#-sicurezza)
- [Contribuire](#-contribuire)
- [Licenza](#-licenza)

---

## 🎯 Descrizione

**Sphyra Wellness Lab** è una Progressive Web App (PWA) moderna e completa per la gestione di centri estetici, spa e wellness. L'applicazione offre un sistema integrato per la gestione di appuntamenti, clienti, servizi, personale e pagamenti, con pieno supporto GDPR per la gestione dei consensi.

### Caratteristiche Distintive

- **🌐 100% Web-Based**: Nessuna installazione richiesta, funziona su qualsiasi dispositivo
- **📱 PWA Installabile**: Esperienza app nativa su mobile, tablet e desktop
- **🔒 GDPR Compliant**: Gestione completa dei consensi privacy
- **📧 Reminder Automatici**: Email promemoria automatici via SendGrid
- **🎨 UI Moderna**: Interfaccia intuitiva con Tailwind CSS e Lucide Icons
- **⚡ Performance**: Ottimizzato con Vite e caching intelligente
- **🐳 Docker Ready**: Deploy completo containerizzato in 2 minuti

---

## ✨ Caratteristiche Principali

### 📅 Gestione Appuntamenti
- Calendario interattivo con vista giorno/settimana/mese
- Creazione rapida appuntamenti con drag & drop
- Stati: programmato, confermato, completato, cancellato, non presentato
- Codice colore per staff e tipologie servizio
- Storico completo appuntamenti cliente
- Conferma appuntamento via email (link con token)

### 👥 Gestione Clienti
- Database clienti con informazioni di contatto complete
- Gestione consensi GDPR (privacy, email, SMS, dati sanitari, marketing)
- Storico completo appuntamenti e trattamenti
- Note personalizzate e allergie
- Ricerca rapida e filtri avanzati
- Export dati in conformità GDPR

### 💅 Catalogo Servizi
- Gestione completa servizi con prezzi e durate
- Categorie personalizzabili con codici colore
- Upload immagini servizi
- Descrizioni dettagliate e note
- Listino prezzi dinamico

### 👨‍💼 Gestione Personale
- Anagrafica staff con ruoli e specializzazioni
- Foto profilo e colori personalizzati per calendario
- Gestione disponibilità e turni
- Tracciamento performance e statistiche

### 💳 Gestione Pagamenti
- Registrazione pagamenti con multipli metodi (contanti, carta, bonifico)
- Associazione pagamenti ad appuntamenti
- Tracciamento incassi giornalieri/mensili
- Report finanziari

### 🔔 Sistema Reminder
- Email automatiche via SendGrid
- SMS via Twilio (opzionale)
- WhatsApp notifications (framework pronto)
- Rispetto preferenze consenso cliente
- Cron job configurabile per invio automatico

### 📊 Dashboard & Statistiche
- Metriche in tempo reale
- Appuntamenti oggi e prossimi giorni
- Performance mensili e trend
- Report personalizzabili

### 🌐 Prenotazione Pubblica
- Pagina booking accessibile senza login (`/prenota` o `/booking`)
- Selezione servizio e orario disponibile
- Raccolta consensi GDPR
- Conferma via email

### ⚙️ Configurazione Avanzata
- Gestione utenti e ruoli (RESPONSABILE, UTENTE)
- Timeout inattività configurabile
- Impostazioni notifiche
- Personalizzazione tema e branding

---

## 🏗️ Architettura

### Stack Tecnologico Completo

#### **Frontend**
```
- Framework: React 18.3.1
- Linguaggio: TypeScript 5.5.4
- Build Tool: Vite 7.2.4
- Styling: Tailwind CSS 3.4.10
- Routing: React Router DOM 6.26.0
- State Management: React Context API
- HTTP Client: Axios 1.7.9
- PWA: vite-plugin-pwa 1.2.0
- Icons: Lucide React 0.441.0
- Date Utilities: date-fns 3.6.0
- Validation: Zod 4.1.13
- Testing: Vitest 4.0.15 + React Testing Library
```

#### **Backend**
```
- Runtime: Node.js 18+
- Framework: Express.js 4.18.2
- Linguaggio: TypeScript
- ORM: Prisma 6.2.0
- Database: PostgreSQL 16
- Authentication: JWT (jsonwebtoken 9.0.2)
- Password Hashing: bcrypt 5.1.1
- Email: SendGrid @sendgrid/mail 8.1.3
- SMS: Twilio (opzionale)
- File Upload: Multer 2.0.2
- Cron Jobs: node-cron 3.0.3
- Security: Helmet 7.2.0, express-rate-limit
- Testing: Vitest 4.0.16 + Supertest
```

#### **Infrastructure**
```
- Database: PostgreSQL 16 Alpine
- Containerization: Docker + Docker Compose
- Reverse Proxy: Nginx
- SSL/TLS: Let's Encrypt
- DNS: DuckDNS (opzionale)
```

### Architettura Applicativa

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   React    │  │  Service   │  │    PWA     │            │
│  │   App      │◄─┤   Worker   │◄─┤  Manifest  │            │
│  └──────┬─────┘  └────────────┘  └────────────┘            │
└─────────┼───────────────────────────────────────────────────┘
          │ HTTPS
          │ JWT Bearer Token
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   NGINX (Reverse Proxy)                     │
│                   SSL Termination                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│   Frontend      │       │    Backend      │
│   Nginx Server  │       │   Express API   │
│   Port 80       │       │   Port 3001     │
│   (Static)      │       │                 │
└─────────────────┘       └────────┬────────┘
                                   │
                          ┌────────┴────────┐
                          │                 │
                          ▼                 ▼
                   ┌──────────┐      ┌──────────┐
                   │PostgreSQL│      │ SendGrid │
                   │  Port    │      │  Email   │
                   │  5432    │      │  API     │
                   └──────────┘      └──────────┘
```

### Pattern Architetturali

- **Frontend**: Component-based architecture con Context API per state management
- **Backend**: Repository Pattern + Service Layer per separazione logica
- **Database**: Relational schema con Prisma ORM per type-safety
- **API**: RESTful endpoints con validazione Zod
- **Security**: JWT authentication, bcrypt hashing, Helmet headers

---

## 🐳 Deploy con Docker (RACCOMANDATO)

Il modo più semplice e veloce per avviare Sphyra Wellness in produzione.

### Quick Start (2 minuti)

```bash
# 1. Clona il repository
git clone https://github.com/TNT-Labs/sphyrawellness.git
cd sphyrawellness

# 2. Copia e configura l'ambiente
cp .env.docker.example .env.docker

# 3. Avvia tutti i servizi
docker compose --env-file .env.docker up -d

# 4. Verifica che tutto sia attivo
docker compose --env-file .env.docker ps

# 5. Accedi all'applicazione
# Frontend: http://localhost
# Backend API: http://localhost:3001
# Credentials: admin / admin123
```

### Servizi Docker

| Servizio | Container | Porta | Descrizione |
|----------|-----------|-------|-------------|
| **Frontend** | `sphyra-frontend` | 80 | React + Nginx (produzione) |
| **Backend** | `sphyra-backend` | 3001 | Node.js + Express + Prisma |
| **Database** | `sphyra-postgres` | 5432 | PostgreSQL 16 Alpine |
| **pgAdmin** | `sphyra-pgadmin` | 5050 | GUI Database (opzionale) |

### Comandi Docker Utili

```bash
# Vedere i logs
docker compose --env-file .env.docker logs -f

# Logs di un servizio specifico
docker compose --env-file .env.docker logs -f backend

# Fermare tutti i servizi
docker compose --env-file .env.docker down

# Fermare e rimuovere volumi (ATTENZIONE: cancella i dati!)
docker compose --env-file .env.docker down -v

# Riavviare un servizio
docker compose --env-file .env.docker restart backend

# Accedere al container backend
docker compose --env-file .env.docker exec backend sh

# Eseguire migrazioni database
docker compose --env-file .env.docker exec backend npm run prisma:migrate

# Vedere utilizzo risorse
docker stats
```

### Configurazione Ambiente (.env.docker)

```bash
# Database
POSTGRES_DB=sphyra_wellness
POSTGRES_USER=sphyra_user
POSTGRES_PASSWORD=CAMBIAMI_IN_PRODUZIONE

# Backend
DATABASE_URL="postgresql://sphyra_user:CAMBIAMI_IN_PRODUZIONE@postgres:5432/sphyra_wellness"
JWT_SECRET=CAMBIAMI_CON_STRINGA_CASUALE_LUNGA
JWT_EXPIRATION=7d
PORT=3001
NODE_ENV=production

# Email (opzionale)
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@tuodominio.com
SENDGRID_FROM_NAME=Sphyra Wellness

# SMS (opzionale)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+39xxx

# Frontend
VITE_API_URL=http://localhost:3001/api

# pgAdmin (opzionale)
PGADMIN_DEFAULT_EMAIL=admin@sphyra.local
PGADMIN_DEFAULT_PASSWORD=admin
```

**⚠️ IMPORTANTE**: Cambia **tutti** i valori di default in produzione!

### Volumi Persistenti

I dati sono salvati in volumi Docker persistenti:

```
postgres_data    → Database PostgreSQL
pgadmin_data     → Configurazione pgAdmin
```

Per backup dei dati:

```bash
# Backup database
docker compose --env-file .env.docker exec postgres pg_dump -U sphyra_user sphyra_wellness > backup.sql

# Restore database
docker compose --env-file .env.docker exec -T postgres psql -U sphyra_user sphyra_wellness < backup.sql
```

### Documentazione Docker Completa

Per istruzioni dettagliate vedi:
- **[DOCKER_GUIDE.md](DOCKER_GUIDE.md)** - Guida completa Docker
- **[docker-compose.yml](docker-compose.yml)** - Configurazione orchestrazione

---

## 🌐 Deploy HTTPS Pubblico

Per esporre l'applicazione su internet con HTTPS e certificato SSL.

### Prerequisiti

- Server Linux con Docker installato
- Dominio DuckDNS (gratuito) o dominio personalizzato
- Porte 80 e 443 aperte sul firewall

### Quick Start HTTPS

```bash
# 1. Copia template ambiente Let's Encrypt
cp .env.letsencrypt.example .env

# 2. Modifica .env con i tuoi dati
nano .env
# Imposta:
# - DOMAIN=tuodominio.duckdns.org
# - EMAIL=tua@email.com
# - DUCKDNS_TOKEN=xxx (se usi DuckDNS)

# 3. Esegui script deploy automatico
chmod +x deploy-duckdns.sh
./deploy-duckdns.sh

# 4. Accedi via HTTPS
# https://tuodominio.duckdns.org
```

### Servizi Aggiuntivi HTTPS

| Servizio | Porta | Descrizione |
|----------|-------|-------------|
| **Nginx Proxy** | 80, 443 | Reverse proxy + SSL termination |
| **Certbot** | - | Rinnovo automatico certificati |

### Documentazione HTTPS Completa

Per istruzioni dettagliate vedi:
- **[DEPLOY_DUCKDNS.md](DEPLOY_DUCKDNS.md)** - Deploy con DuckDNS
- **[SETUP_HTTPS_DUCKDNS_COMPLETE.md](SETUP_HTTPS_DUCKDNS_COMPLETE.md)** - Guida completa HTTPS

---

## 🛠️ Sviluppo Locale

Per sviluppare e testare in locale senza Docker.

### Prerequisiti

- **Node.js** 18 o superiore
- **npm** 9 o superiore
- **PostgreSQL** 16 (o Docker per solo database)

### Setup Completo

#### 1. Clona Repository

```bash
git clone https://github.com/TNT-Labs/sphyrawellness.git
cd sphyrawellness
```

#### 2. Installa Dipendenze

```bash
# Frontend
npm install

# Backend
cd server
npm install
cd ..
```

#### 3. Setup Database

**Opzione A: PostgreSQL locale**

```bash
# Installa PostgreSQL 16
# macOS: brew install postgresql@16
# Ubuntu: sudo apt install postgresql-16
# Windows: scarica installer da postgresql.org

# Crea database
createdb sphyra_wellness

# Configura .env backend
cd server
cp .env.example .env
# Modifica DATABASE_URL in .env
```

**Opzione B: PostgreSQL con Docker**

```bash
# Avvia solo database
docker compose -f docker-compose.postgres.yml up -d

# Database sarà disponibile su localhost:5432
```

#### 4. Esegui Migrazioni Database

```bash
cd server
npx prisma migrate dev
npx prisma db seed  # Opzionale: dati di test
```

#### 5. Avvia Applicazione

```bash
# Terminal 1: Backend
cd server
npm run dev
# Backend su http://localhost:3001

# Terminal 2: Frontend
npm run dev
# Frontend su http://localhost:5173
```

#### 6. Accedi all'Applicazione

Apri browser su `http://localhost:5173`

**Credenziali default**: `admin` / `admin123`

### Script Disponibili

#### Frontend

```bash
npm run dev              # Avvia dev server Vite
npm run build            # Build produzione
npm run preview          # Preview build
npm run lint             # Controlla codice
npm run lint:fix         # Fix automatico
npm run test             # Esegui test
npm run test:ui          # Test UI interattiva
npm run test:coverage    # Coverage report
```

#### Backend

```bash
cd server
npm run dev              # Avvia con nodemon
npm run build            # Build TypeScript
npm run start            # Avvia build produzione
npm run prisma:studio    # GUI Prisma Studio
npm run prisma:migrate   # Esegui migrations
npm run prisma:generate  # Genera Prisma Client
npm run test             # Esegui test
npm run test:coverage    # Coverage report
```

### Variabili Ambiente Sviluppo

**Frontend** (`.env`)

```bash
VITE_API_URL=http://localhost:3001/api
```

**Backend** (`server/.env`)

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/sphyra_wellness"
JWT_SECRET=dev_secret_key_change_in_production
JWT_EXPIRATION=7d
PORT=3001
NODE_ENV=development

# Opzionale per test email/SMS
SENDGRID_API_KEY=SG.xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
```

---

## 🗄️ Database

### Schema PostgreSQL

Il database utilizza 10 tabelle relazionali:

```sql
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    customers    │────<│  appointments    │>────│    services     │
│                 │     │                  │     │                 │
│ • id (UUID)     │     │ • id (UUID)      │     │ • id (UUID)     │
│ • nome          │     │ • customerId     │     │ • nome          │
│ • cognome       │     │ • serviceId      │     │ • prezzo        │
│ • telefono      │     │ • staffId        │     │ • durata        │
│ • email         │     │ • data           │     │ • categoryId    │
│ • privacy       │     │ • ora            │     │ • immagine      │
│ • consensoEmail │     │ • stato          │     └─────────────────┘
│ • consensoSMS   │     │ • reminderSent   │              │
│ • allergie      │     │ • note           │              │
│ • note          │     └──────────────────┘              │
└─────────────────┘              │                        │
         │                       │                        │
         │                       ▼                        ▼
         │              ┌──────────────────┐    ┌──────────────────┐
         │              │    payments      │    │service_categories│
         │              │                  │    │                  │
         │              │ • id (UUID)      │    │ • id (UUID)      │
         │              │ • appointmentId  │    │ • nome           │
         │              │ • importo        │    │ • descrizione    │
         │              │ • metodo         │    │ • colore         │
         │              │ • data           │    └──────────────────┘
         │              └──────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    reminders    │     │      staff       │────<│   staff_roles   │
│                 │     │                  │     │                 │
│ • id (UUID)     │     │ • id (UUID)      │     │ • id (UUID)     │
│ • customerId    │     │ • nome           │     │ • nome          │
│ • appointmentId │     │ • cognome        │     │ • descrizione   │
│ • tipo          │     │ • ruolo          │     │ • permessi      │
│ • dataInvio     │     │ • telefono       │     └─────────────────┘
│ • stato         │     │ • email          │
└─────────────────┘     │ • immagine       │
                        │ • colore         │
┌─────────────────┐     │ • specializzaz.  │
│      users      │     └──────────────────┘
│                 │
│ • id (UUID)     │     ┌──────────────────┐
│ • username      │     │    settings      │
│ • password      │     │                  │
│ • ruolo         │     │ • id (UUID)      │
│ • nome          │     │ • chiave         │
│ • email         │     │ • valore (JSON)  │
│ • attivo        │     │ • categoria      │
└─────────────────┘     └──────────────────┘
```

### Modelli Principali

#### Customers (Clienti)
```typescript
{
  id: UUID
  nome: string
  cognome: string
  telefono: string
  email?: string
  privacy: boolean                    // Consenso trattamento dati (obbligatorio)
  consensoEmail: boolean              // Consenso reminder email
  consensoSMS: boolean                // Consenso reminder SMS
  consensoDatiSensibili: boolean      // Consenso dati sanitari
  consensoMarketing: boolean          // Consenso marketing
  versioneConsenso: string            // Versione policy
  dataConsenso: Date                  // Data consenso
  consentHistory: JSON                // Storico consensi
  allergie?: string                   // Allergie e note mediche
  note?: string                       // Note generiche
  createdAt: Date
  updatedAt: Date
}
```

#### Appointments (Appuntamenti)
```typescript
{
  id: UUID
  customerId: UUID                    // FK -> customers
  serviceId: UUID                     // FK -> services
  staffId: UUID                       // FK -> staff
  data: Date                          // Data appuntamento
  ora: string                         // Ora formato HH:mm
  stato: AppointmentStatus            // scheduled|confirmed|completed|cancelled|no_show
  reminderSent: boolean               // Flag reminder inviato
  reminderSentAt?: Date               // Data invio reminder
  confirmationToken?: string          // Token conferma email
  note?: string
  createdAt: Date
  updatedAt: Date
}
```

#### Services (Servizi)
```typescript
{
  id: UUID
  nome: string
  descrizione?: string
  prezzo: Decimal                     // Prezzo in euro
  durata: number                      // Durata in minuti
  categoryId?: UUID                   // FK -> service_categories
  immagine?: string                   // URL immagine
  attivo: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Migrazioni Database

Le migrazioni sono gestite con Prisma:

```bash
# Creare nuova migration
cd server
npx prisma migrate dev --name nome_migration

# Applicare migrations (produzione)
npx prisma migrate deploy

# Reset database (ATTENZIONE: cancella dati!)
npx prisma migrate reset

# Vedere stato migrations
npx prisma migrate status

# GUI per esplorare database
npx prisma studio
```

### Seeding Database

Per popolare il database con dati di test:

```bash
cd server
npx prisma db seed
```

Questo crea:
- 1 utente admin (admin/admin123)
- 5 categorie servizi
- 10 servizi esempio
- 3 membri staff
- 20 clienti esempio
- 30 appuntamenti esempio

### Backup e Restore

```bash
# Backup completo
pg_dump -U sphyra_user sphyra_wellness > backup_$(date +%Y%m%d).sql

# Backup solo schema
pg_dump -U sphyra_user --schema-only sphyra_wellness > schema.sql

# Backup solo dati
pg_dump -U sphyra_user --data-only sphyra_wellness > data.sql

# Restore
psql -U sphyra_user sphyra_wellness < backup_20240101.sql
```

---

## 🔌 API REST

Il backend espone API RESTful organizzate per risorsa.

### Base URL

```
Development:  http://localhost:3001/api
Production:   https://tuodominio.com/api
```

### Autenticazione

Tutte le API (eccetto `/auth/login` e `/public/*`) richiedono JWT token:

```bash
# Login
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "nome": "Admin",
    "ruolo": "RESPONSABILE"
  }
}

# Usare token nelle richieste successive
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Endpoints Principali

#### Autenticazione
```
POST   /api/auth/login              Login utente
GET    /api/auth/me                 Profilo utente corrente
POST   /api/auth/logout             Logout (invalida token)
```

#### Clienti
```
GET    /api/customers               Lista clienti
GET    /api/customers/:id           Dettaglio cliente
POST   /api/customers               Crea cliente
PUT    /api/customers/:id           Aggiorna cliente
DELETE /api/customers/:id           Elimina cliente
GET    /api/customers/:id/appointments  Appuntamenti cliente
```

#### Appuntamenti
```
GET    /api/appointments            Lista appuntamenti (con filtri)
GET    /api/appointments/:id        Dettaglio appuntamento
POST   /api/appointments            Crea appuntamento
PUT    /api/appointments/:id        Aggiorna appuntamento
DELETE /api/appointments/:id        Elimina appuntamento
POST   /api/appointments/:id/confirm  Conferma appuntamento
GET    /api/appointments/by-date    Appuntamenti per data
```

#### Servizi
```
GET    /api/services                Lista servizi
GET    /api/services/:id            Dettaglio servizio
POST   /api/services                Crea servizio
PUT    /api/services/:id            Aggiorna servizio
DELETE /api/services/:id            Elimina servizio
POST   /api/services/:id/image      Upload immagine
```

#### Categorie Servizi
```
GET    /api/service-categories      Lista categorie
POST   /api/service-categories      Crea categoria
PUT    /api/service-categories/:id  Aggiorna categoria
DELETE /api/service-categories/:id  Elimina categoria
```

#### Staff
```
GET    /api/staff                   Lista staff
GET    /api/staff/:id               Dettaglio staff
POST   /api/staff                   Crea staff
PUT    /api/staff/:id               Aggiorna staff
DELETE /api/staff/:id               Elimina staff
POST   /api/staff/:id/image         Upload foto profilo
```

#### Pagamenti
```
GET    /api/payments                Lista pagamenti
GET    /api/payments/:id            Dettaglio pagamento
POST   /api/payments                Registra pagamento
PUT    /api/payments/:id            Aggiorna pagamento
DELETE /api/payments/:id            Elimina pagamento
GET    /api/payments/by-date        Pagamenti per periodo
```

#### Reminder
```
GET    /api/reminders               Lista reminder
POST   /api/reminders               Crea reminder
POST   /api/reminders/send          Invia reminder manualmente
GET    /api/reminders/pending       Reminder in attesa
```

#### Utenti (solo RESPONSABILE)
```
GET    /api/users                   Lista utenti
POST   /api/users                   Crea utente
PUT    /api/users/:id               Aggiorna utente
DELETE /api/users/:id               Elimina utente
```

#### Impostazioni
```
GET    /api/settings                Tutte le impostazioni
GET    /api/settings/:key           Impostazione specifica
PUT    /api/settings/:key           Aggiorna impostazione
```

#### API Pubbliche (no auth)
```
GET    /api/public/services         Lista servizi pubblici
POST   /api/public/appointments     Prenota appuntamento pubblico
GET    /api/public/available-slots  Slot disponibili
```

### Esempio Chiamata API

```javascript
// Frontend (con Axios)
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per aggiungere token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Uso
const { data } = await api.get('/customers');
const newCustomer = await api.post('/customers', {
  nome: 'Mario',
  cognome: 'Rossi',
  telefono: '3331234567',
  privacy: true,
});
```

### Rate Limiting

Le API sono protette da rate limiting:

```
General endpoints: 100 richieste / 15 minuti per IP
Login endpoint: 5 richieste / 15 minuti per IP
```

### Codici Errore

```
200 OK              Successo
201 Created         Risorsa creata
400 Bad Request     Dati non validi
401 Unauthorized    Token mancante/non valido
403 Forbidden       Permessi insufficienti
404 Not Found       Risorsa non trovata
409 Conflict        Conflitto (es. username duplicato)
429 Too Many Req    Rate limit superato
500 Server Error    Errore server
```

---

## 🧪 Testing

### Stack Testing

- **Framework**: Vitest 4.0.15
- **React Testing**: React Testing Library 16.3.0
- **HTTP Testing**: Supertest 7.1.4
- **Coverage**: V8 coverage provider
- **Environment**: happy-dom / jsdom

### Eseguire Test

```bash
# Frontend tests
npm run test              # Watch mode
npm run test:ui           # UI interattiva
npm run test:run          # Single run
npm run test:coverage     # Con coverage

# Backend tests
cd server
npm run test              # Watch mode
npm run test:coverage     # Con coverage
```

### Test Disponibili

#### Frontend
```
src/utils/__tests__/
├── validation.test.ts       # Validazione dati
└── errorHandling.test.ts    # Gestione errori
```

#### Backend
```
server/src/__tests__/
├── routes/
│   ├── app.test.ts              # Test app setup
│   └── appointments.test.ts     # Test API appuntamenti
├── middleware/
│   └── auth.test.ts             # Test JWT auth
├── services/
│   ├── emailService.test.ts     # Test invio email
│   └── reminderService.test.ts  # Test reminder logic
└── utils/
    └── mockData.ts              # Dati mock per test
```

### Coverage

Target coverage:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

Visualizza report:
```bash
npm run test:coverage
# Report in coverage/index.html
```

### Continuous Integration

I test vengono eseguiti automaticamente su:
- Ogni commit
- Pull request
- Merge su main/develop

---

## 📱 PWA Features

### Service Worker

- **Strategia Caching**:
  - `NetworkFirst` per API e dati dinamici
  - `CacheFirst` per assets statici (JS, CSS, immagini)
  - `StaleWhileRevalidate` per fonts

- **Offline Support**:
  - Cache automatica di tutte le pagine visitate
  - Fallback graceful quando offline
  - Sync automatico quando torna online

### Web App Manifest

```json
{
  "name": "Sphyra Wellness Lab",
  "short_name": "Sphyra",
  "description": "Gestione centro estetico",
  "theme_color": "#db2777",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Installazione

**iOS (Safari)**:
1. Apri app in Safari
2. Tap icona condividi
3. "Aggiungi a Home"

**Android (Chrome)**:
1. Apri app in Chrome
2. Tap menu (3 puntini)
3. "Installa app"

**Desktop (Chrome/Edge)**:
1. Click icona installa nella barra URL
2. Conferma installazione

### Update Automatici

Il service worker controlla aggiornamenti ogni:
- Apertura app
- Ogni 5 minuti quando app attiva
- Quando torna online dopo disconnessione

Notifica utente quando disponibile nuovo aggiornamento.

---

## 🔒 Sicurezza

### Autenticazione & Autorizzazione

- **JWT Tokens**: HS256 algorithm con secret key
- **Token Expiration**: 7 giorni (configurabile)
- **Password Hashing**: bcrypt con salt rounds 10
- **Role-Based Access**: RESPONSABILE (admin) vs UTENTE (staff)

### Headers Sicurezza

Implementati via Helmet.js:

```javascript
{
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  xssFilter: true,
  noSniff: true
}
```

### Protezione CSRF

- Token CSRF su form pubblici
- SameSite cookies (strict)
- Origin validation

### Rate Limiting

```javascript
// Login endpoint
rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minuti
  max: 5,                     // 5 tentativi
  message: 'Troppi tentativi di login'
})

// API generali
rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minuti
  max: 100,                   // 100 richieste
})
```

### Input Validation

Tutti gli input validati con Zod schemas:

```typescript
const customerSchema = z.object({
  nome: z.string().min(2).max(50),
  cognome: z.string().min(2).max(50),
  telefono: z.string().regex(/^[0-9]{10}$/),
  email: z.string().email().optional(),
  privacy: z.boolean().refine(val => val === true),
});
```

### GDPR Compliance

- ✅ Consenso esplicito richiesto
- ✅ Storico modifiche consensi
- ✅ Diritto all'oblio (eliminazione dati)
- ✅ Export dati personali
- ✅ Crittografia password
- ✅ Audit log per accessi

### Best Practices Produzione

```bash
# ⚠️ DA CAMBIARE PRIMA DEL DEPLOY

# 1. Cambia JWT secret
JWT_SECRET=genera_stringa_casuale_lunga_64_caratteri

# 2. Cambia password database
POSTGRES_PASSWORD=password_sicura_casuale

# 3. Cambia credenziali admin
# Accedi e cambia via UI o:
npx prisma studio
# Modifica user admin

# 4. Abilita HTTPS
# Usa docker-compose.letsencrypt.yml

# 5. Configura firewall
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# 6. Backup automatici
# Setup cron job per pg_dump

# 7. Monitoring logs
docker compose logs -f --tail=100
```

---

## 🤝 Contribuire

Contributi benvenuti! Segui queste linee guida:

### Setup Sviluppo

1. Fai fork del repository
2. Crea branch feature: `git checkout -b feature/nome-feature`
3. Installa dipendenze: `npm install`
4. Esegui test: `npm run test`

### Convenzioni Codice

- **TypeScript**: strict mode abilitato
- **Linting**: ESLint con config TypeScript
- **Formatting**: Prettier (configurato)
- **Commit**: Conventional Commits format

```bash
# Esempi commit messages
feat: aggiungi filtro ricerca clienti
fix: correggi validazione email
docs: aggiorna guida deploy
refactor: migliora performance calendario
test: aggiungi test service appuntamenti
```

### Pull Request

1. Assicurati che tutti i test passino: `npm run test`
2. Controlla linting: `npm run lint`
3. Aggiorna documentazione se necessario
4. Descrivi chiaramente le modifiche nella PR

### Segnalazione Bug

Usa [GitHub Issues](https://github.com/TNT-Labs/sphyrawellness/issues) e includi:

- Descrizione dettagliata del problema
- Steps per riprodurre
- Comportamento atteso vs attuale
- Screenshots se applicabile
- Versione browser/OS

### Richiesta Feature

Apri issue con tag `enhancement` descrivendo:

- Caso d'uso
- Benefici
- Possibile implementazione

---

## 📚 Documentazione Aggiuntiva

- **[USER_MANUAL.md](docs/USER_MANUAL.md)** - Manuale utente completo
- **[DOCKER_GUIDE.md](DOCKER_GUIDE.md)** - Guida Docker dettagliata
- **[DEPLOY_DUCKDNS.md](DEPLOY_DUCKDNS.md)** - Deploy HTTPS pubblico
- **[MIGRATION_SUCCESS.md](MIGRATION_SUCCESS.md)** - Migrazione PouchDB → PostgreSQL
- **[API_DOCS.md](docs/API_DOCS.md)** - Documentazione API completa *(se presente)*

---

## 🗺️ Roadmap

### In Sviluppo
- [ ] Dashboard analytics avanzata
- [ ] Export PDF appuntamenti/fatture
- [ ] Integrazione calendario Google/Outlook
- [ ] App mobile nativa (React Native)

### Pianificato
- [ ] Sistema fatturazione elettronica
- [ ] Multi-sede support
- [ ] Gestione magazzino prodotti
- [ ] Sistema fidelity card
- [ ] Widget prenotazione per sito web
- [ ] Integrazione pagamenti online (Stripe)

### Considerazioni Future
- [ ] Dark mode
- [ ] Multilingua (EN, DE, FR)
- [ ] Video call per consulenze remote
- [ ] AI per suggerimenti trattamenti

---

## 📞 Supporto

- **Email**: [Apri Issue](https://github.com/TNT-Labs/sphyrawellness/issues)
- **Documentazione**: Vedi cartella `/docs`
- **FAQ**: Vedi [Wiki](https://github.com/TNT-Labs/sphyrawellness/wiki)

---

## 📄 Licenza

Questo progetto è rilasciato sotto licenza **MIT License**.

Vedi file [LICENSE](LICENSE) per dettagli completi.

```
MIT License

Copyright (c) 2024 TNT Labs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 👥 Autori

Sviluppato da **TNT Labs** per il settore wellness e beauty.

### Contributors

Grazie a tutti i [contributors](https://github.com/TNT-Labs/sphyrawellness/graphs/contributors) che hanno contribuito al progetto!

---

## ⭐ Star History

Se trovi utile questo progetto, considera di dargli una stella su GitHub!

[![Star History](https://img.shields.io/github/stars/TNT-Labs/sphyrawellness?style=social)](https://github.com/TNT-Labs/sphyrawellness)

---

## 🔗 Link Utili

- **Repository**: [github.com/TNT-Labs/sphyrawellness](https://github.com/TNT-Labs/sphyrawellness)
- **Issues**: [github.com/TNT-Labs/sphyrawellness/issues](https://github.com/TNT-Labs/sphyrawellness/issues)
- **Discussions**: [github.com/TNT-Labs/sphyrawellness/discussions](https://github.com/TNT-Labs/sphyrawellness/discussions)
- **Releases**: [github.com/TNT-Labs/sphyrawellness/releases](https://github.com/TNT-Labs/sphyrawellness/releases)

---

<div align="center">

**Sviluppato con ❤️ per il settore wellness**

[⬆ Torna su](#-sphyra-wellness-lab)

</div>
