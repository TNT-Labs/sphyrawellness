# Setup Database PostgreSQL

## Opzioni di Deployment

### Opzione 1: PostgreSQL Locale con Docker (Sviluppo)

```bash
# Avvia PostgreSQL + pgAdmin
docker compose -f docker-compose.postgres.yml up -d

# Verifica che PostgreSQL sia running
docker ps

# Accedi a pgAdmin: http://localhost:5050
# Email: admin@sphyrawellness.local
# Password: admin
```

**Credenziali Database:**
- Host: `localhost`
- Port: `5432`
- Database: `sphyra_wellness`
- Username: `sphyra_user`
- Password: `sphyra_dev_password_2024`

**Database URL:**
```
postgresql://sphyra_user:sphyra_dev_password_2024@localhost:5432/sphyra_wellness?schema=public
```

### Opzione 2: Database Managed (Production)

#### DigitalOcean Managed Database ($15/mese)
1. Crea database su DigitalOcean
2. Ottieni connection string
3. Aggiorna `DATABASE_URL` in `.env`

#### Neon (Free Tier - Serverless)
1. Registrati su [neon.tech](https://neon.tech)
2. Crea nuovo progetto
3. Copia connection string
4. Aggiorna `DATABASE_URL` in `.env`

#### Supabase (Free Tier)
1. Registrati su [supabase.com](https://supabase.com)
2. Crea nuovo progetto
3. Ottieni connection string (Direct connection)
4. Aggiorna `DATABASE_URL` in `.env`

---

## Inizializzazione Database

### 1. Installa dipendenze

```bash
cd server
npm install
```

### 2. Genera Prisma Client

```bash
npm run db:generate
```

### 3. Crea tabelle (migrations)

```bash
npm run db:migrate
```

Quando richiesto, inserisci un nome per la migration:
```
Enter a name for the new migration: › initial_schema
```

### 4. Popola database con dati di esempio

```bash
npm run db:seed
```

Output atteso:
```
🌱 Starting database seed...
👥 Creating staff roles...
✅ Created 4 staff roles
📦 Creating service categories...
✅ Created 4 service categories
💆 Creating services...
✅ Created 6 services
👨‍⚕️ Creating staff...
✅ Created 3 staff members
👥 Creating customers...
✅ Created 3 customers
📅 Creating appointments...
✅ Created 3 appointments
🔐 Creating users...
✅ Created 2 users
   📝 Admin credentials: admin / admin123
   📝 User credentials: user / user123
⚙️  Creating settings...
✅ Created 4 settings

✨ Database seeded successfully!
```

---

## Gestione Database

### Visualizzare dati con Prisma Studio

```bash
npm run db:studio
```

Apri browser su: http://localhost:5555

### Reset database (sviluppo)

```bash
npm run db:reset
```

Questo comando:
1. Elimina tutte le tabelle
2. Ricrea lo schema
3. Esegue seed automaticamente

### Creare nuova migration

Dopo modifiche allo schema Prisma:

```bash
npm run db:migrate
```

### Deploy migrations (production)

```bash
npm run db:migrate:deploy
```

---

## Backup e Restore

### Backup

```bash
# Backup completo
pg_dump -h localhost -U sphyra_user -d sphyra_wellness > backup_$(date +%Y%m%d).sql

# Backup con Docker
docker exec sphyra-postgres pg_dump -U sphyra_user sphyra_wellness > backup.sql
```

### Restore

```bash
# Restore da file
psql -h localhost -U sphyra_user -d sphyra_wellness < backup.sql

# Restore con Docker
docker exec -i sphyra-postgres psql -U sphyra_user sphyra_wellness < backup.sql
```

---

## Troubleshooting

### Errore: "Can't reach database server"

```bash
# Verifica che PostgreSQL sia running
docker ps | grep sphyra-postgres

# Verifica logs
docker logs sphyra-postgres

# Riavvia container
docker compose -f docker-compose.postgres.yml restart
```

### Errore: "Port 5432 already in use"

Cambia la porta in `docker-compose.postgres.yml`:

```yaml
ports:
  - "5433:5432"  # Usa porta 5433 invece di 5432
```

Aggiorna `DATABASE_URL`:
```
postgresql://sphyra_user:sphyra_dev_password_2024@localhost:5433/sphyra_wellness
```

### Reset completo

```bash
# Ferma e rimuovi containers
docker compose -f docker-compose.postgres.yml down -v

# Riavvia
docker compose -f docker-compose.postgres.yml up -d

# Re-inizializza
cd server
npm run db:migrate
npm run db:seed
```

---

## Monitoraggio e Performance

### Query lente (pg_stat_statements)

```sql
-- Abilita pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Query più lente
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Dimensione database

```sql
SELECT
  pg_size_pretty(pg_database_size('sphyra_wellness')) as size;
```

### Tabelle più grandi

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```
