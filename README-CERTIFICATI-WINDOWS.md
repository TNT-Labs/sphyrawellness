# 🔒 Generazione Certificati SSL su Windows

Questa guida spiega come generare certificati SSL self-signed su Windows PowerShell.

## 📋 Prerequisiti

### 1. OpenSSL per Windows

Lo script richiede OpenSSL. Scegli una delle seguenti opzioni:

**Opzione A: OpenSSL standalone**
- Scarica da: https://slproweb.com/products/Win32OpenSSL.html
- Installa la versione "Win64 OpenSSL v3.x.x" (Full, non Light)
- Durante l'installazione, seleziona "Copy OpenSSL DLLs to the Windows system directory"

**Opzione B: Chocolatey (consigliato)**
```powershell
# Installa Chocolatey se non l'hai già (esegui come Amministratore)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Installa OpenSSL
choco install openssl
```

**Opzione C: Git Bash (se hai Git for Windows)**
```bash
# Usa lo script bash originale in Git Bash
chmod +x generate-self-signed-cert.sh
./generate-self-signed-cert.sh
```

## 🚀 Esecuzione dello Script

### 1. Apri PowerShell

Apri PowerShell nella directory del progetto:
- Premi `Win + X`
- Seleziona "Windows PowerShell" o "Terminal"
- Naviga nella directory del progetto: `cd C:\path\to\sphyrawellness`

### 2. Configura Policy di Esecuzione (se necessario)

Se ricevi un errore relativo alla policy di esecuzione:

```powershell
# Controlla la policy attuale
Get-ExecutionPolicy

# Se è "Restricted", cambiala temporaneamente
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

### 3. Esegui lo Script

```powershell
.\generate-self-signed-cert.ps1
```

## ✅ Verifica Installazione

Dopo l'esecuzione, lo script creerà i seguenti file in `traefik/certs/`:
- `sphyra.key` - Chiave privata
- `sphyra.crt` - Certificato pubblico
- `sphyra.csr` - Certificate Signing Request
- `openssl.cnf` - File di configurazione OpenSSL

## 🔐 Installazione Certificato nel Sistema

### Metodo 1: Durante l'esecuzione dello script
Lo script ti chiederà se vuoi installare il certificato. Rispondi `S` (Sì).

**NOTA:** Devi eseguire PowerShell come **Amministratore** per questa opzione.

### Metodo 2: Manuale tramite PowerShell
```powershell
# Apri PowerShell come Amministratore
Import-Certificate -FilePath ".\traefik\certs\sphyra.crt" -CertStoreLocation Cert:\LocalMachine\Root
```

### Metodo 3: Manuale tramite GUI Windows
1. Fai doppio clic su `traefik\certs\sphyra.crt`
2. Clicca "Installa certificato..."
3. Seleziona "Computer locale"
4. Seleziona "Colloca tutti i certificati nel seguente archivio"
5. Clicca "Sfoglia" → "Autorità di certificazione radice attendibili"
6. Clicca "Avanti" → "Fine"

## 🌐 Importazione nei Browser

### Chrome / Edge (Windows)
I browser basati su Chromium usano il certificato store di Windows, quindi se hai installato il certificato nel sistema (Metodo 1, 2 o 3 sopra), funzionerà automaticamente.

Altrimenti:
1. Apri `chrome://settings/certificates` o `edge://settings/privacy`
2. Tab "Autorità di certificazione radice attendibili"
3. Clicca "Importa"
4. Seleziona `traefik\certs\sphyra.crt`
5. Spunta "Considera attendibile il certificato per identificare i siti web"

### Firefox
Firefox usa il proprio certificate store:
1. Apri `about:preferences#privacy`
2. Scroll → "Certificati" → "Visualizza certificati"
3. Tab "Autorità"
4. Clicca "Importa"
5. Seleziona `traefik\certs\sphyra.crt`
6. Spunta "Considera attendibile questa CA per identificare i siti web"

## 🔧 Risoluzione Problemi

### Errore: "OpenSSL non trovato"
- Verifica che OpenSSL sia installato: `openssl version`
- Se non installato, segui i prerequisiti sopra
- Se installato ma non riconosciuto, aggiungi OpenSSL al PATH:
  1. Cerca "Variabili d'ambiente" in Windows
  2. Modifica la variabile PATH
  3. Aggiungi il percorso di installazione OpenSSL (es. `C:\Program Files\OpenSSL-Win64\bin`)

### Errore: "Impossibile eseguire script"
- Esegui: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process`
- Oppure esegui come Amministratore

### Il browser mostra ancora un warning
- Verifica che il certificato sia stato importato correttamente
- Riavvia il browser
- Svuota la cache del browser
- Controlla che il dominio in `.env` corrisponda all'URL che stai visitando

## 📚 Riferimenti

- [OpenSSL per Windows](https://slproweb.com/products/Win32OpenSSL.html)
- [Chocolatey Package Manager](https://chocolatey.org/)
- [PowerShell Execution Policy](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies)

## 🆘 Aiuto

Se incontri problemi, apri una issue su GitHub o contatta il team di sviluppo.
