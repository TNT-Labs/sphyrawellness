# 🗄️ Guida Configurazione CouchDB - Sphyra Wellness

Guida completa per configurare CouchDB e abilitare la sincronizzazione multi-dispositivo nell'applicazione Sphyra Wellness.

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Opzioni di Installazione](#opzioni-di-installazione)
3. [Setup con Docker (Consigliato)](#setup-con-docker-consigliato)
4. [Setup Locale](#setup-locale)
5. [Setup Cloud (IBM Cloudant)](#setup-cloud-ibm-cloudant)
6. [Creazione Database](#creazione-database)
7. [Configurazione App](#configurazione-app)
8. [Verifica Funzionamento](#verifica-funzionamento)
9. [Troubleshooting](#troubleshooting)
10. [Sicurezza e Best Practices](#sicurezza-e-best-practices)

---

## 🎯 Panoramica

### Cos'è CouchDB?

**CouchDB** è un database NoSQL document-oriented che permette la sincronizzazione bidirezionale dei dati tra dispositivi. Sphyra Wellness lo usa per:

- ✅ **Sincronizzazione multi-dispositivo**: Accedi ai tuoi dati da qualsiasi dispositivo
- ✅ **Backup automatico**: I dati sono salvati su un server remoto
- ✅ **Lavoro offline**: Sincronizzazione automatica quando torni online
- ✅ **Collaborazione**: Più dispositivi possono lavorare contemporaneamente

### Database Necessari

L'applicazione richiede questi 8 database su CouchDB:

- `sphyra-customers` - Anagrafica clienti
- `sphyra-services` - Catalogo servizi
- `sphyra-staff` - Personale e operatori
- `sphyra-appointments` - Appuntamenti
- `sphyra-payments` - Pagamenti
- `sphyra-reminders` - Promemoria
- `sphyra-staff-roles` - Ruoli del personale
- `sphyra-service-categories` - Categorie servizi

---

## 🔧 Opzioni di Installazione

Scegli l'opzione più adatta alle tue esigenze:

| Opzione | Difficoltà | Costo | Quando usarla |
|---------|-----------|-------|---------------|
| **Docker** | ⭐ Facile | Gratuito | Sviluppo locale, server privato |
| **Locale** | ⭐⭐ Media | Gratuito | Server Linux dedicato |
| **Cloud** | ⭐ Facile | Gratuito/Pagamento | Produzione, multi-sede |

---

## 🐳 Setup con Docker (Consigliato)

### Prerequisiti

- **Docker** installato ([Scarica Docker](https://www.docker.com/get-started))
- **Docker Compose** (incluso con Docker Desktop)

### 1. Installa Docker

#### Windows/macOS
1. Scarica [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Installa e avvia Docker Desktop
3. Verifica installazione:
```bash
docker --version
docker-compose --version
```

#### Linux (Ubuntu/Debian)
```bash
# Installa Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Aggiungi utente al gruppo docker
sudo usermod -aG docker $USER
newgrp docker

# Verifica installazione
docker --version
```

### 2. Crea File Docker Compose

Crea un file `docker-compose.yml` nella directory del progetto (o in una cartella dedicata):

```yaml
version: '3.8'

services:
  couchdb:
    image: couchdb:3.3
    container_name: sphyra-couchdb
    environment:
      - COUCHDB_USER=admin
      - COUCHDB_PASSWORD=securepassword
    ports:
      - "5984:5984"
    volumes:
      - couchdb-data:/opt/couchdb/data
      - couchdb-config:/opt/couchdb/etc/local.d
    restart: unless-stopped

volumes:
  couchdb-data:
  couchdb-config:
```

**⚠️ IMPORTANTE**: Cambia `admin` e `securepassword` con credenziali sicure!

### 3. Avvia CouchDB

```bash
# Avvia il container
docker-compose up -d

# Verifica che sia in esecuzione
docker ps

# Verifica i log
docker-compose logs -f couchdb
```

### 4. Abilita CORS

CouchDB necessita CORS abilitato per accesso da browser. Puoi configurarlo automaticamente con lo script fornito o manualmente.

#### Opzione A: Script Automatico (Consigliato) ⭐

Usa lo script di configurazione CORS per configurare automaticamente tutti i parametri necessari:

```bash
# Con Docker
node scripts/configure-couchdb-cors.cjs http://localhost:5984 admin securepassword

# Con installazione locale
node scripts/configure-couchdb-cors.cjs http://localhost:5984 admin securepassword
```

Lo script configurerà automaticamente:
- ✅ CORS abilitato
- ✅ Origins permessi
- ✅ Credenziali abilitate
- ✅ Metodi HTTP corretti
- ✅ Headers necessari per PouchDB (incluso `x-requested-with`)

#### Opzione B: Configurazione Manuale

Se preferisci configurare manualmente:

```bash
# Abilita CORS
docker exec sphyra-couchdb curl -X PUT http://admin:securepassword@localhost:5984/_node/_local/_config/httpd/enable_cors -d '"true"'

docker exec sphyra-couchdb curl -X PUT http://admin:securepassword@localhost:5984/_node/_local/_config/cors/origins -d '"*"'

docker exec sphyra-couchdb curl -X PUT http://admin:securepassword@localhost:5984/_node/_local/_config/cors/credentials -d '"true"'

docker exec sphyra-couchdb curl -X PUT http://admin:securepassword@localhost:5984/_node/_local/_config/cors/methods -d '"GET, PUT, POST, HEAD, DELETE, OPTIONS"'

# IMPORTANTE: Includi x-requested-with per PouchDB
docker exec sphyra-couchdb curl -X PUT http://admin:securepassword@localhost:5984/_node/_local/_config/cors/headers -d '"accept, authorization, content-type, origin, referer, x-requested-with"'

# Per cluster HTTP daemon
docker exec sphyra-couchdb curl -X PUT http://admin:securepassword@localhost:5984/_node/_local/_config/chttpd/enable_cors -d '"true"'
```

### 5. Verifica Accesso

Apri il browser e vai su:
```
http://localhost:5984/_utils
```

Login con:
- **Username**: `admin`
- **Password**: `securepassword` (o quella che hai scelto)

### 6. Crea Database

**Opzione A - Script Automatico (Consigliato)**:
```bash
node scripts/setup-couchdb.js http://localhost:5984 admin securepassword
```

**Opzione B - Manuale via Fauxton**:
1. Vai su http://localhost:5984/_utils
2. Clicca "Create Database" per ciascun database:
   - `sphyra-customers`
   - `sphyra-services`
   - `sphyra-staff`
   - `sphyra-appointments`
   - `sphyra-payments`
   - `sphyra-reminders`
   - `sphyra-staff-roles`
   - `sphyra-service-categories`

### 7. Comandi Utili Docker

```bash
# Ferma CouchDB
docker-compose stop

# Riavvia CouchDB
docker-compose restart

# Ferma e rimuovi container (mantiene i dati)
docker-compose down

# Ferma e rimuovi TUTTO (⚠️ cancella i dati!)
docker-compose down -v

# Vedi logs in tempo reale
docker-compose logs -f

# Backup dei dati
docker exec sphyra-couchdb tar czf /tmp/backup.tar.gz /opt/couchdb/data
docker cp sphyra-couchdb:/tmp/backup.tar.gz ./couchdb-backup.tar.gz
```

---

## 💻 Setup Locale

### Prerequisiti

- Sistema Linux (Ubuntu, Debian, CentOS)
- Accesso root/sudo

### Ubuntu/Debian

#### 1. Aggiungi Repository CouchDB

```bash
# Installa dipendenze
sudo apt-get update
sudo apt-get install -y curl apt-transport-https gnupg

# Aggiungi chiave GPG
curl https://couchdb.apache.org/repo/keys.asc | gpg --dearmor | sudo tee /usr/share/keyrings/couchdb-archive-keyring.gpg >/dev/null 2>&1

# Aggiungi repository (Ubuntu 22.04)
echo "deb [signed-by=/usr/share/keyrings/couchdb-archive-keyring.gpg] https://apache.jfrog.io/artifactory/couchdb-deb/ jammy main" \
  | sudo tee /etc/apt/sources.list.d/couchdb.list >/dev/null
```

#### 2. Installa CouchDB

```bash
# Aggiorna repository
sudo apt-get update

# Installa CouchDB
sudo apt-get install -y couchdb

# Durante l'installazione:
# - Scegli "standalone"
# - Imposta indirizzo bind: 0.0.0.0 (per accesso remoto) o 127.0.0.1 (solo locale)
# - Imposta password admin
```

#### 3. Verifica Servizio

```bash
# Verifica status
sudo systemctl status couchdb

# Avvia servizio
sudo systemctl start couchdb

# Abilita all'avvio
sudo systemctl enable couchdb

# Testa connessione
curl http://localhost:5984
```

#### 4. Configura CORS

Modifica `/opt/couchdb/etc/local.ini`:

```bash
sudo nano /opt/couchdb/etc/local.ini
```

Aggiungi:
```ini
[httpd]
enable_cors = true

[cors]
origins = *
credentials = true
methods = GET, PUT, POST, HEAD, DELETE
headers = accept, authorization, content-type, origin, referer
```

Riavvia:
```bash
sudo systemctl restart couchdb
```

### CentOS/RHEL

```bash
# Aggiungi repository
sudo yum install -y epel-release
sudo yum install -y couchdb

# Avvia servizio
sudo systemctl start couchdb
sudo systemctl enable couchdb
```

---

## ☁️ Setup Cloud (IBM Cloudant)

### Opzione Gratuita

**IBM Cloudant** offre un piano gratuito compatibile con CouchDB.

#### 1. Crea Account

1. Vai su [IBM Cloud](https://cloud.ibm.com/registration)
2. Registrati gratuitamente
3. Verifica email

#### 2. Crea Istanza Cloudant

1. Login su [IBM Cloud Dashboard](https://cloud.ibm.com)
2. Clicca "Create resource"
3. Cerca "Cloudant"
4. Seleziona piano **Lite** (gratuito)
5. Configura:
   - **Nome**: `sphyra-wellness`
   - **Region**: Scegli quella più vicina
   - **Authentication**: IAM and legacy credentials
6. Clicca "Create"

#### 3. Ottieni Credenziali

1. Vai alla tua istanza Cloudant
2. Menu laterale > "Service credentials"
3. Clicca "New credential"
4. Nome: `sphyra-app`
5. Role: **Manager**
6. Clicca "Add"
7. Espandi credenziali e copia:
   - `url` (es: https://username.cloudantnosqldb.appdomain.cloud)
   - `username`
   - `password` o `apikey`

#### 4. Crea Database

**Opzione A - Via Dashboard**:
1. Dashboard Cloudant > "Databases"
2. Crea ciascun database manualmente

**Opzione B - Script Automatico**:
```bash
node scripts/setup-couchdb.js https://username.cloudantnosqldb.appdomain.cloud admin apikey
```

### Altre Opzioni Cloud

#### Couchbase Capella
- Managed CouchDB service
- Piano gratuito disponibile
- [couchbase.com/products/capella](https://www.couchbase.com/products/capella)

#### DigitalOcean
- Droplet con Docker
- $6/mese per VPS base
- [digitalocean.com](https://www.digitalocean.com)

---

## 📦 Creazione Database

### Metodo 1: Script Automatico (Consigliato)

Lo script `setup-couchdb.js` crea automaticamente tutti i database necessari.

#### Utilizzo

```bash
# Locale
node scripts/setup-couchdb.js http://localhost:5984 admin password

# Cloud (Cloudant)
node scripts/setup-couchdb.js https://username.cloudantnosqldb.appdomain.cloud admin apikey

# Senza autenticazione (se non configurata)
node scripts/setup-couchdb.js http://localhost:5984
```

#### Output Atteso

```
═══════════════════════════════════════════
  🗄️  CouchDB Setup - Sphyra Wellness
═══════════════════════════════════════════

📍 Server: http://localhost:5984
👤 Utente: admin

🔍 Verifico connessione a CouchDB...
✅ Connesso a CouchDB 3.3.3

📦 Creazione database...
  ✅ Database "sphyra-customers" creato
  ✅ Database "sphyra-services" creato
  ✅ Database "sphyra-staff" creato
  ...

📊 Riepilogo:
  ✅ Creati: 8
  ⚠️  Già esistenti: 0
  ❌ Errori: 0

═══════════════════════════════════════════
  ✅ Setup completato con successo!
═══════════════════════════════════════════
```

### Metodo 2: cURL (Manuale)

```bash
# Imposta variabili
COUCHDB_URL="http://localhost:5984"
USERNAME="admin"
PASSWORD="password"

# Crea ogni database
curl -X PUT "$COUCHDB_URL/sphyra-customers" -u "$USERNAME:$PASSWORD"
curl -X PUT "$COUCHDB_URL/sphyra-services" -u "$USERNAME:$PASSWORD"
curl -X PUT "$COUCHDB_URL/sphyra-staff" -u "$USERNAME:$PASSWORD"
curl -X PUT "$COUCHDB_URL/sphyra-appointments" -u "$USERNAME:$PASSWORD"
curl -X PUT "$COUCHDB_URL/sphyra-payments" -u "$USERNAME:$PASSWORD"
curl -X PUT "$COUCHDB_URL/sphyra-reminders" -u "$USERNAME:$PASSWORD"
curl -X PUT "$COUCHDB_URL/sphyra-staff-roles" -u "$USERNAME:$PASSWORD"
curl -X PUT "$COUCHDB_URL/sphyra-service-categories" -u "$USERNAME:$PASSWORD"
```

### Metodo 3: Interfaccia Fauxton

1. Apri `http://localhost:5984/_utils`
2. Login con le credenziali
3. Clicca "Create Database"
4. Inserisci nome database (es: `sphyra-customers`)
5. Clicca "Create"
6. Ripeti per tutti gli 8 database

---

## ⚙️ Configurazione App

### 1. Apri Impostazioni

Nell'app Sphyra Wellness:
1. Vai su **Impostazioni** (icona ingranaggio)
2. Scorri fino a "Sincronizzazione CouchDB"

### 2. Configura Server

Inserisci i dettagli del server:

#### Setup Locale (Docker)
- **URL Server**: `http://localhost:5984`
- **Username**: `admin`
- **Password**: `securepassword`

#### Setup Cloud (Cloudant)
- **URL Server**: `https://username.cloudantnosqldb.appdomain.cloud`
- **Username**: `admin` (o quello fornito)
- **Password**: `apikey` (o password fornita)

### 3. Testa Connessione

1. Clicca "Testa Connessione"
2. Verifica messaggio: ✅ "Connessione riuscita!"
3. Se fallisce, verifica:
   - URL corretto (con https:// o http://)
   - Credenziali corrette
   - CouchDB in esecuzione
   - Database creati

### 4. Salva e Abilita Sync

1. Clicca "Salva Configurazione"
2. Attiva l'interruttore "Abilita Sincronizzazione"
3. Verifica stato: ✅ "Sincronizzato"

### 5. Sincronizzazione Manuale (Opzionale)

- Clicca "Sincronizza Ora" per forzare una sincronizzazione immediata

---

## ✅ Verifica Funzionamento

### 1. Controlla Stato Sync nell'App

Nelle impostazioni, verifica:
- 🟢 Status: "Sincronizzato" o "Sincronizzazione in corso"
- ✅ Ultima sincronizzazione: data/ora recente
- ❌ Se "Errore", vedi sezione Troubleshooting

### 2. Verifica Database su CouchDB

#### Via Fauxton (Web UI)
1. Apri `http://localhost:5984/_utils`
2. Clicca su un database (es: `sphyra-customers`)
3. Verifica che contenga i documenti sincronizzati

#### Via cURL
```bash
# Lista tutti i database
curl http://admin:password@localhost:5984/_all_dbs

# Verifica documenti in un database
curl http://admin:password@localhost:5984/sphyra-customers/_all_docs
```

### 3. Test Multi-Dispositivo

1. **Dispositivo 1**: Aggiungi un cliente nell'app
2. **Dispositivo 2**: Apri l'app e verifica che il cliente appaia
3. Se non appare subito:
   - Attendi qualche secondo (sync in background)
   - Clicca "Sincronizza Ora"
   - Ricarica la pagina

---

## 🔧 Troubleshooting

### Errore: "Connessione fallita"

**Causa**: Server non raggiungibile

**Soluzioni**:
```bash
# Verifica che CouchDB sia in esecuzione
# Docker:
docker ps | grep couchdb

# Locale:
sudo systemctl status couchdb

# Test manuale
curl http://localhost:5984
```

### Errore: "Accesso negato" / 401 Unauthorized

**Causa**: Credenziali errate

**Soluzioni**:
- Verifica username e password
- Assicurati che l'utente abbia permessi di scrittura
- Per Docker: verifica `COUCHDB_USER` e `COUCHDB_PASSWORD` in `docker-compose.yml`

### Errore: "Database not found" / 404

**Causa**: Database non creati

**Soluzione**:
```bash
# Esegui lo script di setup
node scripts/setup-couchdb.js http://localhost:5984 admin password
```

### Errore CORS / "Failed to fetch"

**Causa**: CORS non abilitato o configurato in modo incompleto

**Sintomi**:
- Errore "Failed to fetch" nel browser
- Test di connessione fallisce nell'app
- Errori CORS nella console del browser (F12 > Console)

**📖 Guida Completa CORS**: Per istruzioni dettagliate e troubleshooting approfondito, consulta:
**[CONFIGURAZIONE-COUCHDB-CORS.md](CONFIGURAZIONE-COUCHDB-CORS.md)**

**Soluzione Automatica (Consigliato)** ⭐:
```bash
# Usa lo script di configurazione automatica
node scripts/configure-couchdb-cors.cjs http://192.168.1.93:5984 admin password

# Poi riavvia CouchDB
# Docker:
docker-compose restart couchdb

# Locale:
sudo systemctl restart couchdb
```

**Soluzione Manuale Docker**:
```bash
# Configurazione completa CORS
docker exec sphyra-couchdb curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/httpd/enable_cors -d '"true"'
docker exec sphyra-couchdb curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/origins -d '"*"'
docker exec sphyra-couchdb curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/credentials -d '"true"'
docker exec sphyra-couchdb curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/methods -d '"GET, PUT, POST, HEAD, DELETE, OPTIONS"'
docker exec sphyra-couchdb curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/headers -d '"accept, authorization, content-type, origin, referer, x-requested-with"'
docker exec sphyra-couchdb curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/chttpd/enable_cors -d '"true"'

# Riavvia
docker-compose restart couchdb
```

**Soluzione Manuale Locale**:
```bash
# Modifica config
sudo nano /opt/couchdb/etc/local.ini

# Aggiungi:
[httpd]
enable_cors = true

[cors]
origins = *
credentials = true
methods = GET, PUT, POST, HEAD, DELETE, OPTIONS
headers = accept, authorization, content-type, origin, referer, x-requested-with

[chttpd]
enable_cors = true

# Riavvia
sudo systemctl restart couchdb
```

**Verifica CORS funzionante**:
```bash
# Test con curl
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:5984

# Dovresti vedere headers CORS nella risposta
```

### Sincronizzazione Lenta

**Causa**: Molti dati o connessione lenta

**Soluzioni**:
- Usa "Sincronizza Ora" per forzare sync
- Verifica la velocità della connessione
- Per produzione, considera server più potente

### Database Pieno

**Causa**: Limite storage raggiunto (es: piano gratuito Cloudant)

**Soluzioni**:
- Esporta e pulisci dati vecchi
- Upgrade a piano a pagamento
- Usa server locale (spazio illimitato)

---

## 🔐 Sicurezza e Best Practices

### 1. Password Sicure

✅ **Fare**:
- Usa password complesse (min 16 caratteri)
- Includi maiuscole, minuscole, numeri, simboli
- Usa un password manager

❌ **Non fare**:
- Non usare password deboli (`admin`, `password123`)
- Non condividere password via email/chat
- Non committare password nel codice

### 2. HTTPS

⚠️ **IMPORTANTE**: In produzione, usa sempre HTTPS!

**Setup HTTPS con Let's Encrypt (Docker)**:
```yaml
# docker-compose.yml
services:
  couchdb:
    # ... configurazione esistente ...

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - couchdb
```

### 3. Backup Regolari

```bash
# Backup completo (Docker)
docker exec sphyra-couchdb \
  curl -X POST http://admin:password@localhost:5984/_replicate \
  -H "Content-Type: application/json" \
  -d '{"source":"sphyra-customers","target":"sphyra-customers-backup"}'

# Backup file (Docker)
docker exec sphyra-couchdb tar czf /tmp/backup.tar.gz /opt/couchdb/data
docker cp sphyra-couchdb:/tmp/backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz
```

### 4. Firewall

Limita accesso al server CouchDB:

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow from 192.168.1.0/24 to any port 5984
sudo ufw enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" port protocol="tcp" port="5984" accept'
sudo firewall-cmd --reload
```

### 5. Monitoraggio

```bash
# Verifica salute database
curl http://admin:password@localhost:5984/_up

# Statistiche
curl http://admin:password@localhost:5984/_node/_local/_stats

# Log attività (Docker)
docker-compose logs -f couchdb | grep -i error
```

### 6. Limitare Accesso Admin

Crea utenti con permessi limitati per l'app:

```bash
# Crea utente read/write (non admin)
curl -X PUT http://admin:password@localhost:5984/_users/org.couchdb.user:appuser \
  -H "Content-Type: application/json" \
  -d '{
    "name": "appuser",
    "password": "userpassword",
    "roles": [],
    "type": "user"
  }'

# Assegna permessi ai database
curl -X PUT http://admin:password@localhost:5984/sphyra-customers/_security \
  -H "Content-Type: application/json" \
  -d '{
    "admins": {"names": ["admin"], "roles": []},
    "members": {"names": ["appuser"], "roles": []}
  }'
```

---

## 📚 Risorse Utili

### Documentazione Ufficiale

- **CouchDB**: [https://docs.couchdb.org](https://docs.couchdb.org)
- **PouchDB**: [https://pouchdb.com/guides](https://pouchdb.com/guides)
- **Docker**: [https://docs.docker.com](https://docs.docker.com)
- **IBM Cloudant**: [https://cloud.ibm.com/docs/Cloudant](https://cloud.ibm.com/docs/Cloudant)

### Strumenti

- **Fauxton**: Web UI per CouchDB (inclusa)
- **PouchDB Inspector**: Chrome extension per debug
- **Postman**: Test API REST

### Community

- **Apache CouchDB Slack**: [https://couchdb.apache.org/community.html](https://couchdb.apache.org/community.html)
- **Stack Overflow**: Tag `couchdb`, `pouchdb`
- **GitHub Issues**: [https://github.com/apache/couchdb/issues](https://github.com/apache/couchdb/issues)

---

## 📞 Supporto

Per problemi specifici:

1. **Consulta** questa guida e la sezione Troubleshooting
2. **Verifica** i log di CouchDB per errori specifici
3. **Cerca** online l'errore su Stack Overflow
4. **Contatta** il supporto tecnico

---

## ✅ Checklist Setup Completato

Prima di usare la sincronizzazione in produzione:

- [ ] CouchDB installato e in esecuzione
- [ ] CORS abilitato
- [ ] Tutti gli 8 database creati
- [ ] Credenziali configurate (username/password sicuri)
- [ ] Connessione testata dall'app
- [ ] Sincronizzazione attivata e funzionante
- [ ] Test multi-dispositivo completato
- [ ] HTTPS configurato (produzione)
- [ ] Backup automatici configurati
- [ ] Firewall configurato
- [ ] Monitoraggio attivo

---

**Buon lavoro con CouchDB! 🚀**

*Ultimo aggiornamento: Dicembre 2025*
