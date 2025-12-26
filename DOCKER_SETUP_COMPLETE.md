# 🐳 Docker Setup Completato - Applicazione Completamente Dockerizzata

## ✅ Implementazione Completata

L'intera applicazione **Sphyra Wellness Lab** è ora completamente dockerizzata con tutti i servizi orchestrati.

---

## 📦 File Creati

### Configurazione Docker

1. **`Dockerfile`** (Frontend)
   - Multi-stage build con Node.js + Nginx
   - Build Vite ottimizzato per produzione
   - Nginx Alpine per servire i file statici
   - Gzip compression e security headers
   - Health check endpoint

2. **`server/Dockerfile`** (Backend)  
   - Multi-stage build con Node.js Alpine
   - Prisma Client generation automatica
   - Build TypeScript
   - Utente non-root per sicurezza
   - Dumb-init per gestione segnali

3. **`docker-compose.yml`** (Orchestrazione)
   - 4 servizi completi
   - Network bridge isolato
   - 3 volumi persistenti
   - Health checks per tutti i servizi
   - Auto-migrations al startup
   - Profili opzionali (debug)

### Configurazione Nginx

4. **`nginx.conf`**
   - SPA routing (try_files)
   - Gzip compression
   - Security headers
   - Cache policy ottimizzata
   - Health check endpoint

### File di Supporto

5. **`.dockerignore`** (Frontend)
   - Esclude node_modules, dist, .git
   - Ottimizza build context

6. **`server/.dockerignore`** (Backend)
   - Esclude node_modules, dist, .git
   - Mantiene prisma schema

7. **`.env.docker.example`**
   - Template variabili d'ambiente
   - Valori di default pronti all'uso
   - Documentazione inline

### Script e Documentazione

8. **`docker-init.sh`** (Script interattivo)
   - Setup automatico guidato
   - 4 modalità di deploy
   - Verifica prerequisiti
   - Comandi utili post-deploy

9. **`DOCKER_GUIDE.md`** (Guida completa - 400+ righe)
   - Quick start
   - Architettura dettagliata
   - Configurazioni disponibili
   - Comandi di gestione
   - Troubleshooting
   - Deploy in produzione
   - Checklist sicurezza

10. **`README.md`** (Aggiornato)
    - Nuova sezione Docker prominente
    - Tabella servizi
    - Quick start Docker

---

## 🏗️ Architettura Docker

```
┌──────────────────────────────────────────────────┐
│         docker-compose.yml (Orchestrator)        │
│                                                   │
│  ┌─────────────────────────────────────────┐   │
│  │  Frontend (sphyra-frontend)              │   │
│  │  - Image: Custom (Dockerfile)            │   │
│  │  - Port: 80                              │   │
│  │  - Base: nginx:alpine                    │   │
│  │  - Build: React + Vite                   │   │
│  └───────────────┬──────────────────────────┘   │
│                  │ HTTP Requests                 │
│                  ↓                                │
│  ┌─────────────────────────────────────────┐   │
│  │  Backend (sphyra-backend)                │   │
│  │  - Image: Custom (server/Dockerfile)     │   │
│  │  - Port: 3001                            │   │
│  │  - Base: node:20-alpine                  │   │
│  │  - Build: TypeScript + Prisma            │   │
│  │  - Command: Migrate → Seed → Start       │   │
│  └───────────────┬──────────────────────────┘   │
│                  │ SQL Queries (Prisma)          │
│                  ↓                                │
│  ┌─────────────────────────────────────────┐   │
│  │  PostgreSQL (sphyra-postgres)            │   │
│  │  - Image: postgres:16-alpine             │   │
│  │  - Port: 5432                            │   │
│  │  - Volume: postgres_data (persistent)    │   │
│  └──────────────────────────────────────────┘   │
│                                                   │
│  ┌─────────────────────────────────────────┐   │
│  │  pgAdmin (sphyra-pgadmin) [Optional]     │   │
│  │  - Image: dpage/pgadmin4:latest          │   │
│  │  - Port: 5050                            │   │
│  │  - Profile: debug                        │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘

Network: sphyra-network (bridge)

Volumes:
- postgres_data → /var/lib/postgresql/data
- pgadmin_data → /var/lib/pgadmin
- uploads_data → /app/uploads
```

---

## 🚀 Utilizzo

### Quick Start (Raccomandato)

```bash
# 1. Rendi eseguibile lo script
chmod +x docker-init.sh

# 2. Avvia setup interattivo
./docker-init.sh

# 3. Scegli configurazione:
#    [1] Solo Database
#    [2] Database + Backend
#    [3] Stack Completo (default)
#    [4] Stack + pgAdmin
```

### Avvio Manuale

```bash
# 1. Crea configurazione
cp .env.docker.example .env.docker

# 2. (Opzionale) Personalizza .env.docker
nano .env.docker

# 3. Avvia tutti i servizi
docker compose --env-file .env.docker up -d

# 4. Verifica stato
docker compose --env-file .env.docker ps

# 5. Visualizza logs
docker compose --env-file .env.docker logs -f
```

### Accesso Servizi

| Servizio | URL | Credenziali |
|----------|-----|-------------|
| **Frontend** | http://localhost | admin / admin123 |
| **Backend API** | http://localhost:3001 | - |
| **Health Backend** | http://localhost:3001/health | - |
| **pgAdmin** | http://localhost:5050 | admin@sphyrawellness.local / admin |
| **PostgreSQL** | localhost:5432 | sphyra_user / sphyra_dev_password_2024 |

---

## 🎯 Modalità di Deploy

### 1. Solo Database (Sviluppo Locale)

```bash
docker compose --env-file .env.docker up -d postgres
```

**Caso d'uso:** Frontend e backend in sviluppo locale, solo database dockerizzato.

**Servizi attivi:**
- ✅ PostgreSQL (porta 5432)

### 2. Database + Backend (Frontend Locale)

```bash
docker compose --env-file .env.docker up -d postgres backend
```

**Caso d'uso:** Frontend in sviluppo con hot-reload, backend e DB dockerizzati.

**Servizi attivi:**
- ✅ PostgreSQL (porta 5432)
- ✅ Backend API (porta 3001)

### 3. Stack Completo (Produzione/Test)

```bash
docker compose --env-file .env.docker up -d
```

**Caso d'uso:** Deploy completo, pronto per produzione.

**Servizi attivi:**
- ✅ PostgreSQL (porta 5432)
- ✅ Backend API (porta 3001)
- ✅ Frontend (porta 80)

### 4. Stack + pgAdmin (Debug)

```bash
docker compose --env-file .env.docker --profile debug up -d
```

**Caso d'uso:** Debug e gestione database con GUI.

**Servizi attivi:**
- ✅ PostgreSQL (porta 5432)
- ✅ Backend API (porta 3001)
- ✅ Frontend (porta 80)
- ✅ pgAdmin GUI (porta 5050)

---

## 🔧 Gestione Container

### Comandi Base

```bash
# Stop tutti i servizi
docker compose --env-file .env.docker down

# Restart tutti i servizi
docker compose --env-file .env.docker restart

# Restart singolo servizio
docker compose --env-file .env.docker restart backend

# Logs in tempo reale
docker compose --env-file .env.docker logs -f

# Logs singolo servizio
docker compose --env-file .env.docker logs -f backend

# Accedi al container backend
docker compose --env-file .env.docker exec backend sh

# Accedi al database
docker compose --env-file .env.docker exec postgres psql -U sphyra_user -d sphyra_wellness
```

### Rebuild Immagini

```bash
# Rebuild tutti i servizi
docker compose --env-file .env.docker build

# Rebuild senza cache
docker compose --env-file .env.docker build --no-cache

# Rebuild e restart
docker compose --env-file .env.docker up -d --build
```

### Database Operations

```bash
# Esegui migrations
docker compose --env-file .env.docker exec backend npx prisma migrate deploy

# Seed database
docker compose --env-file .env.docker exec backend npx prisma db seed

# Backup database
docker compose --env-file .env.docker exec postgres pg_dump -U sphyra_user sphyra_wellness > backup.sql

# Restore database
docker compose --env-file .env.docker exec -T postgres psql -U sphyra_user -d sphyra_wellness < backup.sql

# Reset database (⚠️ cancella tutti i dati!)
docker compose --env-file .env.docker down -v
docker compose --env-file .env.docker up -d
```

---

## ⚙️ Configurazione Avanzata

### Variabili d'Ambiente Principali

Modifica `.env.docker` per personalizzare:

#### Database
```env
POSTGRES_DB=sphyra_wellness
POSTGRES_USER=sphyra_user
POSTGRES_PASSWORD=CAMBIA_IN_PRODUZIONE
```

#### Backend
```env
JWT_SECRET=GENERA_SECRET_CASUALE_LUNGO
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://tuodominio.com,https://tuodominio.com
```

#### Frontend
```env
VITE_API_URL=http://localhost:3001/api
FRONTEND_PORT=80  # Cambia se porta 80 occupata
```

#### Email (opzionale)
```env
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@tuodominio.com
```

#### SMS (opzionale)
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 🔒 Sicurezza in Produzione

### Checklist Pre-Produzione

- [ ] Cambiato `POSTGRES_PASSWORD` in `.env.docker`
- [ ] Generato `JWT_SECRET` sicuro (min 32 caratteri)
- [ ] Aggiornato `ALLOWED_ORIGINS` con dominio reale
- [ ] Cambiato `PGADMIN_PASSWORD`
- [ ] Rimossa esposizione porta PostgreSQL (commenta ports in docker-compose.yml)
- [ ] Configurato HTTPS con reverse proxy (Nginx/Traefik)
- [ ] Configurato backup database automatico
- [ ] Testato disaster recovery
- [ ] Configurato monitoring/logging

### Generare JWT Secret Sicuro

```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 📊 Health Checks

Tutti i servizi hanno health checks configurati:

### Frontend
```bash
# Test health check
curl http://localhost/health
# Output: healthy
```

### Backend
```bash
# Test health check
curl http://localhost:3001/health
# Output: {"success":true,"data":{...}}
```

### PostgreSQL
```bash
# Verifica stato
docker compose --env-file .env.docker exec postgres pg_isready -U sphyra_user
# Output: postgres:5432 - accepting connections
```

### Tutti i Servizi
```bash
# Verifica stato automatico
docker compose --env-file .env.docker ps
# Mostra health status per ogni container
```

---

## 🐛 Troubleshooting

### Container non si avvia

```bash
# 1. Verifica logs
docker compose --env-file .env.docker logs backend

# 2. Verifica configurazione
docker compose --env-file .env.docker config

# 3. Rebuild
docker compose --env-file .env.docker build --no-cache backend
docker compose --env-file .env.docker up -d backend
```

### Porta già in uso

```bash
# Identifica processo
lsof -i :80  # o :3001, :5432

# Cambia porta in .env.docker
FRONTEND_PORT=8080
```

### Database non accessibile

```bash
# Verifica container running
docker compose --env-file .env.docker ps postgres

# Verifica health
docker compose --env-file .env.docker exec postgres pg_isready

# Riavvia
docker compose --env-file .env.docker restart postgres
```

---

## 📈 Monitoring

### Risorse in Tempo Reale

```bash
# Statistiche risorse
docker stats

# Statistiche specifiche
docker stats sphyra-backend sphyra-postgres
```

### Logs Strutturati

```bash
# JSON logs
docker compose --env-file .env.docker logs --json backend

# Con timestamp
docker compose --env-file .env.docker logs -t backend

# Ultimi 100 log
docker compose --env-file .env.docker logs --tail=100 backend
```

---

## 🌍 Deploy Cloud

L'applicazione dockerizzata è pronta per il deploy su:

- ✅ **AWS ECS/Fargate**
- ✅ **Google Cloud Run**
- ✅ **DigitalOcean App Platform**
- ✅ **Railway**
- ✅ **Render**
- ✅ **Fly.io**

Usa le immagini build o pubblica su Docker Hub.

---

## 📚 Documentazione Completa

- **[DOCKER_GUIDE.md](DOCKER_GUIDE.md)** - Guida completa Docker (400+ righe)
- **[MIGRATION_SUCCESS.md](MIGRATION_SUCCESS.md)** - Report migrazione PostgreSQL
- **[API_ENDPOINTS.md](docs/API_ENDPOINTS.md)** - Documentazione API REST
- **[README.md](README.md)** - Documentazione generale

---

## ✅ Risultato Finale

**Applicazione completamente dockerizzata con:**

✅ **Frontend containerizzato** (React + Vite + Nginx)  
✅ **Backend containerizzato** (Node.js + Prisma)  
✅ **Database containerizzato** (PostgreSQL 16)  
✅ **Orchestrazione completa** (Docker Compose)  
✅ **Health checks automatici**  
✅ **Volumi persistenti**  
✅ **Network isolato**  
✅ **Script di setup interattivo**  
✅ **Documentazione completa**  
✅ **Configurazione zero per iniziare**  
✅ **Production-ready**  

**Setup completo in < 2 minuti con un solo comando!**

---

**Branch:** `claude/postgres-rest-api-migration-DVNhr`  
**Data:** 2025-12-26  
**Versione Docker:** 1.0.0

🎉 **Dockerizzazione completata con successo!**
