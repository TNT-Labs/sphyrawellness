# Migration Status: PostgreSQL + REST API

## ✅ Completato

### Database & Schema
- [x] Docker Compose per PostgreSQL + pgAdmin
- [x] Schema Prisma completo (10 tabelle, enum, relations)
- [x] Seed script con dati di esempio
- [x] Database configuration e .env

### Backend - Repository Layer
- [x] Prisma Client setup
- [x] CustomerRepository (con GDPR, consents, search)
- [x] ServiceRepository + ServiceCategoryRepository
- [x] StaffRepository + StaffRoleRepository
- [x] AppointmentRepository (conflict detection, date ranges)
- [x] PaymentRepository (revenue stats)
- [x] ReminderRepository
- [x] UserRepository (authentication)
- [x] SettingRepository

### Backend - REST API Endpoints
- [x] `/api/customers` - CRUD completo
- [x] `/api/customers/:id/consents` - GDPR consents
- [x] `/api/services` - CRUD completo
- [x] `/api/services/categories` - Gestione categorie
- [ ] `/api/staff` - Da completare
- [ ] `/api/appointments` - Da completare
- [ ] `/api/payments` - Da completare
- [ ] `/api/auth` - Da completare
- [ ] `/api/settings` - Da completare
- [ ] `/api/public/*` - Public booking API

### Documentazione
- [x] docs/MIGRATION_PLAN.md - Piano completo migrazione
- [x] docs/DATABASE_SETUP.md - Setup PostgreSQL
- [x] docs/API_ENDPOINTS.md - Documentazione API REST completa

---

## 🚧 Da Completare

### Backend - REST API (File da creare)
```
server/src/routes/
├── staff.new.ts          # Staff + StaffRoles endpoints
├── appointments.new.ts   # Appointments endpoints
├── payments.new.ts       # Payments endpoints
├── reminders.new.ts      # Reminders endpoints
├── auth.new.ts           # Authentication endpoints
├── users.new.ts          # User management endpoints
├── settings.new.ts       # Settings endpoints
└── public.new.ts         # Public booking API
```

### Backend - Middleware
```
server/src/middleware/
├── auth.ts         # Update per Prisma (rimuovere PouchDB)
├── errorHandler.ts # Error handling standardizzato
└── validation.ts   # Request validation middleware
```

### Backend - Main App
```
server/src/app.ts   # Update routes (usare .new.ts invece di vecchi)
server/src/index.ts # Entry point
```

### Frontend - API Client
```
src/api/
├── client.ts       # Axios client con auth interceptors
├── customers.ts    # Customer API calls
├── services.ts     # Services API calls
├── staff.ts        # Staff API calls
├── appointments.ts # Appointments API calls
├── payments.ts     # Payments API calls
├── auth.ts         # Auth API calls
└── settings.ts     # Settings API calls
```

### Frontend - Context Refactoring
```
src/contexts/
├── AuthContext.tsx # Update per usare API invece di IndexedDB
└── AppContext.tsx  # RIMUOVERE tutto PouchDB/IndexedDB logic
```

### Frontend - Utils Cleanup
```
RIMUOVERE:
├── src/utils/db.ts
├── src/utils/indexedDB.ts
├── src/utils/dbBridge.ts
├── src/utils/pouchdbSync.ts
└── src/utils/syncQueueWorker.ts
```

### Frontend - Components Update
- [ ] Update tutti i componenti per usare API invece di AppContext CRUD
- [ ] Implementare loading states
- [ ] Error handling

### Dependencies Cleanup
```
server/package.json:
RIMUOVERE:
- pouchdb-node
- pouchdb-find

frontend/package.json:
RIMUOVERE:
- pouchdb-browser
- pouchdb-find
- idb (se non più usato)
```

---

## 📊 Progresso Totale

### Backend: 70% Complete
- ✅ Database Schema
- ✅ Repository Layer
- ⚠️  REST API Endpoints (50% - customers, services done)
- ❌ Middleware updates
- ❌ App integration

### Frontend: 10% Complete
- ❌ API Client
- ❌ Context refactoring
- ❌ Components update
- ❌ Utils cleanup

---

## 🎯 Next Steps (Ordine consigliato)

### Step 1: Completa Backend API
1. Crea file `staff.new.ts`, `appointments.new.ts`, `payments.new.ts`
2. Crea file `auth.new.ts`, `settings.new.ts`
3. Crea file `public.new.ts`
4. Update `app.ts` per montare nuovi router
5. Test endpoints con Postman/Thunder Client

### Step 2: Frontend API Client
1. Crea `/src/api/client.ts` (Axios con interceptors)
2. Crea file per ogni entità
3. Implementa error handling e retry logic

### Step 3: Frontend Context Refactoring
1. Update `AuthContext` per usare API
2. **COMPLETAMENTE RISCRIVI** `AppContext`:
   - Rimuovi PouchDB/IndexedDB logic
   - Usa API client
   - Implementa caching con React Query (optional)

### Step 4: Update Components
1. Aggiorna tutti i componenti che usano AppContext
2. Gestisci loading/error states
3. Test funzionalità

### Step 5: Cleanup
1. Rimuovi file obsoleti (db.ts, indexedDB.ts, ecc.)
2. Rimuovi dipendenze PouchDB
3. Update package.json

### Step 6: Testing & Deploy
1. Test integrazione completa
2. Setup database production
3. Deploy backend
4. Deploy frontend
5. Migrazione dati da CouchDB (se necessario)

---

## 🔧 Commands per Sviluppo

### Setup Database
```bash
# Start PostgreSQL
docker compose -f docker-compose.postgres.yml up -d

# Install dependencies
cd server && npm install

# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed
```

### Sviluppo
```bash
# Backend
cd server && npm run dev

# Frontend
npm run dev
```

### Testing
```bash
# Backend tests
cd server && npm test

# Frontend tests
npm test
```

---

## 📝 Note Importanti

### Breaking Changes
- **NO compatibilità** con sistema attuale
- Frontend NON funzionerà finché non completato refactoring
- AppContext deve essere completamente riscritto
- Tutti i componenti devono essere aggiornati

### Migration Path
Se vuoi mantenere l'app funzionante durante lo sviluppo:
1. Crea branch separato `postgres-migration`
2. Completa TUTTA la migrazione nel branch
3. Test completo
4. Merge quando tutto funziona

**OPPURE** (approccio aggressivo - current):
1. Migrazione completa in un colpo solo
2. App non funzionale durante sviluppo
3. Più veloce ma richiede downtime

### Database Migration
Per migrare dati esistenti da CouchDB:
1. Export dati da CouchDB (JSON)
2. Trasforma formato
3. Import in PostgreSQL con Prisma

Script da creare:
```
server/scripts/
├── export-from-couchdb.ts
├── transform-data.ts
└── import-to-postgres.ts
```

---

## 🎉 Quando Completo

L'applicazione avrà:
- ✅ Database PostgreSQL robusto e scalabile
- ✅ API REST type-safe con Prisma
- ✅ Backend indipendente dal frontend
- ✅ Possibilità di creare app mobile che usa stesse API
- ✅ Facilità di deployment (managed PostgreSQL)
- ✅ Monitoraggio e backup professionali
- ✅ Performance superiori per query complesse
