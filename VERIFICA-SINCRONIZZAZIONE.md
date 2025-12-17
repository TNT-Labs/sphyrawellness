# Guida Verifica Sincronizzazione Database

Questa guida descrive come verificare che il sincronismo dei dati tra le basi dati funzioni correttamente sia in andata che in ritorno.

## Architettura del Sistema

Il sistema Sphyra Wellness Lab utilizza una sincronizzazione bidirezionale a tre livelli:

```
┌─────────────────────────────────────────────────────┐
│  Browser (Client)                                   │
│  ┌─────────────┐     ┌──────────────┐              │
│  │  IndexedDB  │ ←→  │   PouchDB    │              │
│  │  (Storage)  │     │  (Sync Eng)  │              │
│  └─────────────┘     └──────────────┘              │
└─────────────────────────────┬───────────────────────┘
                              │
                              ↓ Bidirectional Sync
                              ↓
┌─────────────────────────────┴───────────────────────┐
│  Server (Backend)                                   │
│  ┌──────────────────────────────────┐               │
│  │         CouchDB 3.3              │               │
│  │    (Remote Database Server)      │               │
│  └──────────────────────────────────┘               │
└─────────────────────────────────────────────────────┘
```

### Database Sincronizzati

Il sistema sincronizza **9 database principali**:

| Database | Descrizione | Store IndexedDB |
|----------|-------------|-----------------|
| `sphyra-customers` | Clienti | customers |
| `sphyra-services` | Servizi offerti | services |
| `sphyra-staff` | Personale | staff |
| `sphyra-appointments` | Appuntamenti | appointments |
| `sphyra-payments` | Pagamenti | payments |
| `sphyra-reminders` | Promemoria | reminders |
| `sphyra-staff-roles` | Ruoli del personale | staffRoles |
| `sphyra-service-categories` | Categorie servizi | serviceCategories |
| `sphyra-users` | Utenti sistema | users |

Inoltre esiste un database **solo backend**:
- `sphyra-settings` - Configurazioni server

---

## Script di Verifica

Sono disponibili **2 script** per verificare la sincronizzazione:

### 1. Verifica Configurazione (Offline)

**File**: `scripts/verify-sync-config.cjs`

Verifica la configurazione del codice **senza necessità di CouchDB attivo**.

**Cosa verifica**:
- ✅ Esistenza di tutti i file necessari
- ✅ Coerenza dei nomi database tra frontend e backend
- ✅ Presenza delle interfacce TypeScript
- ✅ Dipendenze package.json corrette
- ✅ Presenza delle funzioni chiave di sincronizzazione

**Utilizzo**:
```bash
node scripts/verify-sync-config.cjs
```

**Output atteso**:
```
✓ Passati: 46/47 (97.9%)
⚠ Warning: 1 (database "settings" è solo backend - normale)
```

### 2. Verifica Sincronizzazione Live

**File**: `scripts/verify-db-sync.cjs`

Verifica che la sincronizzazione funzioni **con CouchDB attivo**.

**Cosa verifica**:
- 🔌 Connessione a CouchDB
- 📊 Esistenza di tutti i database
- 📈 Informazioni e statistiche database
- ⬆️  Sincronizzazione PUSH (locale → remoto)
- ⬇️  Sincronizzazione PULL (remoto → locale)
- ⚔️  Gestione conflitti
- ⚡ Performance delle query
- 🌐 Configurazione CORS

**Utilizzo**:

```bash
# Opzione 1: Parametri da linea di comando
node scripts/verify-db-sync.cjs http://localhost:5984 admin password

# Opzione 2: Variabili d'ambiente
export COUCHDB_URL=http://localhost:5984
export COUCHDB_USERNAME=admin
export COUCHDB_PASSWORD=password
node scripts/verify-db-sync.cjs
```

**Output**:
- Report dettagliato su console con colori
- File JSON: `sync-verification-report.json`

---

## Come Eseguire i Test

### Prerequisiti

1. **CouchDB deve essere in esecuzione** (per test live)
2. **Credenziali di accesso** configurate

### Passo 1: Avvia CouchDB

#### Con Docker Compose (Consigliato)

```bash
# Avvia tutto lo stack (CouchDB, Backend, Frontend)
docker-compose -f docker-compose.https-private.yml up -d

# Oppure solo CouchDB
docker-compose -f docker-compose.https-private.yml up -d couchdb

# Verifica che CouchDB sia in esecuzione
docker ps | grep couchdb
curl http://localhost:5984
```

#### Senza Docker

Se CouchDB è installato localmente:
```bash
# Avvia CouchDB
sudo systemctl start couchdb

# Verifica
curl http://localhost:5984
```

### Passo 2: Configura i Database

Prima di testare la sincronizzazione, assicurati che i database esistano:

```bash
# Setup database (crea tutti i 9 database)
node scripts/setup-couchdb.js http://localhost:5984 admin password
```

Output atteso:
```
✓ Database sphyra-customers creato
✓ Database sphyra-services creato
✓ Database sphyra-staff creato
...
✓ Tutti i database sono stati creati con successo!
```

### Passo 3: Verifica Configurazione

```bash
node scripts/verify-sync-config.cjs
```

Se il risultato è **97.9% o superiore**, la configurazione è corretta.

### Passo 4: Test Sincronizzazione Live

```bash
node scripts/verify-db-sync.cjs http://localhost:5984 admin password
```

**Interpretazione risultati**:

| Tasso Successo | Stato | Azione |
|----------------|-------|--------|
| ≥ 80% | ✅ Ottimo | Sincronizzazione OK |
| 60-79% | ⚠️  Warning | Rivedere i warning |
| < 60% | ❌ Errore | Correggere gli errori |

---

## Test Manuali nell'Applicazione

### Test 1: Sincronizzazione Push (Locale → Remoto)

1. **Apri l'applicazione** nel browser
2. **Vai su Impostazioni** → Sincronizzazione
3. **Configura CouchDB**:
   - URL: `http://localhost:5984`
   - Username: `admin`
   - Password: [la tua password]
4. **Abilita sincronizzazione**
5. **Crea un nuovo cliente** nella sezione Clienti
6. **Verifica su CouchDB** che il cliente sia stato sincronizzato:
   ```bash
   curl http://admin:password@localhost:5984/sphyra-customers/_all_docs
   ```

### Test 2: Sincronizzazione Pull (Remoto → Locale)

1. **Crea un documento direttamente in CouchDB**:
   ```bash
   curl -X POST http://admin:password@localhost:5984/sphyra-services \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Servizio Test",
       "duration": 60,
       "price": 50,
       "category": "Test"
     }'
   ```
2. **Nell'applicazione**, il nuovo servizio dovrebbe apparire automaticamente
3. **Verifica** nella sezione Servizi

### Test 3: Gestione Conflitti

1. **Crea un cliente** nell'app
2. **Modifica lo stesso cliente** su due dispositivi/browser diversi contemporaneamente
3. **Salva entrambe le modifiche**
4. **Verifica** che il sistema utilizzi la versione più recente (basata su `updatedAt`)

---

## Risoluzione Problemi

### Errore: "Impossibile connettersi a CouchDB"

**Cause possibili**:
- CouchDB non in esecuzione
- URL non corretto
- Credenziali errate
- Firewall che blocca la porta 5984

**Soluzioni**:
```bash
# Verifica che CouchDB sia in esecuzione
curl http://localhost:5984

# Verifica con autenticazione
curl http://admin:password@localhost:5984

# Verifica log CouchDB
docker logs sphyra-couchdb  # se Docker
tail -f /var/log/couchdb/couchdb.log  # se locale
```

### Errore: "Database non trovato (404)"

**Causa**: I database non sono stati creati

**Soluzione**:
```bash
node scripts/setup-couchdb.js http://localhost:5984 admin password
```

### Errore: "CORS non configurato"

**Causa**: CouchDB non accetta richieste dal browser

**Soluzione**:
```bash
# Configura CORS
bash scripts/configure-cors.sh http://localhost:5984 admin password

# Oppure usa lo script Node.js
node scripts/configure-couchdb-cors.cjs http://localhost:5984 admin password
```

### Warning: "Latenza alta"

**Causa**: Network lento o CouchDB sovraccarico

**Soluzioni**:
- Verifica la connessione di rete
- Riduci il carico su CouchDB
- Considera l'uso di indici per query più veloci

### Sincronizzazione lenta o bloccata

**Diagnosi**:
```bash
# Verifica stato sincronizzazione nell'app
# Settings → Sincronizzazione → Stato

# Verifica task attivi in CouchDB
curl http://admin:password@localhost:5984/_active_tasks
```

**Soluzioni**:
- Ferma e riavvia la sincronizzazione
- Verifica la connessione di rete
- Controlla i log del browser (Console)

---

## File Chiave del Sistema

### Frontend

| File | Scopo |
|------|-------|
| `src/utils/pouchdbSync.ts` | Engine principale di sincronizzazione |
| `src/utils/dbBridge.ts` | Bridge tra IndexedDB ↔ PouchDB |
| `src/utils/indexedDB.ts` | Operazioni su IndexedDB |
| `src/types/index.ts` | Definizioni TypeScript |
| `src/pages/Settings.tsx` | UI configurazione sync |

### Backend

| File | Scopo |
|------|-------|
| `server/src/config/database.ts` | Connessioni a CouchDB |
| `server/src/routes/*.ts` | API endpoints |

### Script

| File | Scopo |
|------|-------|
| `scripts/setup-couchdb.js` | Setup database iniziale |
| `scripts/verify-db-sync.cjs` | Test sincronizzazione live |
| `scripts/verify-sync-config.cjs` | Test configurazione offline |
| `scripts/reset-couchdb.js` | Reset completo database |
| `scripts/configure-couchdb-cors.cjs` | Configurazione CORS |

---

## Monitoraggio e Logging

### Console del Browser

Apri DevTools → Console per vedere i log di sincronizzazione:

```
[PouchDB Sync] Starting sync for 9 databases...
[PouchDB Sync] ✓ Connected to http://localhost:5984
[PouchDB Sync] Step 3/6: Ensuring databases exist...
[PouchDB Sync] Step 4/6: Starting live replication...
[PouchDB Sync] ✓ Sync active for sphyra-customers
[PouchDB Sync] Changed: 5 documents synced
```

### Stato Sincronizzazione

Nell'app, vai su **Impostazioni** → **Sincronizzazione** per vedere:

- **Stato**: `attiva` / `non attiva` / `errore`
- **Ultima sincronizzazione**: timestamp
- **Documenti sincronizzati**: conteggio
- **Direzione**: `push` / `pull` / `bidirezionale`
- **Durata ultima sync**: millisecondi
- **Errori**: lista degli errori recenti

---

## Best Practices

### ✅ Do

- ✅ Testa la sincronizzazione in ambiente di sviluppo prima di produzione
- ✅ Usa credenziali sicure per CouchDB in produzione
- ✅ Monitora la latenza e le performance
- ✅ Esegui backup regolari dei database
- ✅ Configura CORS correttamente per sicurezza

### ❌ Don't

- ❌ Non usare credenziali di default (`admin:password`) in produzione
- ❌ Non esporre CouchDB direttamente su internet senza HTTPS
- ❌ Non modificare manualmente i documenti in CouchDB mentre la sync è attiva
- ❌ Non eliminare database senza backup
- ❌ Non dimenticare di configurare gli indici per query complesse

---

## Report di Verifica

Dopo aver eseguito `verify-db-sync.cjs`, viene generato un file JSON:

**File**: `sync-verification-report.json`

```json
{
  "total": 25,
  "passed": 23,
  "failed": 0,
  "warnings": 2,
  "details": [
    {
      "timestamp": "2025-01-15T10:30:00.000Z",
      "name": "Connessione a CouchDB",
      "status": "PASS",
      "details": "Latenza: 45ms"
    },
    ...
  ]
}
```

Usa questo report per:
- 📊 Tracking delle performance nel tempo
- 🐛 Debug di problemi ricorrenti
- 📝 Documentazione per il team
- ✅ Validazione pre-deploy

---

## Supporto

Per problemi o domande:

1. **Controlla i log** nel browser e nel server
2. **Esegui gli script di verifica**
3. **Consulta questa guida**
4. **Verifica la documentazione CouchDB**: https://docs.couchdb.org/
5. **Apri un issue** su GitHub

---

## Changelog

### 2025-01-15
- ✨ Creati script di verifica configurazione e sincronizzazione
- ✅ Aggiunti tutti i 9 database alla configurazione
- 📝 Creata documentazione completa
- 🔧 Corretti database mancanti nel backend

---

**Ultimo aggiornamento**: 2025-01-15
**Versione**: 1.0.0
