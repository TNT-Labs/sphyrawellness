# 🔧 Guida alla Configurazione CORS per CouchDB

## 📋 Problema

Se ricevi l'errore **"Failed to fetch"** quando tenti di connettere l'applicazione al server CouchDB, significa che CORS (Cross-Origin Resource Sharing) non è configurato correttamente sul server.

```
[STEP 3/7] ERRORE durante test connessione con fetch:
{"errorName":"TypeError","errorMessage":"Failed to fetch","errorType":"object"}
```

## ✅ Soluzione Automatica (Raccomandato)

### Metodo 1: Eseguire lo Script di Configurazione

L'applicazione include uno script automatico che configura tutti i parametri CORS necessari.

#### Prerequisiti

- Node.js installato sulla macchina da cui esegui lo script
- Accesso di rete al server CouchDB (http://192.168.1.93:5984)
- Credenziali di amministratore CouchDB

#### Passaggi

1. **Apri un terminale nella directory del progetto**

2. **Esegui lo script con i parametri del tuo server:**

```bash
node scripts/configure-couchdb-cors.cjs http://192.168.1.93:5984 admin <tua-password>
```

Sostituisci `<tua-password>` con la password effettiva dell'utente admin.

3. **Verifica l'output dello script:**

Se tutto va bene, vedrai:

```
═══════════════════════════════════════════
  ✅ CORS configurato con successo!
═══════════════════════════════════════════
```

4. **Riavvia CouchDB (se necessario):**

Alcune configurazioni potrebbero richiedere un riavvio di CouchDB:

```bash
# Se CouchDB è in Docker
docker restart <nome-container-couchdb>

# Se CouchDB è installato localmente
sudo systemctl restart couchdb
```

5. **Testa di nuovo la connessione dall'applicazione**

---

## 🛠️ Soluzione Manuale (Alternativa)

Se non puoi eseguire lo script Node.js, puoi configurare CORS manualmente tramite l'API di CouchDB.

### Configurazioni da Applicare

Esegui questi comandi `curl` dal terminale (o usa Postman):

#### 1. Abilita CORS

```bash
curl -X PUT http://admin:<password>@192.168.1.93:5984/_node/_local/_config/httpd/enable_cors \
  -d '"true"'
```

#### 2. Configura Origins

```bash
curl -X PUT http://admin:<password>@192.168.1.93:5984/_node/_local/_config/cors/origins \
  -d '"*"'
```

#### 3. Abilita Credenziali

```bash
curl -X PUT http://admin:<password>@192.168.1.93:5984/_node/_local/_config/cors/credentials \
  -d '"true"'
```

#### 4. Configura Metodi HTTP

```bash
curl -X PUT http://admin:<password>@192.168.1.93:5984/_node/_local/_config/cors/methods \
  -d '"GET, PUT, POST, HEAD, DELETE, OPTIONS"'
```

#### 5. Configura Headers

```bash
curl -X PUT http://admin:<password>@192.168.1.93:5984/_node/_local/_config/cors/headers \
  -d '"accept, authorization, content-type, origin, referer, x-requested-with"'
```

#### 6. (Opzionale) Abilita CORS per chttpd

```bash
curl -X PUT http://admin:<password>@192.168.1.93:5984/_node/_local/_config/chttpd/enable_cors \
  -d '"true"'
```

### Verifica Configurazione

Controlla che le configurazioni siano state applicate correttamente:

```bash
curl http://admin:<password>@192.168.1.93:5984/_node/_local/_config/cors
```

Dovresti vedere un output simile a questo:

```json
{
  "origins": "*",
  "credentials": "true",
  "methods": "GET, PUT, POST, HEAD, DELETE, OPTIONS",
  "headers": "accept, authorization, content-type, origin, referer, x-requested-with"
}
```

---

## 🔍 Verifica Finale

Dopo aver configurato CORS:

1. **Riavvia CouchDB** (se necessario)
2. **Apri l'applicazione Sphyra Wellness Lab**
3. **Vai su Impostazioni → Configurazione Server**
4. **Inserisci i dati di connessione:**
   - URL: `http://192.168.1.93:5984`
   - Username: `admin`
   - Password: `<tua-password>`
5. **Clicca su "Testa Connessione"**

Se CORS è configurato correttamente, dovresti vedere:

```
✅ Connessione riuscita!
```

---

## 🚨 Problemi Comuni e Soluzioni

### 1. "Failed to fetch" persiste dopo configurazione CORS

**Possibili cause:**

- **CouchDB non riavviato**: Alcune configurazioni richiedono un restart
  ```bash
  docker restart <container-couchdb>
  # oppure
  sudo systemctl restart couchdb
  ```

- **Firewall che blocca la connessione**: Verifica che la porta 5984 sia accessibile
  ```bash
  telnet 192.168.1.93 5984
  # oppure
  curl http://192.168.1.93:5984/
  ```

- **Browser che blocca Mixed Content**: Se l'app è servita via HTTPS ma CouchDB è HTTP, il browser potrebbe bloccare la richiesta. Soluzione: usa HTTPS anche per CouchDB oppure accedi all'app via HTTP in sviluppo.

### 2. Errore 401 Unauthorized

**Causa:** Credenziali errate

**Soluzione:** Verifica username e password

```bash
curl http://admin:<password>@192.168.1.93:5984/
```

### 3. Script CORS fallisce con "ECONNREFUSED"

**Causa:** CouchDB non è in esecuzione o non è raggiungibile

**Soluzione:**
1. Verifica che CouchDB sia attivo:
   ```bash
   docker ps | grep couchdb
   ```
2. Verifica la connettività di rete:
   ```bash
   ping 192.168.1.93
   curl http://192.168.1.93:5984/
   ```

### 4. Errore "Not found: _local"

**Causa:** Versione di CouchDB non supporta `_node/_local`

**Soluzione:** Usa la configurazione senza `_node/_local`:

```bash
curl -X PUT http://admin:<password>@192.168.1.93:5984/_config/httpd/enable_cors -d '"true"'
curl -X PUT http://admin:<password>@192.168.1.93:5984/_config/cors/origins -d '"*"'
# ... e così via per tutte le altre configurazioni
```

---

## 📚 Risorse Aggiuntive

- [Documentazione CORS CouchDB](https://docs.couchdb.org/en/stable/config/http.html#cross-origin-resource-sharing)
- [PouchDB e CORS](https://pouchdb.com/errors.html#no_access_control_allow_origin_header)

---

## 🔐 Note di Sicurezza

⚠️ **Attenzione:** La configurazione `origins: "*"` permette l'accesso da qualsiasi origine. Per un ambiente di produzione, considera di limitare gli origins a domini specifici:

```bash
curl -X PUT http://admin:<password>@192.168.1.93:5984/_node/_local/_config/cors/origins \
  -d '"https://tuodominio.com, https://app.tuodominio.com"'
```

---

## 📞 Supporto

Se hai ancora problemi dopo aver seguito questa guida:

1. Controlla i log di CouchDB per errori specifici
2. Verifica che tutte le configurazioni CORS siano state applicate correttamente
3. Assicurati che non ci siano firewall o proxy che interferiscono con la connessione
