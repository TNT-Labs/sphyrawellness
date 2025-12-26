# Piano Migrazione: PouchDB/CouchDB → PostgreSQL + REST API

## Architettura Attuale vs. Target

### ATTUALE (PouchDB/CouchDB)
```
Frontend (React) → IndexedDB → PouchDB (local) ↔ CouchDB (server)
                      ↓
              Express.js Backend
              (reminders, email, SMS)
```

### TARGET (PostgreSQL + REST API)
```
Frontend (React)
    ↓ (HTTP/HTTPS - REST/GraphQL)
Backend API (Node.js + Express)
    ↓ (PostgreSQL client - pg/Prisma)
PostgreSQL Database
```

---

## Schema PostgreSQL Proposto

### 1. CUSTOMERS Table
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  date_of_birth DATE,
  notes TEXT,
  allergies TEXT,

  -- GDPR Consents
  privacy_consent BOOLEAN NOT NULL DEFAULT false,
  privacy_consent_date TIMESTAMP,
  privacy_consent_version VARCHAR(20),
  email_reminder_consent BOOLEAN DEFAULT false,
  email_reminder_consent_date TIMESTAMP,
  sms_reminder_consent BOOLEAN DEFAULT false,
  sms_reminder_consent_date TIMESTAMP,
  health_data_consent BOOLEAN DEFAULT false,
  health_data_consent_date TIMESTAMP,
  marketing_consent BOOLEAN DEFAULT false,
  consent_history JSONB DEFAULT '[]',  -- Array di ConsentHistoryEntry

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  CONSTRAINT customers_email_key UNIQUE (email),
  CONSTRAINT customers_phone_key UNIQUE (phone)
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_created_at ON customers(created_at);
```

### 2. SERVICE_CATEGORIES Table
```sql
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL,  -- Hex color
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_service_categories_active ON service_categories(is_active);
```

### 3. SERVICES Table
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,  -- minutes
  price DECIMAL(10, 2) NOT NULL,
  category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  color VARCHAR(7),
  image_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_name ON services(name);
```

### 4. STAFF_ROLES Table
```sql
CREATE TABLE staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5. STAFF Table
```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  role_id UUID REFERENCES staff_roles(id) ON DELETE SET NULL,
  specializations TEXT[],  -- Array di specializzazioni
  color VARCHAR(7) NOT NULL,  -- Per calendario
  is_active BOOLEAN NOT NULL DEFAULT true,
  profile_image_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_active ON staff(is_active);
CREATE INDEX idx_staff_role ON staff(role_id);
```

### 6. APPOINTMENTS Table
```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,

  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',  -- scheduled, confirmed, completed, cancelled, no-show
  notes TEXT,

  reminder_sent BOOLEAN DEFAULT false,
  confirmation_token VARCHAR(255),
  confirmation_token_hash VARCHAR(255),  -- bcrypt hash
  token_expires_at TIMESTAMP,
  confirmed_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT appointments_status_check CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show')),
  CONSTRAINT appointments_time_check CHECK (end_time > start_time)
);

-- Indexes critici per performance
CREATE INDEX idx_appointments_date_status ON appointments(date, status);
CREATE INDEX idx_appointments_customer ON appointments(customer_id, date);
CREATE INDEX idx_appointments_staff ON appointments(staff_id, date);
CREATE INDEX idx_appointments_service ON appointments(service_id, status);
CREATE INDEX idx_appointments_token ON appointments(confirmation_token);
CREATE INDEX idx_appointments_date ON appointments(date);
```

### 7. PAYMENTS Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  method VARCHAR(20) NOT NULL,  -- cash, card, transfer, other
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT payments_method_check CHECK (method IN ('cash', 'card', 'transfer', 'other'))
);

CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_payments_date ON payments(date);
```

### 8. REMINDERS Table
```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,  -- email, sms, whatsapp, notification
  scheduled_for TIMESTAMP NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT reminders_type_check CHECK (type IN ('email', 'sms', 'whatsapp', 'notification'))
);

CREATE INDEX idx_reminders_appointment ON reminders(appointment_id);
CREATE INDEX idx_reminders_sent ON reminders(sent, scheduled_for);
```

### 9. USERS Table (Autenticazione)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,  -- bcrypt
  role VARCHAR(20) NOT NULL,  -- RESPONSABILE, UTENTE
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT users_role_check CHECK (role IN ('RESPONSABILE', 'UTENTE'))
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(is_active);
```

### 10. SETTINGS Table (Configurazioni App)
```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Impostazioni iniziali
INSERT INTO settings (key, value) VALUES
  ('reminder_send_hour', '10'),
  ('reminder_send_minute', '0'),
  ('enable_auto_reminders', 'true'),
  ('reminder_days_before', '1');
```

---

## Stack Tecnologico Proposto

### Backend
- **Framework**: Express.js (già in uso)
- **Database Client**: `pg` (PostgreSQL driver nativo)
- **ORM**: **Prisma** (raccomandato) oppure **TypeORM**
  - ✅ Prisma: Type-safe, auto-migrations, ottimo DX
  - ✅ TypeORM: Più flessibile, decorators
- **Validazione**: Zod (già in uso)
- **Authentication**: JWT + bcrypt (già in uso)
- **API Style**: REST API (con possibilità GraphQL futura)

### Nuove Dipendenze
```json
{
  "@prisma/client": "^6.2.0",
  "prisma": "^6.2.0",
  "pg": "^8.11.0"
}
```

### Deployment Database
- **Development**: PostgreSQL locale (Docker)
- **Production**: Managed PostgreSQL
  - AWS RDS
  - DigitalOcean Managed Database
  - Supabase (include auth + storage)
  - Neon (serverless, tier gratuito)

---

## Architettura API REST

### Endpoints Principali

#### Customers
```
GET    /api/customers              # Lista clienti
GET    /api/customers/:id          # Dettaglio cliente
POST   /api/customers              # Crea cliente
PUT    /api/customers/:id          # Aggiorna cliente
DELETE /api/customers/:id          # Elimina cliente (soft delete)
PATCH  /api/customers/:id/consents # Aggiorna consensi GDPR
```

#### Services
```
GET    /api/services               # Lista servizi
GET    /api/services/:id           # Dettaglio servizio
POST   /api/services               # Crea servizio
PUT    /api/services/:id           # Aggiorna servizio
DELETE /api/services/:id           # Elimina servizio
```

#### Staff
```
GET    /api/staff                  # Lista staff
GET    /api/staff/:id              # Dettaglio staff
POST   /api/staff                  # Crea staff
PUT    /api/staff/:id              # Aggiorna staff
DELETE /api/staff/:id              # Elimina staff (soft delete)
```

#### Appointments
```
GET    /api/appointments                      # Lista appuntamenti (con filtri)
GET    /api/appointments/:id                  # Dettaglio appuntamento
POST   /api/appointments                      # Crea appuntamento
PUT    /api/appointments/:id                  # Aggiorna appuntamento
DELETE /api/appointments/:id                  # Elimina appuntamento
PATCH  /api/appointments/:id/status           # Cambia status
POST   /api/appointments/:id/confirm          # Conferma via token (pubblico)
GET    /api/appointments/customer/:customerId # Appuntamenti cliente
GET    /api/appointments/staff/:staffId       # Appuntamenti staff
```

#### Payments
```
GET    /api/payments                          # Lista pagamenti
GET    /api/payments/:id                      # Dettaglio pagamento
POST   /api/payments                          # Registra pagamento
PUT    /api/payments/:id                      # Aggiorna pagamento
DELETE /api/payments/:id                      # Elimina pagamento
```

#### Public Booking (No Auth)
```
GET    /api/public/services                   # Servizi pubblici
GET    /api/public/staff                      # Staff disponibile
POST   /api/public/appointments/availability  # Slot disponibili
POST   /api/public/appointments               # Prenota appuntamento
```

#### Statistics
```
GET    /api/statistics/revenue                # Report fatturato
GET    /api/statistics/appointments           # Report appuntamenti
GET    /api/statistics/customers              # Report clienti
```

---

## Fasi di Implementazione

### Fase 1: Setup Database e ORM (Giorno 1)
1. ✅ Installare PostgreSQL (Docker)
2. ✅ Setup Prisma
3. ✅ Definire schema Prisma
4. ✅ Creare migrations
5. ✅ Seed dati iniziali

### Fase 2: Backend API (Giorni 2-3)
1. ✅ Creare repository pattern con Prisma
2. ✅ Implementare endpoints CRUD base
3. ✅ Aggiungere validazione Zod
4. ✅ Implementare autenticazione JWT
5. ✅ Error handling middleware

### Fase 3: Migrazione Dati (Giorno 4)
1. ✅ Script export da CouchDB
2. ✅ Script trasformazione dati
3. ✅ Script import in PostgreSQL
4. ✅ Validazione dati migrati

### Fase 4: Frontend Refactoring (Giorni 5-6)
1. ✅ Rimuovere PouchDB/IndexedDB
2. ✅ Creare API client (axios/fetch)
3. ✅ Aggiornare AppContext
4. ✅ Aggiornare tutti i componenti
5. ✅ Implementare caching (React Query)

### Fase 5: Testing e Deploy (Giorno 7)
1. ✅ Test API endpoints
2. ✅ Test integrazione frontend-backend
3. ✅ Setup database production
4. ✅ Deploy backend
5. ✅ Deploy frontend

---

## Vantaggi della Migrazione

### Performance
- ✅ Query JOIN native (vs. client-side joins)
- ✅ Indici ottimizzati per query complesse
- ✅ Window functions per statistiche
- ✅ Full-text search nativo

### Scalabilità
- ✅ Gestione concorrenza superiore
- ✅ Connection pooling
- ✅ Read replicas facili
- ✅ Partitioning per grandi dataset

### Developer Experience
- ✅ Prisma Studio per debug
- ✅ Type-safety end-to-end
- ✅ Migrations automatiche
- ✅ Schema visualization

### Operazioni
- ✅ Backup/restore mature
- ✅ Monitoring tools (pg_stat_statements)
- ✅ Managed options economiche
- ✅ Ecosistema maturo

---

## Compatibilità Offline

### Opzioni per Mantenere PWA Offline-First

**Opzione 1: Service Worker + Cache API**
- Cache API responses
- Sync quando online (Background Sync API)
- Limitata vs. IndexedDB

**Opzione 2: IndexedDB + Sync Queue**
- Mantieni IndexedDB per cache locale
- Queue operazioni offline
- Sync con API quando online
- Più complesso ma più robusto

**Opzione 3: Hybrid (Raccomandato)**
- Letture: Cache API (GET requests)
- Scritture: Sync queue + ottimistic UI
- Compromesso tra semplicità e robustezza

---

## Costi Stimati (Production)

### Database Managed
- **DigitalOcean**: $15/mese (1GB RAM, 10GB storage)
- **AWS RDS**: ~$15-20/mese (db.t3.micro)
- **Supabase**: Free tier (500MB database)
- **Neon**: Free tier (0.5GB storage, autoscaling)

### Backend Hosting
- **DigitalOcean Droplet**: $6/mese (1GB RAM)
- **Railway**: $5/mese + usage
- **Render**: Free tier disponibile

**Totale**: $10-35/mese (vs. Firebase ~$25-100/mese)

---

## Prossimi Passi

1. ✅ Approvare piano migrazione
2. ✅ Scegliere ORM (Prisma vs TypeORM)
3. ✅ Setup PostgreSQL locale
4. ✅ Implementare schema database
5. ✅ Iniziare sviluppo API

Vuoi procedere con l'implementazione? Posso iniziare con il setup di Prisma e PostgreSQL.
