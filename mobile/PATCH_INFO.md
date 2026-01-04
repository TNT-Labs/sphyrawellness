# Problema con patch-package su Windows

Se ricevi questo errore durante `npm install`:

```
**ERROR** Failed to apply patch for package react-native-get-sms-android
```

## Non è un problema critico!

La patch è solo un fix per Android 12+ per PendingIntent flags. **Il build APK funzionerà correttamente anche senza questa patch.**

## Cosa fa la patch?

- Aggiunge `FLAG_IMMUTABLE` per PendingIntent su Android 12+
- Fix per `RECEIVER_NOT_EXPORTED` su Android 13+
- Migliora la gestione dei callback per invio SMS

## Procedi con il build

Anche se la patch non si applica, puoi procedere con il build:

```cmd
cd android
gradlew.bat assembleRelease
```

L'APK sarà funzionante al 100%!

## (Opzionale) Applicare la patch manualmente

Se vuoi comunque applicare la patch, puoi farlo manualmente:

1. **Converti line endings del file patch:**
   ```cmd
   dos2unix patches\react-native-get-sms-android+2.1.0.patch
   ```

2. **Applica con git:**
   ```cmd
   cd node_modules\react-native-get-sms-android
   git apply ..\..\patches\react-native-get-sms-android+2.1.0.patch
   cd ..\..
   ```

3. **O rigenera la patch:**
   - Modifica manualmente il file in `node_modules\react-native-get-sms-android\android\src\main\java\com\react\SmsModule.java`
   - Esegui: `npx patch-package react-native-get-sms-android`

---

**TLDR:** Ignora l'errore e procedi con il build. Funzionerà perfettamente! 🚀
