# 📱 Guida Setup Completa - Sphyra SMS Reminder Mobile

Guida passo-passo per configurare e utilizzare l'app mobile per l'invio di SMS reminder.

## 📋 Indice

1. [Requisiti](#requisiti)
2. [Setup Ambiente di Sviluppo](#setup-ambiente-di-sviluppo)
3. [Build e Installazione](#build-e-installazione)
4. [Configurazione Backend](#configurazione-backend)
5. [Configurazione App Mobile](#configurazione-app-mobile)
6. [Testing](#testing)
7. [Deployment Produzione](#deployment-produzione)

---

## 📌 Requisiti

### Hardware
- **Smartphone Android** con:
  - Android 8.0 (API 26) o superiore
  - SIM card attiva con piano SMS
  - Connessione Wi-Fi o dati mobili
  - Minimo 100MB spazio libero

### Software (per sviluppo)
- **Node.js** 18 o superiore
- **npm** 9 o superiore
- **Android Studio** (latest)
- **Java JDK** 17
- **Git**

### Network
- Smartphone e server backend sulla **stessa rete** (Wi-Fi locale)
- **Oppure**: Server esposto su internet con IP pubblico/dominio

---

## 🛠️ Setup Ambiente di Sviluppo

### 1. Installa Node.js

```bash
# Verifica versione
node --version  # Dovrebbe essere >= 18
npm --version   # Dovrebbe essere >= 9

# Se necessario, installa da https://nodejs.org
```

### 2. Installa Android Studio

1. Scarica da: https://developer.android.com/studio
2. Installa con le opzioni di default
3. Apri Android Studio → More Actions → SDK Manager
4. Installa:
   - Android SDK Platform 33 (Android 13)
   - Android SDK Build-Tools 33.x.x
   - Android Emulator (opzionale)

### 3. Configura Variabili Ambiente

**Linux/macOS** (`~/.bashrc` o `~/.zshrc`):
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

**Windows** (Variabili d'ambiente sistema):
```
ANDROID_HOME = C:\Users\TUO_NOME\AppData\Local\Android\Sdk
Path += %ANDROID_HOME%\platform-tools
Path += %ANDROID_HOME%\tools
```

Riavvia il terminale e verifica:
```bash
adb --version  # Dovrebbe mostrare Android Debug Bridge version
```

### 4. Clona e Installa Dipendenze

```bash
cd sphyrawellness/mobile
npm install
```

---

## 📦 Build e Installazione

### Opzione A: Build Debug (per sviluppo)

**1. Prepara il dispositivo Android:**
- Collega via USB
- Abilita "Debug USB" (vedi sotto)
- Autorizza il computer quando richiesto

**2. Build e installa:**
```bash
cd mobile
npm run android
```

L'app verrà compilata e installata automaticamente sul telefono.

### Opzione B: Build Release (per produzione)

**1. Genera APK firmato:**

```bash
cd mobile/android
./gradlew assembleRelease
```

**2. Trova APK:**
```
mobile/android/app/build/outputs/apk/release/app-release.apk
```

**3. Installa sul telefono:**

**Via USB:**
```bash
adb install app-release.apk
```

**Via trasferimento file:**
1. Copia `app-release.apk` sul telefono (via USB, email, Drive, ecc.)
2. Apri File Manager sul telefono
3. Tocca l'APK
4. Consenti "Installa da origini sconosciute" se richiesto
5. Tocca "Installa"

---

## 🔧 Configurazione Backend

### 1. Verifica Endpoint API

Assicurati che il backend Sphyra abbia i seguenti endpoint:

```typescript
// server/src/routes/reminders.ts

GET  /api/reminders/mobile/pending    // Lista reminder pendenti
POST /api/reminders/mobile/mark-sent  // Marca inviato
POST /api/reminders/mobile/mark-failed // Marca fallito
```

Questi endpoint sono già stati aggiunti nel file `server/src/routes/reminders.ts`.

### 2. Avvia Backend

```bash
cd server
npm run dev
```

Verifica che sia accessibile:
```bash
# Da terminale
curl http://localhost:3001/api/health

# Dovrebbe rispondere: {"status":"ok"}
```

### 3. Trova IP del Server

**Linux/macOS:**
```bash
ip addr show  # Cerca inet 192.168.x.x
# oppure
ifconfig | grep "inet "
```

**Windows:**
```cmd
ipconfig
# Cerca IPv4 Address: 192.168.x.x
```

Annota l'IP, es: `192.168.1.100`

---

## 📱 Configurazione App Mobile

### 1. Abilita Debug USB (Android)

1. Vai in **Impostazioni** → **Info sul telefono**
2. Tocca **Numero build** 7 volte (apparirà "Sei uno sviluppatore")
3. Torna in Impostazioni → **Opzioni sviluppatore**
4. Abilita **Debug USB**

### 2. Prima Configurazione App

**Apri l'app sul telefono:**

1. **Tocca "⚙️ Impostazioni API"**

2. **Inserisci URL API Server:**
   ```
   http://192.168.1.100:3001/api
   ```
   (Usa l'IP del tuo server!)

3. **Tocca "🔍 Testa Connessione"**
   - ✅ Se OK: "Connessione OK"
   - ❌ Se errore: verifica IP, firewall, rete

4. **Configura Intervallo Sync:**
   - Default: 30 minuti
   - Minimo: 1 minuto
   - Raccomandato: 30-60 minuti

5. **Tocca "💾 Salva Impostazioni"**

### 3. Login

1. Torna alla schermata login
2. Usa credenziali backend:
   - Username: `admin`
   - Password: `admin123` (o la tua)
3. Tocca "Accedi"

### 4. Concedi Permessi SMS

Quando richiesto:
1. **Consenti sempre** l'invio di SMS
2. **Importante**: Questo permesso è essenziale per l'app

---

## 🧪 Testing

### Test Manuale Completo

**1. Crea appuntamento di test sul backend:**

```bash
# Via web app Sphyra
1. Aggiungi cliente con numero telefono
2. Abilita consenso SMS per il cliente
3. Crea appuntamento per domani (o data configurata)
4. Verifica che reminder non sia già inviato
```

**2. Test sincronizzazione mobile:**

```bash
# Apri app mobile
1. Vai in Dashboard
2. Tocca "📤 Sincronizza Ora"
3. Verifica che appaia il reminder
4. Controlla che l'SMS venga inviato
5. Verifica che lo stato si aggiorni sul backend
```

**3. Verifica SMS ricevuto:**

```bash
# Sul telefono del cliente
1. Controlla inbox SMS
2. Verifica messaggio formato:
   "Ciao [Nome]! Ti ricordiamo il tuo appuntamento per [Servizio]..."
```

**4. Verifica backend:**

```bash
# Controlla che reminder sia marcato come inviato
1. Apri web app Sphyra
2. Vai in appuntamenti
3. Verifica flag "Reminder Sent"
4. Controlla tabella reminders nel database
```

### Test Auto-Sync

**1. Abilita auto-sync:**
```bash
# Nell'app mobile
1. Tocca "▶️ Avvia Auto-Sync"
2. Verifica notifica persistente
3. Attendi intervallo configurato (es. 30 min)
```

**2. Simula sync in background:**
```bash
# Chiudi l'app (swipe via)
# Crea nuovo appuntamento con reminder
# Attendi intervallo sync
# Verifica che SMS venga comunque inviato
```

### Test Errori

**Test numeri invalidi:**
```bash
# Crea cliente con numero errato: "123"
# Verifica che app gestisca errore
# Controlla che reminder sia marcato "failed"
```

**Test consenso mancante:**
```bash
# Crea cliente senza consenso SMS
# Verifica che SMS NON venga inviato (GDPR)
# Controlla logs
```

---

## 🚀 Deployment Produzione

### 1. Preparazione APK Produzione

**Configura keystore per firma APK:**

```bash
cd mobile/android/app

# Genera keystore
keytool -genkeypair -v -storetype PKCS12 \
  -keystore sphyra-release-key.keystore \
  -alias sphyra-key-alias \
  -keyalg RSA -keysize 2048 -validity 10000

# Inserisci password sicura e ricordala!
```

**Configura gradle.properties:**

```bash
# android/gradle.properties
SPHYRA_RELEASE_STORE_FILE=sphyra-release-key.keystore
SPHYRA_RELEASE_KEY_ALIAS=sphyra-key-alias
SPHYRA_RELEASE_STORE_PASSWORD=TUA_PASSWORD
SPHYRA_RELEASE_KEY_PASSWORD=TUA_PASSWORD
```

**Modifica build.gradle:**

```groovy
// android/app/build.gradle

android {
    signingConfigs {
        release {
            if (project.hasProperty('SPHYRA_RELEASE_STORE_FILE')) {
                storeFile file(SPHYRA_RELEASE_STORE_FILE)
                storePassword SPHYRA_RELEASE_STORE_PASSWORD
                keyAlias SPHYRA_RELEASE_KEY_ALIAS
                keyPassword SPHYRA_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 2. Build APK Firmato

```bash
cd mobile/android
./gradlew assembleRelease

# APK firmato in:
# app/build/outputs/apk/release/app-release.apk
```

### 3. Installazione in Produzione

**Via USB:**
```bash
adb install app/build/outputs/apk/release/app-release.apk
```

**Via Download:**
1. Carica APK su server web/cloud
2. Invia link al dispositivo
3. Scarica e installa

**Via MDM (gestione dispositivi):**
- Usa Google Workspace/Microsoft Intune per deploy enterprise

### 4. Configurazione Finale

**Dopo installazione:**

1. **Disabilita ottimizzazione batteria:**
   ```
   Impostazioni → Batteria → Ottimizzazione batteria
   → Trova "Sphyra SMS Reminder"
   → Seleziona "Non ottimizzare"
   ```

2. **Configura URL produzione:**
   ```
   # Se hai dominio pubblico
   https://tuo-dominio.com/api

   # Se hai IP pubblico
   http://IP-PUBBLICO:3001/api
   ```

3. **Avvia auto-sync**
4. **Testa invio**

---

## 🔒 Sicurezza Produzione

### Checklist Sicurezza

- [ ] Backend su HTTPS (non HTTP)
- [ ] JWT secret forte e casuale
- [ ] Firewall configurato (solo porte necessarie)
- [ ] APK firmato con keystore protetto
- [ ] Password keystore salvata in modo sicuro
- [ ] Credenziali admin cambiate da default
- [ ] Logs sensibili disabilitati
- [ ] Ottimizzazione batteria disabilitata per app
- [ ] Auto-start dell'app abilitato

---

## 🐛 Troubleshooting

### "Cannot connect to server"

**Possibili cause:**
1. Server non avviato
2. IP errato
3. Firewall blocca porta 3001
4. Smartphone su rete diversa

**Soluzioni:**
```bash
# 1. Verifica server
curl http://LOCALHOST:3001/api/health

# 2. Verifica IP
ping 192.168.1.100  # Dal telefono

# 3. Apri porta firewall
sudo ufw allow 3001  # Linux
# Windows: Pannello controllo → Firewall → Regola in entrata

# 4. Connetti stessa rete Wi-Fi
```

### "Permission denied: SEND_SMS"

```bash
# Vai in Impostazioni Android
Impostazioni → App → Sphyra SMS Reminder
→ Permessi → SMS → Consenti sempre
```

### "Background sync not working"

```bash
# 1. Disabilita ottimizzazione batteria
Impostazioni → Batteria → Ottimizzazione batteria
→ Tutte le app → Sphyra → Non ottimizzare

# 2. Abilita auto-start
Impostazioni → App → Sphyra → Auto-start → Abilita

# 3. Verifica notifica persistente presente
```

### "Build failed"

```bash
# 1. Pulisci build
cd mobile/android
./gradlew clean

# 2. Re-installa node_modules
cd ..
rm -rf node_modules
npm install

# 3. Ripeti build
./gradlew assembleRelease
```

---

## 📞 Supporto

Per problemi tecnici:

1. **Controlla logs Android:**
   ```bash
   adb logcat | grep -i sphyra
   ```

2. **Verifica backend logs:**
   ```bash
   cd server
   npm run dev  # Guarda output console
   ```

3. **Testa endpoint manualmente:**
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
     http://SERVER:3001/api/reminders/mobile/pending
   ```

---

## 📚 Risorse

- [Documentazione React Native](https://reactnative.dev/docs/getting-started)
- [Android Debug Bridge (adb)](https://developer.android.com/studio/command-line/adb)
- [React Native Permissions](https://github.com/zoontek/react-native-permissions)
- [Background Actions](https://github.com/Rapsssito/react-native-background-actions)

---

**Buon lavoro! 🚀**
