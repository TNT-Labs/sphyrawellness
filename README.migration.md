# Migrazione PostgreSQL + REST API - Branch `claude/postgres-rest-api-migration-DVNhr`

## 🎯 Obiettivo

Migrare l'applicazione da **PouchDB/CouchDB** a **PostgreSQL + REST API** per ottenere:
- Database relazionale maturo e scalabile
- API REST type-safe con Prisma ORM
- Migliori performance per query complesse
- Deploy semplificato con managed database
- Separazione frontend/backend

---

## 📊 Stato Progetto

### ✅ COMPLETATO (70%)

**Infrastructure & Database**
- ✅ Docker Compose per PostgreSQL + pgAdmin
- ✅ Schema Prisma completo (10 tabelle: customers, services, staff, appointments, payments, users, settings, ecc.)
- ✅ Migrations setup
- ✅ Seed script con dati di esempio

**Backend Repository Layer** (100% ✅)
- ✅ 8 repository Prisma completamente funzionanti
- ✅ CRUD operations per tutte le entità
- ✅ Business logic (conflict detection, GDPR consents, revenue stats)
- ✅ Query complesse (search, date ranges, aggregations)

**Backend REST API** (60% ✅)
- ✅ `/api/customers` - CRUD completo + consents GDPR
- ✅ `/api/services` + `/api/services/categories` - CRUD completo
- ✅ `/api/appointments` - CRUD + conflict detection + confirmation
- ✅ `/api/auth` - Login, verify, logout (JWT)

**Documentazione** (100% ✅)
- ✅ `docs/MIGRATION_PLAN.md` - Piano migrazione dettagliato
- ✅ `docs/DATABASE_SETUP.md` - Setup PostgreSQL completo
- ✅ `docs/API_ENDPOINTS.md` - Documentazione API REST (tutti gli endpoint)
- ✅ `docs/MIGRATION_STATUS.md` - Tracking progresso
- ✅ `docs/COMPLETION_GUIDE.md` - Guida passo-passo per completare

### 🚧 DA COMPLETARE (30%)

**Backend REST API** (40% da fare)
- ❌ `/api/staff` + `/api/staff/roles`
- ❌ `/api/payments` + `/api/payments/stats/revenue`
- ❌ `/api/reminders`
- ❌ `/api/users`
- ❌ `/api/settings`
- ❌ `/api/public/*` (public booking API)

**Backend Integration**
- ❌ Middleware autenticazione JWT
- ❌ Error handling middleware
- ❌ Router integration in `app.ts`

**Frontend** (90% da fare)
- ❌ API client (Axios)
- ❌ `AuthContext` refactoring
- ❌ **`AppContext` COMPLETA RISCRITTURA** (rimuovere PouchDB/IndexedDB)
- ❌ Update tutti i componenti
- ❌ Cleanup file obsoleti (db.ts, indexedDB.ts, dbBridge.ts, pouchdbSync.ts)
- ❌ Rimuovi dipendenze PouchDB

---

## 📁 Struttura File Creati

```
/
├── docker-compose.postgres.yml         # PostgreSQL + pgAdmin
├── server/
│   ├── .env                           # Environment variables (PostgreSQL)
│   ├── .env.example                   # Template .env
│   ├── package.json                   # Updated: Prisma, pg, rimosso PouchDB
│   ├── prisma/
│   │   ├── schema.prisma              # Schema completo (10 tabelle)
│   │   └── seed.ts                    # Seed con dati esempio
│   └── src/
│       ├── lib/
│       │   └── prisma.ts              # Singleton Prisma Client
│       ├── repositories/              # 8 repository completi ✅
│       │   ├── customerRepository.ts
│       │   ├── serviceRepository.ts
│       │   ├── staffRepository.ts
│       │   ├── appointmentRepository.ts
│       │   ├── paymentRepository.ts
│       │   ├── reminderRepository.ts
│       │   ├── userRepository.ts
│       │   └── settingRepository.ts
│       └── routes/                    # REST API endpoints
│           ├── customers.new.ts       # ✅ Completo
│           ├── services.new.ts        # ✅ Completo
│           ├── appointments.new.ts    # ✅ Completo
│           └── auth.new.ts            # ✅ Completo
│
└── docs/
    ├── MIGRATION_PLAN.md              # Piano migrazione completo
    ├── DATABASE_SETUP.md              # Setup database guide
    ├── API_ENDPOINTS.md               # Documentazione API REST completa
    ├── MIGRATION_STATUS.md            # Tracking progresso
    └── COMPLETION_GUIDE.md            # ⭐ GUIDA STEP-BY-STEP PER COMPLETARE
```

---

## 🚀 Quick Start

### 1. Setup Database

```bash
# Avvia PostgreSQL
docker compose -f docker-compose.postgres.yml up -d

# Verifica che sia running
docker ps

# pgAdmin: http://localhost:5050
# Email: admin@sphyrawellness.local
# Password: admin
```

### 2. Install & Setup Backend

```bash
cd server

# Install dependencies (include Prisma)
npm install

# Generate Prisma Client
npm run db:generate

# Run migrations (crea tabelle)
npm run db:migrate

# Seed database (dati esempio)
npm run db:seed

# Start server
npm run dev
```

**Output atteso seed:**
```
✨ Database seeded successfully!
📝 Admin credentials: admin / admin123
📝 User credentials: user / user123
```

### 3. Test API

```bash
# Login (ottieni JWT token)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "...", "username": "admin", "role": "RESPONSABILE" }
}

# Get customers (con token)
curl -X GET http://localhost:3001/api/customers \
  -H "Authorization: Bearer <your-token>"
```

---

## 📖 Come Completare la Migrazione

**Leggi la guida completa:** [`docs/COMPLETION_GUIDE.md`](docs/COMPLETION_GUIDE.md)

### Passi Principali

1. **Backend REST API** (2-3 ore)
   - Crea endpoint mancanti: staff, payments, reminders, users, settings, public
   - Segui pattern di `customers.new.ts` e `appointments.new.ts`
   - Integra router in `app.ts`

2. **Frontend API Client** (2-3 ore)
   - Installa Axios
   - Crea `src/api/client.ts` con interceptors JWT
   - Crea API services per ogni entità

3. **Frontend Contexts** (3-4 ore)
   - Update `AuthContext` per usare API
   - **RISCRIVI COMPLETAMENTE `AppContext`** (rimuovi PouchDB logic)
   - Implementa loading/error states

4. **Update Components** (2-3 ore)
   - Aggiorna componenti per usare nuovi contexts
   - Gestisci loading/error states

5. **Cleanup** (1 ora)
   - Rimuovi file obsoleti (db.ts, indexedDB.ts, ecc.)
   - Rimuovi dipendenze PouchDB
   - Test completo

**Tempo totale stimato: 10-15 ore**

---

## 📚 Documentazione

### Guide Principali
- **[COMPLETION_GUIDE.md](docs/COMPLETION_GUIDE.md)** - ⭐ Guida passo-passo per completare
- **[MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md)** - Piano architetturale completo
- **[DATABASE_SETUP.md](docs/DATABASE_SETUP.md)** - Setup PostgreSQL dettagliato
- **[API_ENDPOINTS.md](docs/API_ENDPOINTS.md)** - Documentazione API REST completa
- **[MIGRATION_STATUS.md](docs/MIGRATION_STATUS.md)** - Tracking progresso

### File Tecnici
- `server/prisma/schema.prisma` - Schema database completo
- `server/src/repositories/*` - Repository layer (reference code)
- `server/src/routes/*.new.ts` - REST endpoints implementati

---

## 🗄️ Database Schema

### Tabelle Principali

```sql
customers              # Clienti + consensi GDPR
├── appointments       # Appuntamenti
│   ├── payments       # Pagamenti
│   └── reminders      # Promemoria

services               # Servizi offerti
└── service_categories # Categorie servizi

staff                  # Personale
└── staff_roles        # Ruoli personale

users                  # Utenti sistema (auth)
settings               # Configurazioni app
```

**Features:**
- Relations con foreign keys
- Indexes ottimizzati per query frequenti
- Enum types per valori predefiniti
- JSONB per dati flessibili (consents history)
- UUID come chiavi primarie

---

## 🔑 Endpoints API Disponibili

### ✅ Implementati

```
POST   /api/auth/login                 # Login (JWT)
POST   /api/auth/verify                # Verifica token
POST   /api/auth/logout                # Logout

GET    /api/customers                  # Lista clienti
GET    /api/customers/:id              # Dettagli cliente
POST   /api/customers                  # Crea cliente
PUT    /api/customers/:id              # Aggiorna cliente
PATCH  /api/customers/:id/consents     # Aggiorna consensi GDPR
DELETE /api/customers/:id              # Elimina cliente

GET    /api/services                   # Lista servizi
GET    /api/services/:id               # Dettagli servizio
POST   /api/services                   # Crea servizio
PUT    /api/services/:id               # Aggiorna servizio
DELETE /api/services/:id               # Elimina servizio
GET    /api/services/categories/all    # Lista categorie
POST   /api/services/categories        # Crea categoria

GET    /api/appointments               # Lista appuntamenti
GET    /api/appointments/:id           # Dettagli appuntamento
POST   /api/appointments               # Crea appuntamento
PUT    /api/appointments/:id           # Aggiorna appuntamento
PATCH  /api/appointments/:id/status    # Cambia status
POST   /api/appointments/:id/confirm   # Conferma (public)
DELETE /api/appointments/:id           # Elimina appuntamento
```

### ❌ Da Implementare

```
/api/staff/*                           # Staff CRUD
/api/payments/*                        # Payments CRUD
/api/reminders/*                       # Reminders
/api/users/*                           # User management
/api/settings/*                        # Settings
/api/public/*                          # Public booking API
```

---

## ⚠️ Breaking Changes

### Non c'è compatibilità con sistema attuale

- ❌ Frontend NON funzionerà finché non completato refactoring
- ❌ AppContext deve essere completamente riscritto
- ❌ Tutti file PouchDB/IndexedDB devono essere rimossi
- ❌ Tutti i componenti devono essere aggiornati per usare API

### Migration Strategy

**Opzione 1: Branch separato (consigliato se app in produzione)**
1. Completa migrazione in branch
2. Test completo
3. Deploy in staging
4. Switch DNS quando pronto

**Opzione 2: Migrazione diretta (current approach)**
1. App non funzionale durante sviluppo
2. Completamento più veloce
3. Un unico deploy

---

## 🎉 Vantaggi Post-Migrazione

Dopo completamento:

✅ **Performance**
- Query complesse molto più veloci (JOIN nativi)
- Indici ottimizzati automaticamente
- Aggregazioni SQL native

✅ **Scalabilità**
- Connection pooling automatico
- Read replicas facilmente configurabili
- Gestione concorrenza superiore

✅ **Developer Experience**
- Prisma Studio per debug visuale
- Type-safety completa (end-to-end)
- Migrations automatiche
- Codice più pulito e manutenibile

✅ **Operational**
- Backup/restore professionali
- Monitoring robusto (pg_stat_statements)
- Managed options economiche (Neon, Supabase)
- Deploy semplificato

✅ **Architettura**
- Backend indipendente da frontend
- Possibilità di creare app mobile con stesse API
- API documentation auto-generata (Swagger future)

---

## 🆘 Support & Troubleshooting

### Problemi Comuni

**Database connection error:**
```bash
docker compose -f docker-compose.postgres.yml restart
```

**Prisma Client not found:**
```bash
cd server && npm run db:generate
```

**Migration errors:**
```bash
cd server && npm run db:reset  # ⚠️ Cancella tutti i dati!
```

### Risorse

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

---

## 📝 Next Steps

1. **Leggi** `docs/COMPLETION_GUIDE.md`
2. **Completa** backend REST endpoints rimanenti
3. **Crea** frontend API client
4. **Riscrivi** AppContext
5. **Update** tutti i componenti
6. **Test** integrazione completa
7. **Deploy** in production

**La migrazione è ben avviata - il grosso del lavoro infrastrutturale è fatto! 🚀**

---

## 👨‍💻 Contributors

Migrazione iniziata da: Claude AI Assistant
Branch: `claude/postgres-rest-api-migration-DVNhr`

---

**Per domande o problemi, consulta `docs/COMPLETION_GUIDE.md` o i file di documentazione nella cartella `docs/`.**
