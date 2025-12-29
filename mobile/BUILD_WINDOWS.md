# 🪟 Build APK su Windows 10

## 🚀 Quick Start (Metodo Automatico)

1. **Apri Command Prompt** nella cartella `mobile`:
   ```cmd
   cd C:\dev\sphyrawellness\mobile
   ```

2. **Esegui lo script di build**:
   ```cmd
   build-apk.bat
   ```

3. **Aspetta il completamento** (3-10 minuti)

4. **Trova l'APK** in:
   ```
   C:\dev\sphyrawellness\mobile\android\app\build\outputs\apk\release\app-release.apk
   ```

## ✅ Prerequisiti

Lo script controllerà automaticamente la presenza di:

### 1. Node.js 18+
- **Download**: https://nodejs.org/
- **Verifica**: `node --version`

### 2. Java JDK 17+
- **Download**: https://adoptium.net/
- **Verifica**: `java -version`

### 3. Android SDK
- **Metodo A - Android Studio** (consigliato):
  1. Scarica [Android Studio](https://developer.android.com/studio)
  2. Durante installazione, seleziona "Android SDK"
  3. Imposta `ANDROID_HOME`:

- **Metodo B - Command Line Tools**:
  1. Scarica [Android Command Line Tools](https://developer.android.com/studio#command-tools)
  2. Estrai in `C:\Android\Sdk`
  3. Esegui SDK Manager per installare platform-tools

### Configurare ANDROID_HOME:
1. Apri **Pannello di Controllo** → **Sistema** → **Impostazioni avanzate di sistema**
2. Clicca **Variabili d'ambiente**
3. In "Variabili di sistema", clicca **Nuova**:
   - Nome: `ANDROID_HOME`
   - Valore: `C:\Users\TUO_UTENTE\AppData\Local\Android\Sdk`

   (Oppure il percorso dove hai installato Android SDK)

4. Aggiungi anche al **Path**:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`

5. **Riavvia Command Prompt** per applicare le modifiche

## 🔧 Cosa fa lo script `build-apk.bat`

1. ✅ Controlla che Node.js sia installato
2. ✅ Controlla che Java JDK sia installato
3. ✅ Controlla che Android SDK (ANDROID_HOME) sia configurato
4. 📦 Esegue `npm install` per installare dipendenze
5. 🏗️ Esegue `gradlew assembleRelease` per compilare l'APK
6. 📱 Mostra il percorso dell'APK finale
7. ❓ Chiede se aprire la cartella dell'APK

## 🐛 Troubleshooting

### Errore: "ANDROID_HOME non configurato"
Segui i passaggi sopra per configurare la variabile d'ambiente `ANDROID_HOME`.

### Errore: "Java JDK non trovato"
1. Scarica JDK 17 da https://adoptium.net/
2. Installa
3. Riavvia Command Prompt

### Errore: "gradlew: command not found" o problemi di permessi
1. Assicurati di essere nella cartella `mobile`
2. Esegui: `cd android && gradlew.bat clean`

### Build lenta o si blocca
- **Prima build**: richiede 5-10 minuti (scarica dipendenze)
- **Build successive**: 2-3 minuti
- Se si blocca: premi `Ctrl+C`, cancella `android\.gradle` e riprova

### Errore di memoria durante build
Crea/modifica `android\gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
```

## 📱 Installazione APK sul Telefono

### Opzione 1: Via USB con ADB
```cmd
adb install android\app\build\outputs\apk\release\app-release.apk
```

### Opzione 2: Trasferimento Manuale
1. Copia `app-release.apk` sul telefono (via USB, email, cloud)
2. Sul telefono, apri il file manager
3. Tocca `app-release.apk`
4. Abilita "Installa da origini sconosciute" se richiesto
5. Tocca "Installa"

## 🎯 Build Pulita (Clean Build)

Se hai problemi con la build, prova una build pulita:

```cmd
cd android
gradlew.bat clean
cd ..
build-apk.bat
```

## 📞 Supporto

Se incontri problemi, controlla:
- Log completo dello script
- `android\app\build\outputs\logs\`
- Documentazione React Native: https://reactnative.dev/docs/environment-setup

## ⚡ Comandi Utili

```cmd
# Build di debug (più veloce)
npm run android

# Solo installazione dipendenze
npm install

# Pulisci build precedenti
cd android && gradlew.bat clean && cd ..

# Verifica dispositivi connessi via USB
adb devices
```
