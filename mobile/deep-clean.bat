@echo off
setlocal enabledelayedexpansion

echo ====================================================================
echo  PULIZIA PROFONDA - Come prima build (mantenendo patches)
echo ====================================================================
echo.

REM Backup patches se esiste
if exist patches (
    echo [BACKUP] Salvando cartella patches...
    if exist %TEMP%\patches-backup rmdir /s /q %TEMP%\patches-backup
    xcopy /E /I /Q patches %TEMP%\patches-backup >nul
    echo [OK] Patches salvati in %TEMP%\patches-backup
)

echo.
echo [DELETE] Rimuovendo node_modules...
if exist node_modules rmdir /s /q node_modules

echo [DELETE] Rimuovendo package-lock.json...
if exist package-lock.json del /q package-lock.json
if exist yarn.lock del /q yarn.lock

echo [DELETE] Rimuovendo cache React Native locale...
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo [DELETE] Rimuovendo build Android...
if exist android\.gradle rmdir /s /q android\.gradle
if exist android\build rmdir /s /q android\build
if exist android\app\build rmdir /s /q android\app\build

echo [DELETE] Rimuovendo .gradle locale...
if exist .gradle rmdir /s /q .gradle

REM Cache Gradle globale (Windows)
echo [DELETE] Rimuovendo cache Gradle globale...
if exist %USERPROFILE%\.gradle\caches rmdir /s /q %USERPROFILE%\.gradle\caches
if exist %USERPROFILE%\.gradle\wrapper rmdir /s /q %USERPROFILE%\.gradle\wrapper

REM Cache React Native globale (Windows)
echo [DELETE] Rimuovendo cache React Native globale...
if exist %LOCALAPPDATA%\Temp\metro-* (
    for /d %%i in ("%LOCALAPPDATA%\Temp\metro-*") do rmdir /s /q "%%i"
)
if exist %LOCALAPPDATA%\Temp\react-* (
    for /d %%i in ("%LOCALAPPDATA%\Temp\react-*") do rmdir /s /q "%%i"
)
if exist %LOCALAPPDATA%\Temp\haste-* (
    for /d %%i in ("%LOCALAPPDATA%\Temp\haste-*") do rmdir /s /q "%%i"
)

echo.
echo [NPM] Reinstallando node_modules...
REM Installa normalmente
call npm install --ignore-scripts
if errorlevel 1 (
    echo [ERROR] npm install fallito!
    pause
    exit /b 1
)

REM Ripristina patches
if exist %TEMP%\patches-backup (
    echo [RESTORE] Ripristino cartella patches...
    if exist patches rmdir /s /q patches
    xcopy /E /I /Q %TEMP%\patches-backup patches >nul
    rmdir /s /q %TEMP%\patches-backup
    echo [OK] Patches ripristinati
)

echo.
echo [PATCH] Tentativo di applicare patches...
echo [INFO] Se patch-package fallisce, il build funzionera' comunque.
echo [INFO] La patch e' solo un fix per Android 12+ (opzionale).
call npx patch-package 2>nul
if errorlevel 1 (
    echo [WARNING] patch-package non applicato - non e' un problema!
    echo [INFO] Il build APK funzionera' correttamente lo stesso.
) else (
    echo [OK] Patch applicato con successo!
)

echo.
echo ====================================================================
echo  PULIZIA COMPLETA TERMINATA!
echo ====================================================================
echo.
echo Stato finale:
dir /b | findstr /i "node_modules android patches"
echo.
echo Pronto per build APK! Esegui:
echo    cd android
echo    gradlew.bat assembleRelease
echo.
pause
