# Scripts Utility - Sphyra Wellness

Questa directory contiene script di utility per la configurazione e manutenzione dell'applicazione Sphyra Wellness.

## 📜 Script Disponibili

### 🔒 configure-couchdb-cors.cjs

Configura automaticamente CORS su CouchDB per permettere l'accesso dall'applicazione web.

**Uso**:
```bash
node scripts/configure-couchdb-cors.cjs <couchdb-url> <username> <password>
```

**Esempio**:
```bash
# Configurazione locale con Docker
node scripts/configure-couchdb-cors.cjs http://localhost:5984 admin mypassword

# Configurazione server remoto
node scripts/configure-couchdb-cors.cjs https://myserver.com:5984 admin mypassword
```

**Cosa fa**:
- ✅ Abilita CORS su CouchDB
- ✅ Configura origins permessi (`*` per tutti)
- ✅ Abilita credentials per autenticazione
- ✅ Imposta metodi HTTP corretti (GET, PUT, POST, HEAD, DELETE, OPTIONS)
- ✅ Configura headers necessari per PouchDB (incluso `x-requested-with`)
- ✅ Abilita CORS per cluster HTTP daemon (chttpd)

**Output**:
```
═══════════════════════════════════════════
  🔒 Configurazione CORS CouchDB
═══════════════════════════════════════════

📍 Server: http://localhost:5984
👤 Utente: admin

✅ Connesso a CouchDB
   Versione: 3.3.3

📝 Applicazione configurazioni CORS...

  ✅ Abilita CORS
  ✅ Origins permessi (tutti)
  ✅ Permetti credenziali
  ✅ Metodi HTTP permessi
  ✅ Headers richiesta permessi

═══════════════════════════════════════════
  ✅ CORS configurato con successo!
═══════════════════════════════════════════
```

**Nota**: Dopo aver eseguito lo script, potrebbe essere necessario riavviare CouchDB:
```bash
# Docker
docker-compose restart couchdb

# Installazione locale
sudo systemctl restart couchdb
```

---

### 🗄️ setup-couchdb.js

Crea automaticamente tutti i database necessari su CouchDB.

**Uso**:
```bash
node scripts/setup-couchdb.js <couchdb-url> [username] [password]
```

**Esempio**:
```bash
# Con autenticazione
node scripts/setup-couchdb.js http://localhost:5984 admin password

# Senza autenticazione (se non configurata)
node scripts/setup-couchdb.js http://localhost:5984
```

**Database creati**:
- `sphyra-customers` - Anagrafica clienti
- `sphyra-services` - Catalogo servizi
- `sphyra-staff` - Personale e operatori
- `sphyra-appointments` - Appuntamenti
- `sphyra-payments` - Pagamenti
- `sphyra-reminders` - Promemoria
- `sphyra-staff-roles` - Ruoli del personale
- `sphyra-service-categories` - Categorie servizi

---

## 🐛 Troubleshooting

### Errore: "URL non valido"

**Causa**: L'URL fornito non è nel formato corretto.

**Soluzione**: Usa il formato `http://host:port` o `https://host:port`

Esempi validi:
- `http://localhost:5984`
- `https://myserver.com:5984`
- `http://192.168.1.100:5984`

### Errore: "Connessione fallita" / "ECONNREFUSED"

**Causa**: CouchDB non è in esecuzione o non è raggiungibile.

**Soluzioni**:
1. Verifica che CouchDB sia in esecuzione:
   ```bash
   # Docker
   docker ps | grep couchdb

   # Locale
   sudo systemctl status couchdb
   ```

2. Verifica che l'URL sia corretto

3. Verifica che non ci siano firewall che bloccano la connessione

### Errore: "Autenticazione fallita" / 401

**Causa**: Username o password errati.

**Soluzioni**:
1. Verifica le credenziali
2. Per Docker, controlla `docker-compose.yml`:
   ```yaml
   environment:
     - COUCHDB_USER=admin
     - COUCHDB_PASSWORD=yourpassword
   ```

### Errore: "Accesso negato" / 403

**Causa**: L'utente non ha permessi sufficienti.

**Soluzione**: Usa un utente con ruolo admin.

---

## 📚 Documentazione Correlata

- [COUCHDB_SETUP.md](../COUCHDB_SETUP.md) - Guida completa configurazione CouchDB
- [README.md](../README.md) - Documentazione principale del progetto

---

## 🔧 Sviluppo

### Aggiungere un nuovo script

1. Crea il file nella directory `scripts/`
2. Usa estensione `.cjs` per CommonJS o `.mjs` per ES modules
3. Aggiungi shebang: `#!/usr/bin/env node`
4. Rendi eseguibile: `chmod +x scripts/your-script.cjs`
5. Documenta in questo README

### Convenzioni

- Usa funzioni asincrone per operazioni I/O
- Gestisci errori con try/catch
- Fornisci messaggi di errore chiari e utili
- Supporta `--help` per mostrare l'utilizzo
- Usa exit code 0 per successo, 1 per errore
- Colora l'output per migliorare la leggibilità

---

*Ultimo aggiornamento: Dicembre 2025*
