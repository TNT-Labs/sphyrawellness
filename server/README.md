# Sphyra Wellness - Backend Server

Backend API server per il sistema di reminder email di Sphyra Wellness.

## 📋 Funzionalità

- ✉️ **Invio Email Reminder** - Invia reminder automatici via email ai clienti
- 🔗 **Conferma Appuntamenti** - Link nelle email per confermare gli appuntamenti
- ⏰ **Cron Job Automatico** - Controllo e invio automatico giornaliero
- ⚙️ **Configurazione Dinamica** - Impostazioni modificabili da frontend
- 🎨 **Template Email Professionale** - Email HTML responsive e accattivanti

## 🚀 Setup Rapido

### 1. Installazione Dipendenze

```bash
cd server
npm install
```

### 2. Configurazione Variabili Ambiente

Copia il file `.env.example` in `.env` e configura le variabili:

```bash
cp .env.example .env
```

Modifica `.env` con i tuoi dati:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@tuodominio.com
SENDGRID_FROM_NAME=Sphyra Wellness

# Frontend URL (per link email)
FRONTEND_URL=http://localhost:5173

# CouchDB Configuration
COUCHDB_URL=http://localhost:5984
COUCHDB_USERNAME=admin
COUCHDB_PASSWORD=password

# Reminder Configuration
REMINDER_SEND_HOUR=10
REMINDER_SEND_MINUTE=0
```

### 3. Avvio Server

**Modalità Sviluppo** (con hot-reload):
```bash
npm run dev
```

**Modalità Produzione**:
```bash
npm run build
npm start
```

Il server sarà disponibile su `http://localhost:3001`

## 📧 Configurazione SendGrid

### 1. Crea un Account SendGrid

1. Vai su [https://sendgrid.com](https://sendgrid.com)
2. Registrati per un account gratuito (100 email/giorno)
3. Verifica la tua email

### 2. Genera API Key

1. Accedi a SendGrid
2. Vai su **Settings** → **API Keys**
3. Clicca **Create API Key**
4. Nome: `sphyra-wellness-reminders`
5. Permessi: **Full Access** (o almeno **Mail Send**)
6. Copia la API Key generata

### 3. Verifica Sender Identity

Per inviare email, devi verificare un'identità mittente:

**Opzione A: Single Sender Verification** (più veloce)
1. Vai su **Settings** → **Sender Authentication**
2. Clicca **Verify a Single Sender**
3. Compila il form con i tuoi dati
4. Verifica l'email che riceverai

**Opzione B: Domain Authentication** (consigliata per produzione)
1. Vai su **Settings** → **Sender Authentication**
2. Clicca **Authenticate Your Domain**
3. Segui le istruzioni per configurare i DNS

### 4. Configura le Variabili Ambiente

Nel file `.env`:
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@tuodominio.com  # Deve essere verificato
SENDGRID_FROM_NAME=Sphyra Wellness
```

## 🗄️ Database

Il server si connette allo stesso database CouchDB del frontend. Assicurati che CouchDB sia in esecuzione:

```bash
# Se usi Docker:
docker run -d -p 5984:5984 --name couchdb \
  -e COUCHDB_USER=admin \
  -e COUCHDB_PASSWORD=password \
  apache/couchdb

# Oppure installa CouchDB localmente
```

## 🔌 API Endpoints

### Health Check
```
GET /health
```
Verifica lo stato del server.

### Reminder Endpoints

**Invia Reminder per Singolo Appuntamento**
```
POST /api/reminders/send/:appointmentId
```

**Invia Tutti i Reminder Dovuti**
```
POST /api/reminders/send-all
```

**Ottieni Appuntamenti che Necessitano Reminder**
```
GET /api/reminders/appointments-needing-reminders
```

### Appointment Endpoints

**Conferma Appuntamento (API)**
```
POST /api/appointments/:appointmentId/confirm
Body: { "token": "confirmation-token" }
```

**Conferma Appuntamento (Link Email)**
```
GET /api/appointments/:appointmentId/confirm/:token
```
Questo endpoint reindirizza al frontend con lo stato della conferma.

### Settings Endpoints

**Ottieni Impostazioni**
```
GET /api/settings
```

**Aggiorna Impostazioni**
```
PUT /api/settings
Body: {
  "reminderSendHour": 10,
  "reminderSendMinute": 0,
  "enableAutoReminders": true
}
```

## ⏰ Cron Job Automatico

Il server esegue un controllo ogni minuto per verificare se è l'orario configurato per l'invio dei reminder. Quando è l'ora giusta:

1. Cerca tutti gli appuntamenti programmati per il giorno successivo
2. Filtra quelli con status `scheduled` o `confirmed`
3. Esclude quelli con `reminderSent: true`
4. Invia email a ciascun cliente con link di conferma
5. Aggiorna lo stato dell'appuntamento

## 📧 Template Email

Le email inviate ai clienti contengono:

- 🎨 Design professionale e responsive
- 📅 Dettagli completi dell'appuntamento (data, ora, servizio, operatore)
- ✅ **Pulsante CTA** per confermare l'appuntamento
- 📱 Compatibilità mobile e desktop
- 🌈 Branding Sphyra Wellness

## 🧪 Test Manuale

### Test Invio Email Singolo

```bash
curl -X POST http://localhost:3001/api/reminders/send/:appointmentId
```

### Test Invio Tutti i Reminder

```bash
curl -X POST http://localhost:3001/api/reminders/send-all
```

### Test Trigger Manuale Cron

```bash
curl -X POST http://localhost:3001/api/trigger-reminders
```

## 🔧 Troubleshooting

### Email Non Inviate

1. **Verifica API Key**
   - Controlla che la SENDGRID_API_KEY sia corretta
   - Verifica i permessi (deve avere Mail Send)

2. **Verifica Sender Identity**
   - L'email mittente deve essere verificata in SendGrid
   - Controlla spam/junk nella tua casella

3. **Controlla Logs**
   - Il server stampa errori dettagliati nella console
   - SendGrid fornisce anche activity logs nel dashboard

### Server Non Si Connette al Database

1. Verifica che CouchDB sia in esecuzione (`curl http://localhost:5984`)
2. Controlla username e password in `.env`
3. Assicurati che i database siano stati creati (esegui `npm run setup-couchdb` dal frontend)

### Cron Job Non Funziona

1. Controlla l'orario configurato nelle impostazioni frontend
2. Verifica che `enableAutoReminders` sia `true`
3. Guarda i logs del server per confermare l'esecuzione

## 📦 Build per Produzione

```bash
# Build
npm run build

# Start
NODE_ENV=production npm start
```

Il codice compilato sarà in `dist/`

## 🔒 Sicurezza

- ✅ Le API key sono in `.env` (non committare!)
- ✅ Token di conferma univoci per ogni appuntamento
- ✅ CORS configurato per il frontend
- ⚠️ In produzione, aggiungi autenticazione agli endpoint sensibili
- ⚠️ Usa HTTPS in produzione

## 📝 Logs

Il server logga:
- ✅ Invio email riuscito
- ❌ Errori nell'invio
- ⏰ Esecuzione cron job
- 📊 Statistiche reminder inviati

## 🤝 Supporto

Per problemi o domande:
1. Controlla i logs del server
2. Verifica la configurazione SendGrid
3. Consulta la documentazione SendGrid: [docs.sendgrid.com](https://docs.sendgrid.com)
