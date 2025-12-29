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

> **💡 Perché Java 21?**
> Java 21 è l'ultima versione **LTS (Long Term Support)** rilasciata a settembre 2023. È completamente supportata da React Native 0.73 e Gradle 8+, offre migliori prestazioni e riceve aggiornamenti di sicurezza a lungo termine. Se stai installando Java per la prima volta, scegli la versione 21!

### 1. Node.js 18+
- **Download**: https://nodejs.org/
- **Verifica**: `node --version`

### 2. Java JDK 17+ (consigliato JDK 21 LTS)
- **Download**: https://adoptium.net/ (Temurin)
- **Versioni supportate**: Java 17, 18, 19, 20, 21
- **Consigliata**: Java 21 (LTS - Long Term Support)
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
1. Scarica JDK 21 LTS da https://adoptium.net/ (raccomandato)
   - Oppure JDK 17 LTS (versione minima)
2. Durante l'installazione, seleziona "Add to PATH"
3. Riavvia Command Prompt
4. Verifica: `java -version` (dovrebbe mostrare versione 17-21)

### Errore: "JAVA_HOME is set to an invalid directory"

Questo è un **errore molto comune**! JAVA_HOME deve puntare alla directory root del JDK, **non** alla sottocartella `bin`.

**Esempio di errore:**
```
ERROR: JAVA_HOME is set to an invalid directory: C:\Program Files\Java\jdk-21\bin
```

**Come correggere:**

1. Premi `Win + R` e digita: `sysdm.cpl`
2. Clicca su **"Avanzate"** → **"Variabili d'ambiente"**
3. In **"Variabili di sistema"**, trova `JAVA_HOME`
4. Clicca **Modifica** e correggi il valore:
   - ❌ **ERRATO**: `C:\Program Files\Java\jdk-21\bin`
   - ✅ **CORRETTO**: `C:\Program Files\Java\jdk-21`
5. Verifica che nella variabile `Path` ci sia: `%JAVA_HOME%\bin`
6. Clicca **OK** su tutte le finestre
7. **Riavvia Command Prompt** (importante!)
8. Verifica: `echo %JAVA_HOME%` (non deve terminare con \bin)

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
