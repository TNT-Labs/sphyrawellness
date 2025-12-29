@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Sphyra SMS Reminder - APK Builder
echo ========================================
echo.

:: Controlla se siamo nella cartella mobile
if not exist "package.json" (
    echo [ERRORE] Devi eseguire questo script dalla cartella mobile/
    echo Esegui: cd C:\dev\sphyrawellness\mobile
    pause
    exit /b 1
)

:: Controlla Node.js
echo [1/5] Controllo Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRORE] Node.js non trovato! Installa Node.js 18+ da nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% trovato
echo.

:: Controlla Java JDK
echo [2/5] Controllo Java JDK...
where java >nul 2>&1
if errorlevel 1 (
    echo [ERRORE] Java JDK non trovato!
    echo Installa JDK 17 o 21 ^(LTS^) da adoptium.net
    echo React Native 0.73 supporta Java 17, 18, 19, 20 e 21
    pause
    exit /b 1
)
echo [OK] Java JDK trovato
echo.
echo Versione Java installata:
java -version 2>&1 | findstr /i "version"
echo.

:: Controlla Android SDK
echo [3/5] Controllo Android SDK...
if not defined ANDROID_HOME (
    echo [ERRORE] ANDROID_HOME non configurato!
    echo.
    echo Imposta ANDROID_HOME nelle variabili d'ambiente:
    echo 1. Cerca "Variabili d'ambiente" in Windows
    echo 2. Aggiungi variabile ANDROID_HOME
    echo 3. Valore: C:\Users\TUO_UTENTE\AppData\Local\Android\Sdk
    echo.
    pause
    exit /b 1
)
if not exist "%ANDROID_HOME%\platform-tools\adb.exe" (
    echo [ERRORE] Android SDK non trovato in %ANDROID_HOME%
    echo Verifica il percorso di Android SDK
    pause
    exit /b 1
)
echo [OK] Android SDK trovato in %ANDROID_HOME%
echo.

:: Installa dipendenze
echo [4/5] Installazione dipendenze npm...
echo Questo potrebbe richiedere qualche minuto...
echo.
npm install
if errorlevel 1 (
    echo [ERRORE] Installazione dipendenze fallita!
    pause
    exit /b 1
)
echo [OK] Dipendenze installate
echo.

:: Build APK
echo [5/5] Build APK di release...
echo Questo richiederà diversi minuti...
echo.
cd android
call gradlew.bat clean assembleRelease
if errorlevel 1 (
    echo.
    echo [ERRORE] Build fallita! Controlla gli errori sopra.
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo   BUILD COMPLETATA CON SUCCESSO!
echo ========================================
echo.
echo APK generato in:
echo %CD%\android\app\build\outputs\apk\release\app-release.apk
echo.
echo Dimensione file:
for %%A in ("android\app\build\outputs\apk\release\app-release.apk") do echo %%~zA bytes
echo.
echo ========================================
echo   PROSSIMI PASSI
echo ========================================
echo.
echo 1. Trasferisci l'APK sul telefono Android
echo 2. Abilita "Origini sconosciute" nelle impostazioni
echo 3. Installa l'APK toccandolo nel file manager
echo 4. Configura l'URL del backend nell'app
echo.
echo Per installare via USB:
echo adb install android\app\build\outputs\apk\release\app-release.apk
echo.

:: Chiedi se aprire la cartella
echo.
set /p OPEN_FOLDER="Vuoi aprire la cartella dell'APK? (S/N): "
if /i "%OPEN_FOLDER%"=="S" (
    explorer android\app\build\outputs\apk\release
)

echo.
echo Premi un tasto per uscire...
pause >nul
