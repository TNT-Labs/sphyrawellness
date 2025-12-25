# 🔧 Guida Rapida: Verifica Sincronizzazione Dati

## 📋 Documento di Riferimento

**Analisi Completa**: Vedere `ANALISI_SINCRONIZZAZIONE.md` per il report dettagliato con tutti i problemi identificati.

---

## 🚀 Quick Start: Eseguire i Test

### 1. Setup Ambiente

```bash
# Assicurati che CouchDB sia in esecuzione
# Default: http://localhost:5984

# Verifica connessione
curl http://admin:password@localhost:5984/
```

### 2. Esegui Test Completo

```bash
# Tutti i test
node scripts/test-sync-integrity.js

# Con output verbose
node scripts/test-sync-integrity.js --verbose

# Test specifico
node scripts/test-sync-integrity.js --test=deletion-tracking
```

### 3. Test Disponibili

| Test Name | Descrizione | Problema Verificato |
|-----------|-------------|---------------------|
| `deletion-race` | Race condition propagazione cancellazioni | 🔴 Critico #1 |
| `conflict-resolution` | Risoluzione conflitti timestamp | 🔴 Critico #3 |
| `deletion-tracking` | Tracking permanente cancellazioni | ✅ Funzionante |
| `referential-integrity` | Integrità referenziale FK | 🟡 Medio #6 |
| `sync-performance` | Performance initial sync | 🟡 Medio #4 |
| `concurrent-modifications` | Modifiche concorrenti | ℹ️ Info |

---

## 🔍 Problemi Identificati - Riepilogo

### 🔴 CRITICI (Azione Immediata Richiesta)

1. **Race Condition Cancellazioni** (`pouchdbSync.ts:120-130`)
   - **Impatto**: Loop infiniti di sync, overhead CPU/rete
   - **Fix**: Lock esclusivo per operazioni critiche
   - **Effort**: 2-3 ore

2. **Operazioni Sync Perse** (`indexedDB.ts:376-414, etc.`)
   - **Impatto**: 🔥 **PERDITA DATI PERMANENTE**
   - **Fix**: Persistent queue + retry automatico
   - **Effort**: 4-6 ore
   - **PRIORITÀ MASSIMA** ⚡

3. **Conflitti Silenziosi** (`dbBridge.ts:98-110`)
   - **Impatto**: Silent data loss, modifiche perse
   - **Fix**: Notifica utente + UI risoluzione conflitti
   - **Effort**: 8-12 ore

### 🟡 MEDI (Prossime 2 Settimane)

4. **Reload Inefficiente** (`AppContext.tsx:132-189`)
   - **Impatto**: -50% performance initial sync
   - **Fix**: Reload selettivo solo dati cambiati
   - **Effort**: 3-4 ore

5. **Flag Non Thread-Safe** (`dbBridge.ts:43`)
   - **Impatto**: Bug intermittenti in edge cases
   - **Fix**: Reference counting invece di boolean
   - **Effort**: 2 ore

6. **Integrità Referenziale** (vari file)
   - **Impatto**: Dati orfani (appuntamenti senza cliente)
   - **Fix**: Validazione FK + cascade delete
   - **Effort**: 6-8 ore

### 🟢 MINORI (Ottimizzazioni)

7. **Deletion Records Cresce** (`indexedDB.ts:917-990`)
   - **Fix**: Auto-cleanup settimanale (già implementato)
   - **Effort**: 30 minuti

---

## 🎯 Piano d'Azione Consigliato

### Questa Settimana (URGENTE)

```bash
# 1. Fix #2 - Persistent Queue (CRITICO - PERDITA DATI)
#    Implementare store pendingSyncOps in IndexedDB
#    Background worker per retry automatico
#    ROI: Elimina 90% perdite dati
```

```bash
# 2. Fix #7 - Auto-cleanup (FACILE - 30 minuti)
#    Aggiungere setInterval in AppContext.tsx
#    Chiamare cleanOldDeletionRecords(90) settimanalmente
```

### Prossime 2 Settimane

```bash
# 3. Fix #1 - Race Condition Lock
#    Implementare criticalSectionLock in pouchdbSync.ts
#    Test con 10 dispositivi simultanei

# 4. Fix #4 - Incremental Reload
#    Tracciare changedDatabases in sync events
#    Reload selettivo in AppContext
```

### Prossimo Mese

```bash
# 5. Fix #3 - Conflict Detection & Notification
#    UI per conflitti
#    Device ID tracking
#    User prompt per risoluzione manuale

# 6. Fix #5 - Reference Counting
#    Sostituire boolean flag con refCount

# 7. Fix #6 - Referential Integrity
#    Validazione FK
#    Cascade delete opzionale
```

---

## 📊 Metriche Attuali (Stimate)

### Storage Overhead
- **IndexedDB**: ~8 MB (500 customers, 1000 appointments)
- **PouchDB**: +8 MB (+100% duplicazione)
- **CouchDB**: +12 MB (+150% con indici)
- **TOTALE**: ~28 MB (**+250% overhead**)

### Performance
- **Create Appointment**: 15ms → +190ms con sync (**12x slowdown**)
- **Initial Sync (1000 docs)**: 5-15 secondi

### Error Rates (Stimate)
- **Sync operation lost**: 5-10/giorno (**CRITICO**)
- **Conflitti silenziosi**: 2-5/settimana
- **Network timeout**: 10-20/giorno (auto-retry OK)

---

## 🧪 Verifica Manuale

### Test 1: Verifica Deletion Tracking

```javascript
// Browser DevTools Console

// 1. Crea un cliente
const testCustomer = {
  id: 'test-delete-' + Date.now(),
  name: 'Test Delete',
  email: 'test@delete.com',
  phone: '1234567890'
};
await db.addCustomer(testCustomer);

// 2. Elimina il cliente
await db.deleteCustomer(testCustomer.id);

// 3. Verifica tracking
const wasDeleted = await db.wasItemDeleted('customers', testCustomer.id);
console.log('Deletion tracked:', wasDeleted); // Deve essere true

// 4. Verifica che non esista più
const customer = await db.getCustomer(testCustomer.id);
console.log('Customer exists:', customer); // Deve essere undefined
```

### Test 2: Verifica Integrità Referenziale

```javascript
// Browser DevTools Console

// 1. Crea un cliente
const customer = {
  id: 'customer-' + Date.now(),
  name: 'Test Customer',
  email: 'test@ref.com',
  phone: '9999999999'
};
await db.addCustomer(customer);

// 2. Crea appuntamento
const appointment = {
  id: 'apt-' + Date.now(),
  customerId: customer.id,
  staffId: 'staff-test',
  serviceId: 'service-test',
  date: '2025-12-30',
  time: '10:00',
  status: 'scheduled'
};
await db.addAppointment(appointment);

// 3. Elimina il cliente
await db.deleteCustomer(customer.id);

// 4. Verifica se l'appuntamento esiste ancora (BUG se esiste)
const orphanApt = await db.getAppointment(appointment.id);
console.log('Orphan appointment:', orphanApt);
// Se orphanApt !== undefined → BUG: integrità referenziale violata!
```

### Test 3: Simulazione Conflitto

```javascript
// Browser DevTools Console (richiede 2 tab/dispositivi)

// TAB 1: Modifica appuntamento
const apt1 = await db.getAppointment('appointment-id');
apt1.time = '10:00';
apt1.updatedAt = '2025-12-25T14:30:00.123Z'; // Timestamp fisso
await db.updateAppointment(apt1);

// TAB 2: Modifica stesso appuntamento (STESSO timestamp!)
const apt2 = await db.getAppointment('appointment-id');
apt2.time = '15:00';
apt2.updatedAt = '2025-12-25T14:30:00.123Z'; // STESSO timestamp!
await db.updateAppointment(apt2);

// Verifica quale vince
const final = await db.getAppointment('appointment-id');
console.log('Winner time:', final.time);
// Una delle due modifiche verrà persa silenziosamente!
```

---

## 📈 Monitoraggio Post-Fix

Dopo aver implementato i fix, monitorare:

### Metriche da Tracciare

```javascript
// In produzione, aggiungi tracking:

// 1. Operazioni sync fallite e recuperate
localStorage.getItem('sync_failed_operations_count')
localStorage.getItem('sync_recovered_operations_count')

// 2. Conflitti rilevati
localStorage.getItem('sync_conflicts_detected')
localStorage.getItem('sync_conflicts_resolved')

// 3. Deletion tracking stats
const deletionStats = await db.getAllDeletionRecords();
console.log('Total deletions tracked:', deletionStats.length);

// 4. Performance metrics
const syncTimes = JSON.parse(localStorage.getItem('sync_times') || '[]');
const avgSyncTime = syncTimes.reduce((a,b) => a+b, 0) / syncTimes.length;
console.log('Average sync time:', avgSyncTime, 'ms');
```

---

## 🆘 Troubleshooting

### Problema: Test falliscono con "Failed to fetch"

**Causa**: CouchDB non è in esecuzione o CORS non configurato

**Fix**:
```bash
# Verifica CouchDB
curl http://admin:password@localhost:5984/

# Configura CORS
node scripts/configure-couchdb-cors.cjs http://localhost:5984 admin password
```

### Problema: Test molto lenti

**Causa**: CouchDB su server remoto con alta latenza

**Fix**:
```bash
# Usa CouchDB locale per i test
export COUCHDB_URL="http://admin:password@localhost:5984"
node scripts/test-sync-integrity.js
```

### Problema: "Database already exists"

**Causa**: Test precedente non ha fatto cleanup

**Fix**:
```bash
# Cleanup manuale
curl -X DELETE http://admin:password@localhost:5984/sphyra-customers-test
curl -X DELETE http://admin:password@localhost:5984/sphyra-appointments-test
curl -X DELETE http://admin:password@localhost:5984/sphyra-deleted-items-test
```

---

## 📚 Risorse Aggiuntive

- **Report Completo**: `ANALISI_SINCRONIZZAZIONE.md`
- **Assessment Architettura**: `ASSESSMENT_DATABASE_ARCHITECTURE.md`
- **Verifica Sync**: `VERIFICA-SINCRONIZZAZIONE.md`
- **CORS Setup**: `CONFIGURAZIONE-COUCHDB-CORS.md`

---

## ✅ Checklist Pre-Deploy

Prima di fare deploy dei fix in produzione:

- [ ] Tutti i test passano (`node scripts/test-sync-integrity.js`)
- [ ] Fix #2 implementato (Persistent Queue)
- [ ] Fix #7 implementato (Auto-cleanup)
- [ ] Test manuale su 2-3 dispositivi
- [ ] Backup completo database
- [ ] Piano di rollback documentato
- [ ] Monitoring attivo per prime 48 ore

---

**Data ultima modifica**: 2025-12-25
**Versione**: 1.0
