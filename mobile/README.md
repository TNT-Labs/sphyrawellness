# 📱 Sphyra SMS Reminder - Mobile App

**App mobile Android per l'invio automatico di SMS reminder sfruttando la SIM del telefono.**

## 📋 Descrizione

Questa app mobile consente di inviare SMS reminder ai clienti direttamente dalla SIM del telefono, bypassando i costi dei servizi SMS cloud (Twilio, ecc.) e avendo il controllo completo dell'invio.

### Caratteristiche Principali

- ✅ **Invio SMS Nativo**: Usa la SIM del telefono per inviare SMS
- ✅ **Sincronizzazione Automatica**: Background service che controlla e invia reminder periodicamente
- ✅ **GDPR Compliant**: Rispetta i consensi SMS dei clienti
- ✅ **Integrazione Backend**: Si sincronizza con il server Sphyra Wellness
- ✅ **Gestione Errori**: Traccia SMS inviati e falliti
- ✅ **Configurabile**: Intervallo di sincronizzazione personalizzabile

## 🏗️ Architettura

```
┌─────────────────────────────────┐
│   Sphyra Backend (Express)      │
│   - GET /reminders/mobile/pending│
│   - POST /reminders/mobile/mark-*│
└────────────┬────────────────────┘
             │ REST API
             ▼
┌─────────────────────────────────┐
│   Mobile App (React Native)     │
│   - Dashboard                   │
│   - Background Service          │
│   - SMS Service                 │
└────────────┬────────────────────┘
             │ Native SMS API
             ▼
┌─────────────────────────────────┐
│   SIM Card → SMS inviato        │
└─────────────────────────────────┘
```

## 🚀 Setup e Installazione

### Prerequisiti

- **Node.js** 18+
- **Android Studio** (per build)
- **Java JDK** 17+
- **Android Device** con SIM card

### 1. Installazione Dipendenze

```bash
cd mobile
npm install
```

> **ℹ️ Nota sui Warning npm**: Durante l'installazione vedrai alcuni warning su pacchetti deprecati (es. `sudo-prompt`, `inflight`, plugin Babel, ecc.). Questi sono **normali** e non impediscono il funzionamento dell'app, in quanto sono dipendenze transitive dei pacchetti React Native che vengono gestite automaticamente. L'app funzionerà correttamente nonostante questi warning.

### 2. Configurazione Android

Assicurati di avere Android SDK installato:

```bash
# Imposta ANDROID_HOME
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 3. Build APK di Debug

```bash
# Collega il telefono Android via USB con debug USB abilitato
npm run android
```

### 4. Build APK di Release

```bash
cd android
./gradlew assembleRelease

# APK sarà in: android/app/build/outputs/apk/release/app-release.apk
```

### 5. Installazione su Telefono

**Opzione A: Via USB**
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

**Opzione B: Trasferimento Manuale**
1. Copia `app-release.apk` sul telefono
2. Apri file manager e tocca l'APK
3. Consenti installazione da "Origini sconosciute"
4. Installa

## ⚙️ Configurazione App

### Primo Avvio

1. **Apri l'app** sul telefono
2. **Clicca "⚙️ Impostazioni API"**
3. **Inserisci l'URL del backend** Sphyra:

   **Opzione A - Rete Locale (solo Wi-Fi locale):**
   ```
   http://192.168.1.XXX:3001/api
   ```
   (Sostituisci XXX con l'IP del server)

   **Opzione B - HTTPS Pubblico (RACCOMANDATO - funziona ovunque!):**
   ```
   https://tuo-dominio.duckdns.org/api
   ```
   ⭐ **Configurazione HTTPS:** Vedi [HTTPS_SETUP.md](HTTPS_SETUP.md)

4. **Testa la connessione** con il pulsante "🔍 Testa Connessione"
5. **Salva** e torna alla schermata di login

### Login

1. Usa le stesse credenziali del backend Sphyra
   - Username: `admin`
   - Password: `admin123` (o quella configurata)

### Permessi SMS

Al primo utilizzo, l'app chiederà il permesso per inviare SMS:
- **Consenti sempre** per permettere l'invio automatico

## 📱 Utilizzo

### Dashboard

La dashboard mostra:
- **Numero di reminder pendenti**
- **Stato auto-sync** (ON/OFF)
- **Ultimo sync** (timestamp)
- **Lista reminder** da inviare

### Sincronizzazione Manuale

1. Clicca **"📤 Sincronizza Ora"**
2. L'app scaricherà i reminder pendenti dal server
3. Invierà gli SMS ai clienti con consenso
4. Aggiornerà lo stato sul server

### Auto-Sync (Background Service)

1. Clicca **"▶️ Avvia Auto-Sync"**
2. L'app creerà una notifica persistente
3. Ogni X minuti (configurabile) sincronizzerà automaticamente
4. Funziona anche con app chiusa

**Per fermare l'auto-sync:**
- Clicca **"⏸️ Ferma Auto-Sync"**

### Impostazioni

Configura:
- **URL API Server**: Indirizzo del backend
- **Intervallo Sync**: Minuti tra una sincronizzazione e l'altra (min 1, raccomandato 30)

## 🔧 API Backend Richieste

L'app mobile richiede i seguenti endpoint sul backend:

### GET `/api/reminders/mobile/pending`
Restituisce reminder pendenti con formato:
```json
[
  {
    "appointment": {
      "id": "uuid",
      "customer": {
        "firstName": "Mario",
        "lastName": "Rossi",
        "phone": "+393331234567",
        "smsReminderConsent": true
      },
      "service": { "name": "Massaggio" },
      "staff": { "firstName": "Anna", "lastName": "Bianchi" },
      "date": "2024-01-15",
      "startTime": "14:30"
    },
    "message": "Ciao Mario! Ti ricordiamo..."
  }
]
```

### POST `/api/reminders/mobile/mark-sent`
Marca un reminder come inviato:
```json
{
  "appointmentId": "uuid"
}
```

### POST `/api/reminders/mobile/mark-failed`
Marca un reminder come fallito:
```json
{
  "appointmentId": "uuid",
  "errorMessage": "Errore durante invio"
}
```

## 🔒 Sicurezza e Privacy

### GDPR Compliance
- ✅ Invia SMS **solo** a clienti con `smsReminderConsent: true`
- ✅ Traccia tutti gli invii nel database
- ✅ Gestisce errori senza esporre dati sensibili

### Autenticazione
- ✅ JWT token per ogni richiesta API
- ✅ Token salvato in AsyncStorage criptato
- ✅ Logout automatico se token scade

### Permessi Android
- `SEND_SMS`: Inviare SMS
- `INTERNET`: Comunicare con backend
- `FOREGROUND_SERVICE`: Background sync
- `WAKE_LOCK`: Mantenere CPU attiva per sync

## 🐛 Troubleshooting

### "Impossibile connettersi al server"
1. Verifica che il backend sia avviato
2. Controlla che telefono e server siano sulla stessa rete
3. Testa con browser: `http://IP-SERVER:3001/api/health`
4. Disabilita firewall temporaneamente
5. Verifica URL in Impostazioni

### "Permesso SMS non concesso"
1. Vai in Impostazioni Android → App → Sphyra SMS Reminder
2. Permessi → SMS → Consenti sempre

### "Auto-Sync non funziona"
1. Disabilita ottimizzazione batteria:
   - Impostazioni → Batteria → Ottimizzazione batteria
   - Trova "Sphyra SMS Reminder" → Non ottimizzare
2. Assicurati che l'app non sia in modalità risparmio energetico

### "SMS non vengono inviati"
1. Verifica credito SIM
2. Controlla copertura di rete
3. Verifica che il numero del cliente sia corretto (formato +39...)
4. Controlla logs in Dashboard

## 📦 Struttura Progetto

```
mobile/
├── src/
│   ├── services/           # Servizi principali
│   │   ├── apiClient.ts    # Client HTTP
│   │   ├── authService.ts  # Autenticazione
│   │   ├── smsService.ts   # Invio SMS nativo
│   │   ├── reminderService.ts  # Sincronizzazione
│   │   └── backgroundService.ts # Background service
│   ├── screens/            # Schermate UI
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── types/              # TypeScript types
│   ├── utils/              # Utilities
│   ├── config/             # Configurazione
│   └── App.tsx             # App principale
├── android/                # Progetto Android nativo
├── package.json
└── README.md
```

## 🔄 Aggiornamenti

Per aggiornare l'app:

1. Modifica il codice
2. Incrementa versione in `package.json`
3. Rebuilda APK: `cd android && ./gradlew assembleRelease`
4. Trasferisci nuovo APK sul telefono
5. Installa sovrascrivendo vecchia versione

## 📞 Supporto

Per problemi o domande:
- Controlla logs con `adb logcat`
- Verifica endpoint backend
- Consulta documentazione React Native

## 📄 Licenza

MIT License - Stesso del progetto principale Sphyra Wellness
