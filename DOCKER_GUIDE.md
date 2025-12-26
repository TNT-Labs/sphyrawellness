# 🐳 Guida Docker - Sphyra Wellness Lab

Applicazione completamente dockerizzata con Frontend (React + Nginx) + Backend (Node.js + Prisma) + PostgreSQL.

---

## 📋 Prerequisiti

1. **Docker** (versione 20.10+)
   - [Installa Docker](https://docs.docker.com/get-docker/)

2. **Docker Compose** (versione 2.0+)
   - Incluso in Docker Desktop
   - O installa separatamente: [Docker Compose](https://docs.docker.com/compose/install/)

Verifica l'installazione:
```bash
docker --version
docker compose version
```

---

## 🚀 Quick Start

### Metodo 1: Script Automatico (Raccomandato)

```bash
# Rendi eseguibile lo script
chmod +x docker-init.sh

# Avvia l'applicazione
./docker-init.sh
```

Lo script ti guiderà attraverso la configurazione iniziale.

### Metodo 2: Comandi Manuali

```bash
# 1. Crea il file di configurazione
cp .env.docker.example .env.docker

# 2. (Opzionale) Modifica .env.docker con le tue configurazioni
nano .env.docker

# 3. Avvia tutti i servizi
docker compose --env-file .env.docker up -d

# 4. Verifica lo stato
docker compose --env-file .env.docker ps
```

---

## 🏗️ Architettura

```
┌─────────────────────────────────────────┐
│     Frontend (React + Vite + Nginx)     │
│         Container: sphyra-frontend       │
│              Port: 80                    │
└───────────────┬─────────────────────────┘
                │ HTTP Requests
                ↓
┌─────────────────────────────────────────┐
│  Backend (Node.js + Express + Prisma)   │
│        Container: sphyra-backend         │
│             Port: 3001                   │
└───────────────┬─────────────────────────┘
                │ SQL Queries
                ↓
┌─────────────────────────────────────────┐
│      Database (PostgreSQL 16)           │
│        Container: sphyra-postgres        │
│             Port: 5432                   │
└─────────────────────────────────────────┘

        (Opzionale - solo con --profile debug)
                    ↓
┌─────────────────────────────────────────┐
│          pgAdmin 4 (GUI DB)             │
│        Container: sphyra-pgadmin         │
│             Port: 5050                   │
└─────────────────────────────────────────┘
```

---

## 🔧 Configurazioni Disponibili

### 1. Solo Database

```bash
docker compose --env-file .env.docker up -d postgres
```

**Utile per:** Sviluppo locale senza Docker per backend/frontend.

**Accesso:**
- PostgreSQL: `localhost:5432`

### 2. Database + Backend

```bash
docker compose --env-file .env.docker up -d postgres backend
```

**Utile per:** Frontend in sviluppo locale, backend dockerizzato.

**Accesso:**
- Backend API: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

### 3. Stack Completo (Default)

```bash
docker compose --env-file .env.docker up -d
```

**Utile per:** Produzione o test completo dell'applicazione.

**Accesso:**
- Frontend: `http://localhost`
- Backend API: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

### 4. Stack Completo + pgAdmin

```bash
docker compose --env-file .env.docker --profile debug up -d
```

**Utile per:** Debug e gestione database tramite GUI.

**Accesso:**
- Frontend: `http://localhost`
- Backend API: `http://localhost:3001`
- PostgreSQL: `localhost:5432`
- pgAdmin: `http://localhost:5050`

---

## 📝 Variabili d'Ambiente

Il file `.env.docker` contiene tutte le configurazioni. Valori di default:

### Database
```env
POSTGRES_DB=sphyra_wellness
POSTGRES_USER=sphyra_user
POSTGRES_PASSWORD=sphyra_dev_password_2024
```

### Backend
```env
JWT_SECRET=sphyra_wellness_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost,http://localhost:5173,http://localhost:80
```

### Frontend
```env
VITE_API_URL=http://localhost:3001/api
FRONTEND_PORT=80
```

### pgAdmin
```env
PGADMIN_EMAIL=admin@sphyrawellness.local
PGADMIN_PASSWORD=admin
PGADMIN_PORT=5050
```

**⚠️ IMPORTANTE per produzione:**
- Cambia tutte le password
- Genera un JWT_SECRET sicuro
- Configura ALLOWED_ORIGINS con il tuo dominio

---

## 🎯 Accesso Applicazione

### Frontend
- **URL:** http://localhost
- **Login:** `admin` / `admin123` o `user` / `user123`

### Backend API
- **URL:** http://localhost:3001
- **Health:** http://localhost:3001/health
- **Endpoints:** http://localhost:3001/api/*

### pgAdmin (se avviato con --profile debug)
- **URL:** http://localhost:5050
- **Login:** `admin@sphyrawellness.local` / `admin`

**Connessione a PostgreSQL da pgAdmin:**
- Host: `postgres` (nome container)
- Port: `5432`
- Database: `sphyra_wellness`
- Username: `sphyra_user`
- Password: (valore in .env.docker)

---

## 📊 Comandi Utili

### Gestione Servizi

```bash
# Avvia tutti i servizi
docker compose --env-file .env.docker up -d

# Avvia in modalità attached (vedi logs in tempo reale)
docker compose --env-file .env.docker up

# Stop tutti i servizi
docker compose --env-file .env.docker down

# Stop e rimuovi volumi (⚠️ CANCELLA I DATI!)
docker compose --env-file .env.docker down -v

# Restart di un servizio specifico
docker compose --env-file .env.docker restart backend

# Stop un servizio specifico
docker compose --env-file .env.docker stop frontend
```

### Logs

```bash
# Tutti i servizi
docker compose --env-file .env.docker logs -f

# Servizio specifico
docker compose --env-file .env.docker logs -f backend

# Ultimi 100 logs
docker compose --env-file .env.docker logs --tail=100 backend

# Logs senza follow
docker compose --env-file .env.docker logs backend
```

### Status & Debug

```bash
# Stato di tutti i servizi
docker compose --env-file .env.docker ps

# Statistiche risorse
docker stats

# Ispeziona un container
docker inspect sphyra-backend

# Entra nel container backend
docker compose --env-file .env.docker exec backend sh

# Entra nel container postgres
docker compose --env-file .env.docker exec postgres psql -U sphyra_user -d sphyra_wellness
```

### Build & Update

```bash
# Rebuild dei container
docker compose --env-file .env.docker build

# Rebuild senza cache
docker compose --env-file .env.docker build --no-cache

# Rebuild e restart
docker compose --env-file .env.docker up -d --build

# Rebuild solo un servizio
docker compose --env-file .env.docker build backend
docker compose --env-file .env.docker up -d --no-deps backend
```

### Database Operations

```bash
# Accedi al database
docker compose --env-file .env.docker exec postgres psql -U sphyra_user -d sphyra_wellness

# Backup del database
docker compose --env-file .env.docker exec postgres pg_dump -U sphyra_user sphyra_wellness > backup.sql

# Restore del database
docker compose --env-file .env.docker exec -T postgres psql -U sphyra_user -d sphyra_wellness < backup.sql

# Esegui migration Prisma
docker compose --env-file .env.docker exec backend npx prisma migrate deploy

# Esegui seed
docker compose --env-file .env.docker exec backend npx prisma db seed

# Apri Prisma Studio
docker compose --env-file .env.docker exec backend npx prisma studio
```

---

## 🔍 Health Checks

Tutti i servizi hanno health checks configurati:

### Frontend
```bash
curl http://localhost/health
# Response: "healthy"
```

### Backend
```bash
curl http://localhost:3001/health
# Response: {"success":true,"data":{...}}
```

### PostgreSQL
```bash
docker compose --env-file .env.docker exec postgres pg_isready -U sphyra_user
# Response: "accepting connections"
```

---

## 📦 Volumi Docker

I dati persistenti sono salvati in volumi Docker:

```bash
# Lista volumi
docker volume ls | grep sphyra

# Ispeziona un volume
docker volume inspect sphyrawellness_postgres_data

# Rimuovi tutti i volumi (⚠️ CANCELLA I DATI!)
docker compose --env-file .env.docker down -v
```

**Volumi creati:**
- `sphyrawellness_postgres_data` - Dati PostgreSQL
- `sphyrawellness_pgadmin_data` - Configurazione pgAdmin
- `sphyrawellness_uploads_data` - File upload (immagini, ecc.)

---

## 🚨 Troubleshooting

### Problema: Container non si avvia

```bash
# Verifica logs
docker compose --env-file .env.docker logs backend

# Verifica configurazione
docker compose --env-file .env.docker config

# Rebuild forzato
docker compose --env-file .env.docker build --no-cache
docker compose --env-file .env.docker up -d
```

### Problema: Database non accessibile

```bash
# Verifica che postgres sia healthy
docker compose --env-file .env.docker ps

# Testa connessione
docker compose --env-file .env.docker exec postgres pg_isready

# Controlla logs
docker compose --env-file .env.docker logs postgres
```

### Problema: Frontend 502 Bad Gateway

```bash
# Verifica che backend sia avviato
docker compose --env-file .env.docker ps backend

# Verifica health backend
curl http://localhost:3001/health

# Restart frontend
docker compose --env-file .env.docker restart frontend
```

### Problema: Porta già in uso

```bash
# Identifica processo sulla porta
lsof -i :80  # o :3001, :5432

# Cambia porta in .env.docker
FRONTEND_PORT=8080
```

### Problema: Out of memory

```bash
# Aumenta memoria Docker (Docker Desktop > Settings > Resources)

# O limita risorse per container in docker-compose.yml:
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

---

## 🔒 Sicurezza in Produzione

### 1. Cambia Tutte le Password

```env
# In .env.docker
POSTGRES_PASSWORD=password_sicuro_generato_123!
JWT_SECRET=secret_jwt_molto_lungo_e_casuale_456!
PGADMIN_PASSWORD=password_pgadmin_sicuro_789!
```

### 2. Configura CORS Correttamente

```env
# Solo domini autorizzati
ALLOWED_ORIGINS=https://tuodominio.com,https://www.tuodominio.com
```

### 3. Usa HTTPS

Configura un reverse proxy (Nginx/Traefik) con certificati SSL davanti ai container.

### 4. Limita Accesso a pgAdmin

```yaml
# In docker-compose.yml, limita pgAdmin solo a localhost
pgadmin:
  ports:
    - "127.0.0.1:5050:80"  # Solo localhost
```

### 5. Non esporre PostgreSQL pubblicamente

```yaml
# In docker-compose.yml, rimuovi esposizione porta
postgres:
  # ports:  # ← Commenta questa sezione
  #   - "5432:5432"
```

---

## 📈 Monitoring & Performance

### Visualizza risorse in tempo reale

```bash
docker stats
```

### Logs strutturati

```bash
# JSON logs
docker compose --env-file .env.docker logs --json backend

# Logs con timestamp
docker compose --env-file .env.docker logs -t backend
```

### Prometheus/Grafana (Avanzato)

Aggiungi monitoring ai container modificando `docker-compose.yml`.

---

## 🌍 Deploy in Produzione

### Docker Hub

```bash
# Login
docker login

# Tag immagini
docker tag sphyrawellness-backend:latest tuousername/sphyra-backend:v1.0.0
docker tag sphyrawellness-frontend:latest tuousername/sphyra-frontend:v1.0.0

# Push
docker push tuousername/sphyra-backend:v1.0.0
docker push tuousername/sphyra-frontend:v1.0.0
```

### Cloud Platforms

- **AWS ECS/Fargate:** Usa le immagini Docker
- **Google Cloud Run:** Supporta container direttamente
- **DigitalOcean App Platform:** Deploy da Docker Compose
- **Railway/Render:** Supporto Docker automatico

---

## 📚 Riferimenti

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- [Vite Docker Guide](https://vitejs.dev/guide/static-deploy.html)

---

## ✅ Checklist Prima di Produzione

- [ ] Cambiato tutte le password in `.env.docker`
- [ ] Generato JWT_SECRET sicuro
- [ ] Configurato ALLOWED_ORIGINS con dominio reale
- [ ] Configurato backup database automatico
- [ ] Testato ripristino da backup
- [ ] Configurato HTTPS/SSL
- [ ] Testato tutti i servizi
- [ ] Configurato monitoring/alerting
- [ ] Documentato procedure di deploy
- [ ] Testato disaster recovery

---

**Creato:** 2025-12-26  
**Branch:** `claude/postgres-rest-api-migration-DVNhr`  
**Versione:** 1.0.0

Per domande o problemi, consulta la documentazione completa in `docs/` o apri una issue su GitHub.
