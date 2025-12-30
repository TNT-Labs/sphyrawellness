# 🔐 Release Keystore - Sphyra SMS Reminder

## 📋 Informazioni sul Keystore

Il keystore `sphyra-release.keystore` è stato creato per firmare le release ufficiali dell'app Sphyra SMS Reminder.

### Dettagli Certificato:
- **File**: `sphyra-release.keystore`
- **Alias**: `sphyra-key`
- **Tipo**: PKCS12
- **Algoritmo**: RSA 2048-bit
- **Validità**: 10,000 giorni (~27 anni)
- **Soggetto**: CN=Sphyra Wellness, OU=Mobile Development, O=Sphyra, L=Italy, ST=Italy, C=IT

## 🔑 Credenziali

Le credenziali del keystore sono memorizzate nel file `keystore.properties`.

**Password attuale:**
```
Store Password: Sphyra2025!Wellness
Key Password: Sphyra2025!Wellness
```

⚠️ **IMPORTANTE**:
- NON condividere queste credenziali pubblicamente
- NON commitare `keystore.properties` su Git (è già in .gitignore)
- NON condividere il file `sphyra-release.keystore` (è già in .gitignore)
- **CONSERVA UNA COPIA SICURA** del keystore in un luogo sicuro (cloud privato, USB criptato)

## 📱 Come Usare

### Build Release con Keystore:

```bash
cd mobile
build-apk.bat
```

oppure manualmente:

```bash
cd android
gradlew assembleRelease
```

L'APK firmato sarà in:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Verificare la Firma:

```bash
keytool -list -v -keystore sphyra-release.keystore -alias sphyra-key
```

## 🔄 Cambiare Password (se necessario)

```bash
# Cambiare store password
keytool -storepasswd -keystore sphyra-release.keystore

# Cambiare key password
keytool -keypasswd -alias sphyra-key -keystore sphyra-release.keystore
```

Dopo aver cambiato le password, aggiorna `keystore.properties`.

## 💾 Backup del Keystore

**FONDAMENTALE**: Se perdi il keystore, non potrai più aggiornare l'app sul Play Store!

### Backup consigliati:
1. **Cloud privato** (Google Drive, OneDrive, Dropbox - cartella privata)
2. **USB criptato** (con backup in luogo sicuro)
3. **Password manager** (per le credenziali)

### Come fare backup:

```bash
# Copia il keystore
cp sphyra-release.keystore ~/backup/sphyra-release-BACKUP-$(date +%Y%m%d).keystore

# Copia le credenziali
cp keystore.properties ~/backup/keystore-BACKUP-$(date +%Y%m%d).properties
```

## 🚀 Deploy su Play Store

Quando sei pronto per pubblicare su Google Play Store:

1. Build release APK: `build-apk.bat`
2. L'APK sarà firmato automaticamente con il release keystore
3. Carica l'APK sulla Google Play Console
4. Google riconoscerà la firma e non mostrerà avvisi di sicurezza

## 🆚 Debug vs Release

- **Debug keystore** (`debug.keystore`): Per sviluppo e test
- **Release keystore** (`sphyra-release.keystore`): Per produzione e Play Store

Il build script usa automaticamente:
- Debug keystore per `assembleDebug`
- Release keystore per `assembleRelease`

## 📞 Supporto

Se hai problemi con il keystore o la firma:
1. Verifica che `keystore.properties` esista e contenga le password corrette
2. Verifica che `sphyra-release.keystore` esista nella cartella `android/app/`
3. Verifica che le password in `keystore.properties` siano corrette
4. In caso di dubbi, usa il backup del keystore

## ⚠️ Note di Sicurezza

- ✅ Il keystore è escluso da Git (in .gitignore)
- ✅ Le credenziali sono escluse da Git (in .gitignore)
- ✅ Il template `keystore.properties.template` è committato (senza password)
- ❌ NEVER commit the actual keystore or keystore.properties!
- ❌ NEVER share the keystore publicly!
- ❌ NEVER lose the keystore (fai backup multipli)!
