# Risoluzione Problema "Server Backend Non Disponibile"

## Problema

Il frontend mostra il messaggio:
```
Server Backend Non Disponibile
Assicurati che il server backend sia avviato per utilizzare i reminder email.
```

## Causa

Il frontend non riesce a connettersi al server backend. Questo può accadere per due motivi principali:

### 1. URL del Backend Non Configurato (Più Comune)

Il frontend sta cercando il backend all'URL sbagliato perché la variabile d'ambiente `VITE_API_URL` non è configurata.

**Come verificare:**
- Controlla l'URL mostrato nel messaggio di errore sotto "URL cercato"
- Se vedi `http://localhost:3001/api` ma usi Docker/HTTPS, questo è il problema

**Soluzione:**

#### Se usi Docker con HTTPS (rete privata):

1. Copia il file di esempio nella root del progetto:
   ```bash
   # Windows PowerShell
   Copy-Item .env.private.example .env

   # Linux/Mac
   cp .env.private.example .env
   ```

2. Il file `.env` conterrà:
   ```env
   VITE_API_URL=https://sphyra.local/api
   ```

3. Riavvia il frontend:
   ```bash
   docker-compose down
   docker-compose -f docker-compose.https-private.yml up -d --build
   ```

#### Se usi sviluppo locale (senza Docker):

1. Crea un file `.env` nella root del progetto:
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

2. Riavvia il dev server:
   ```bash
   npm run dev
   ```

### 2. Server Backend Non Avviato

Il server backend non è effettivamente in esecuzione.

**Come verificare:**

Testa l'endpoint health del backend:

```bash
# Windows PowerShell (se usi HTTPS)
curl.exe https://sphyra.local/api/health

# Windows PowerShell (se usi localhost)
curl.exe http://localhost:3001/health

# Linux/Mac (se usi HTTPS)
curl https://sphyra.local/api/health

# Linux/Mac (se usi localhost)
curl http://localhost:3001/health
```

**Risposta attesa se il server funziona:**
```json
{"success":true,"data":{"status":"healthy","timestamp":"2025-12-12T18:47:29.831Z","uptime":5978.744}}
```

**Soluzioni:**

#### Se usi Docker:

```bash
# Verifica che i container siano in esecuzione
docker ps

# Riavvia i container se necessario
docker-compose down
docker-compose -f docker-compose.https-private.yml up -d
```

#### Se usi sviluppo locale:

1. Vai nella directory server:
   ```bash
   cd server
   ```

2. Configura le variabili d'ambiente (se non fatto):
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env

   # Linux/Mac
   cp .env.example .env
   ```

3. Installa le dipendenze (se non fatto):
   ```bash
   npm install
   ```

4. Avvia il server:
   ```bash
   npm run dev
   ```

5. Verifica che il server sia in ascolto:
   ```
   ✅ Sphyra Wellness Lab Server is running!
   📍 Server URL: http://localhost:3001
   🏥 Health check: http://localhost:3001/health
   ```

## Verifica Finale

Dopo aver applicato la soluzione:

1. Ricarica la pagina del frontend
2. Vai in **Impostazioni** → **Reminder Email**
3. Clicca sul pulsante **Ricarica** accanto allo stato del server
4. Dovresti vedere: **"Server Backend Connesso"** con sfondo verde

## Problemi Persistenti?

Se il problema persiste dopo aver seguito questi passaggi:

1. **Controlla i log del browser:**
   - Apri gli strumenti per sviluppatori (F12)
   - Vai nella tab "Console"
   - Cerca errori di rete o CORS

2. **Verifica CORS:**
   - Il server backend deve avere il frontend nell'elenco `ALLOWED_ORIGINS`
   - Controlla il file `server/.env` e verifica che contenga l'URL del frontend

3. **Verifica certificati HTTPS (se usi HTTPS):**
   - Assicurati che il certificato sia stato accettato dal browser
   - Visita `https://sphyra.local` e accetta il certificato se richiesto

## File di Riferimento

- `.env.example` - Configurazione per sviluppo locale
- `.env.private.example` - Configurazione per HTTPS con rete privata
- `.env.https.example` - Configurazione per HTTPS con dominio pubblico
- `server/.env.example` - Configurazione del server backend
