# 📧 Guida Completa: Sistema di Reminder Email

Questa guida spiega come utilizzare il sistema di reminder email per gli appuntamenti di Sphyra Wellness.

## 📑 Indice

1. [Panoramica](#panoramica)
2. [Setup Iniziale](#setup-iniziale)
3. [Configurazione](#configurazione)
4. [Utilizzo](#utilizzo)
5. [Flusso Cliente](#flusso-cliente)
6. [FAQ](#faq)

---

## 🌟 Panoramica

Il sistema di reminder email invia automaticamente promemoria ai clienti il giorno prima dell'appuntamento. Le email contengono:

- **Dettagli dell'appuntamento** (data, ora, servizio, operatore)
- **Link di conferma** - Il cliente può confermare con un click
- **Design professionale** - Email responsive e accattivanti

### Funzionalità Principali

✅ **Invio Automatico** - Reminder inviati automaticamente all'orario configurato
✅ **Invio Manuale** - Possibilità di inviare reminder manualmente
✅ **Conferma con Click** - Link per confermare l'appuntamento
✅ **Cambio Stato** - L'appuntamento passa da "Programmato" a "Confermato"
✅ **Template Professionale** - Design curato e responsive
✅ **Configurazione Flessibile** - Imposta l'orario di invio nelle impostazioni

---

## 🚀 Setup Iniziale

### 1. Avvia il Server Backend

```bash
# Dalla root del progetto
cd server

# Installa dipendenze (solo la prima volta)
npm install

# Avvia il server in modalità sviluppo
npm run dev
```

Il server sarà disponibile su `http://localhost:3001`

### 2. Configura SendGrid

SendGrid è il servizio utilizzato per inviare le email. Segui questi passaggi:

#### A. Crea Account SendGrid (Gratuito)

1. Vai su [https://sendgrid.com](https://sendgrid.com)
2. Clicca su **Start for Free**
3. Compila il form di registrazione
4. Verifica la tua email

**Piano Gratuito:**
- ✅ 100 email/giorno
- ✅ Perfetto per testare
- ✅ Upgrade opzionale se serve

#### B. Genera API Key

1. Accedi a SendGrid Dashboard
2. Nel menu laterale: **Settings** → **API Keys**
3. Clicca **Create API Key**
4. Configura:
   - **Nome**: `sphyra-wellness-reminders`
   - **Permessi**: Seleziona **Full Access** oppure solo **Mail Send**
5. **Clicca Create & View**
6. **IMPORTANTE**: Copia subito la API Key! Non potrai vederla di nuovo

#### C. Verifica Mittente Email

Prima di poter inviare email, devi verificare un'identità mittente:

**Metodo Rapido: Single Sender Verification**

1. Nel menu: **Settings** → **Sender Authentication**
2. Clicca **Verify a Single Sender**
3. Compila il form:
   - **From Name**: `Sphyra Wellness`
   - **From Email Address**: La tua email (es. `noreply@tuoemail.com`)
   - **Reply To**: La tua email
   - **Company Address**: Indirizzo della tua attività
4. Clicca **Create**
5. Controlla la tua casella email e clicca sul link di verifica

✅ Ora puoi inviare email da questo indirizzo!

### 3. Configura File .env

Nel server, crea il file `.env`:

```bash
cd server
cp .env.example .env
```

Modifica `.env` con i tuoi dati:

```env
# Server
PORT=3001
NODE_ENV=development

# SendGrid - INSERISCI I TUOI DATI QUI
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxx  # API Key copiata
SENDGRID_FROM_EMAIL=noreply@tuaemail.com     # Email verificata
SENDGRID_FROM_NAME=Sphyra Wellness

# Frontend URL
FRONTEND_URL=http://localhost:5173

# CouchDB (usa questi valori di default)
COUCHDB_URL=http://localhost:5984
COUCHDB_USERNAME=admin
COUCHDB_PASSWORD=password

# Orario Invio Reminder (10:00 di default)
REMINDER_SEND_HOUR=10
REMINDER_SEND_MINUTE=0
```

### 4. Avvia il Frontend

In un nuovo terminale:

```bash
# Dalla root del progetto
npm run dev
```

Il frontend sarà su `http://localhost:5173`

---

## ⚙️ Configurazione

### Impostazioni Reminder (Frontend)

1. Apri Sphyra Wellness in browser: `http://localhost:5173`
2. Vai su **Impostazioni** (menu laterale)
3. Scorri fino alla sezione **"Impostazioni Reminder Email"**

![Stato Server]
- ✅ **Verde** = Server connesso, tutto OK
- ⚠️ **Giallo** = Server non disponibile, avvialo con `npm run dev`

#### Configurazioni Disponibili:

**1. Reminder Automatici** (Toggle)
- Attiva/Disattiva invio automatico giornaliero
- Quando attivo, il server controlla ogni minuto se è l'ora configurata

**2. Orario Invio**
- **Ora**: 0-23 (formato 24h)
- **Minuti**: 0-59
- **Esempio**: Ora=10, Minuti=30 → Invio alle 10:30

**3. Salva Impostazioni**
- Clicca **"Salva Impostazioni"** dopo le modifiche
- Le modifiche sono immediate

---

## 💼 Utilizzo

### Invio Automatico (Consigliato)

1. **Assicurati che:**
   - Server backend sia in esecuzione
   - Reminder automatici siano attivati nelle impostazioni
   - Orario sia configurato correttamente

2. **Il sistema fa tutto automaticamente:**
   - Ogni minuto, il server controlla l'orario
   - All'ora configurata, cerca appuntamenti per il giorno dopo
   - Invia email ai clienti con appuntamenti "Programmati"
   - Marca i reminder come inviati

3. **Logs:**
   Nel terminale del server vedrai:
   ```
   ⏰ Daily reminder time reached: 10:00
   📧 Starting to send daily reminders...
   ✅ Daily reminder job completed:
      - Total appointments: 5
      - Successfully sent: 5
      - Failed: 0
   ```

### Invio Manuale

Se vuoi inviare reminder manualmente:

1. Vai su **Reminder** (menu laterale)
2. Vedi la lista **"Appuntamenti entro 24 ore"**
3. Per ogni appuntamento:
   - **Invia Email** → Invia email a quel cliente
   - **SMS/WhatsApp** → Non ancora implementati

4. **Invia Tutti**: Clicca il pulsante in alto a destra per inviare tutti i reminder contemporaneamente

### Verifica Invio

Dopo l'invio (automatico o manuale):

1. **Nel Frontend**:
   - Vai su **Reminder**
   - La statistica "Reminder Inviati" si aggiorna
   - Gli appuntamenti scompaiono dalla sezione "entro 24 ore"

2. **Nel Database**:
   - Campo `reminderSent: true` nell'appuntamento
   - Nuovo record nella collezione `reminders`

3. **Casella Email Cliente**:
   - Il cliente riceve l'email
   - Controlla anche spam/junk se in test

---

## 👤 Flusso Cliente

Ecco cosa succede dal lato cliente:

### 1. Riceve Email

Il cliente riceve un'email con oggetto:
```
Promemoria Appuntamento - [Data]
```

L'email contiene:
- 📅 **Data**: "Lunedì 10 Dicembre 2025"
- 🕐 **Orario**: "10:30"
- ✨ **Servizio**: "Massaggio Rilassante"
- 👤 **Operatore**: "Mario Rossi"

### 2. Clicca sul Pulsante "Conferma Appuntamento"

Il pulsante è ben visibile, con design accattivante.

### 3. Viene Reindirizzato alla Pagina di Conferma

- **Se tutto OK** → Pagina verde con ✅ "Appuntamento Confermato!"
- **Se errore** → Pagina rossa con ❌ "Errore di Conferma"

### 4. L'Appuntamento Cambia Stato

Nel sistema:
- Prima: `status: "scheduled"` (Programmato)
- Dopo: `status: "confirmed"` (Confermato)

Puoi vedere lo stato nel **Calendario** → Click sull'appuntamento → Dropdown stato

---

## ❓ FAQ

### Come faccio a testare senza inviare a clienti reali?

**Opzione 1: Usa la tua email**
1. Crea un cliente di test con la TUA email
2. Crea un appuntamento per domani con quel cliente
3. Invia il reminder manualmente dalla pagina Reminder
4. Controlla la tua casella (anche spam)

**Opzione 2: Email di test**
Usa servizi come:
- [Mailtrap.io](https://mailtrap.io) - Cattura email senza inviarle
- [Mailinator.com](https://mailinator.com) - Caselle temporanee

### Le email vanno in spam, come risolvo?

Durante il testing è normale. Per produzione:

1. **Domain Authentication** in SendGrid
   - Settings → Sender Authentication
   - Autentica il tuo dominio
   - Configura DNS records (SPF, DKIM)

2. **Warm up dell'IP**
   - Inizia con pochi invii al giorno
   - Incrementa gradualmente

3. **Contenuto**
   - Evita parole spam ("gratis", "clicca qui")
   - Usa testo e HTML bilanciati

### Posso personalizzare il template email?

Sì! Modifica il file:
```
server/src/templates/reminderEmail.ts
```

Contiene due funzioni:
- `generateReminderEmailHTML()` - Versione HTML
- `generateReminderEmailText()` - Versione testo plain

### Come cambio l'orario di invio?

**Da Frontend:**
1. Impostazioni → Impostazioni Reminder Email
2. Modifica Ora e Minuti
3. Salva

**Da Backend (.env):**
```env
REMINDER_SEND_HOUR=14      # Ora 14
REMINDER_SEND_MINUTE=30    # 14:30
```

### Il server si ferma quando chiudo il terminale

Per far girare il server in background:

**Linux/Mac:**
```bash
npm run dev &
```

**Production:**
Usa un process manager come PM2:
```bash
npm install -g pm2
cd server
pm2 start dist/index.js --name sphyra-server
```

### Quante email posso inviare?

**SendGrid Free Tier:**
- 100 email/giorno
- Perfetto per piccoli studi (3-4 appuntamenti/giorno)

**Se serve di più:**
- **Essentials**: $19.95/mese → 40k email/mese
- **Pro**: $89.95/mese → 100k email/mese

### Come vedo se un reminder è stato inviato?

1. **Nel Calendario**:
   - Click sull'appuntamento
   - Vedi campo "Reminder Inviato: Sì/No"

2. **Nella Pagina Reminder**:
   - Statistica "Reminder Inviati" in alto
   - Gli appuntamenti con reminder inviato non appaiono in "entro 24 ore"

3. **Nel Database**:
   - Collezione `reminders` contiene tutti i reminder inviati
   - Appuntamenti hanno `reminderSent: true`

### Posso inviare reminder più giorni prima?

Attualmente il sistema invia reminder per appuntamenti del giorno dopo (24h prima).

Per modificare questo comportamento, edita:
```
server/src/services/reminderService.ts
```

Nella funzione `getAppointmentsNeedingReminders()`, cambia:
```typescript
const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
```

Con, ad esempio (2 giorni prima):
```typescript
const targetDate = format(addDays(new Date(), 2), 'yyyy-MM-dd');
```

### I clienti possono cancellare l'appuntamento dalla email?

Attualmente no, possono solo confermare. Per aggiungere la cancellazione:

1. Aggiungi un link "Cancella" nel template email
2. Crea un endpoint backend per cancellazione
3. Aggiungi una pagina frontend di conferma cancellazione

Questa feature può essere sviluppata in futuro!

### Cosa succede se il cliente clicca sul link due volte?

Il sistema gestisce questa situazione:
- Prima conferma: stato diventa "confirmed"
- Seconda conferma: vede messaggio "Appuntamento già confermato"
- Nessun errore o problema

---

## 🎉 Conclusione

Il sistema di reminder email è ora configurato e pronto all'uso!

**Checklist Finale:**
- ✅ Server backend in esecuzione
- ✅ SendGrid configurato con API key
- ✅ Email mittente verificata
- ✅ File .env configurato
- ✅ Impostazioni reminder configurate nel frontend
- ✅ Test inviato e ricevuto

**Prossimi Passi:**
1. Testa con alcuni appuntamenti reali
2. Verifica che le email arrivino
3. Chiedi ai clienti di testare la conferma
4. Monitora i logs del server
5. Passa in produzione quando sei pronto!

**Buon lavoro! 🚀**

Per supporto: controlla i logs del server e la documentazione SendGrid.
