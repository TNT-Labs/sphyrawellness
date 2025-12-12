# 🔒 HTTPS in Rete Privata - Guida Completa

Guida per deploy HTTPS con **certificati self-signed** in **rete privata** (LAN, VPN, network interno).

---

## 📋 Indice

1. [Quando Usare Self-Signed](#quando-usare-self-signed)
2. [Opzioni per Reti Private](#opzioni-per-reti-private)
3. [Setup Completo](#setup-completo)
4. [Configurazione DNS/Hosts](#configurazione-dnshosts)
5. [Generazione Certificati](#generazione-certificati)
6. [Deploy](#deploy)
7. [Importazione Certificati Browser](#importazione-certificati-browser)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Quando Usare Self-Signed

Usa certificati **self-signed** quando:

✅ **Rete privata/LAN** (non accessibile da internet)
✅ **Ambiente di sviluppo/staging**
✅ **VPN aziendale**
✅ **Network interno** senza dominio pubblico
✅ **Testing locale** con HTTPS

⛔ **NON usare per**:
- Applicazioni pubbliche su internet
- Production con utenti esterni
- E-commerce o applicazioni critiche

---

## 🛠️ Opzioni per Reti Private

### **1. Self-Signed Certificates (Consigliata)**

**Pro:**
- ✅ Gratuito e immediato
- ✅ Funziona offline
- ✅ Nessuna dipendenza esterna
- ✅ Controllo completo

**Contro:**
- ⚠️ Warning browser (risolvibile importando certificato)
- ⚠️ Non valido per internet pubblico

**Quando usare:** Sviluppo, staging, reti interne

---

### **2. mDNS (.local domain)**

Usa **Avahi** (Linux) o **Bonjour** (Mac/Windows) per risolvere `.local`

```bash
# Esempio
https://sphyra.local
```

**Pro:**
- ✅ Zero configurazione DNS
- ✅ Funziona automaticamente in LAN

**Contro:**
- ⚠️ Solo dispositivi che supportano mDNS
- ⚠️ Non funziona su alcune reti aziendali

---

### **3. Private Certificate Authority (CA)**

Crea una CA interna per la tua organizzazione.

**Pro:**
- ✅ Certificati "trusted" una volta importata la CA
- ✅ Professionale per grandi organizzazioni

**Contro:**
- ⚠️ Setup più complesso
- ⚠️ Richiede gestione CA

**Quando usare:** Aziende con molti servizi interni

---

### **4. Let's Encrypt + DNS Challenge**

Usa Let's Encrypt con **DNS-01 challenge** (senza esporre il server).

**Pro:**
- ✅ Certificati validi pubblicamente
- ✅ Nessun warning browser

**Contro:**
- ⚠️ Richiede controllo DNS pubblico
- ⚠️ Server deve risolvere da internet (anche se non raggiungibile)

---

## 🚀 Setup Completo (Self-Signed)

### Step 1: File Necessari

File creati:
- ✅ `docker-compose.https-private.yml` - Compose per rete privata
- ✅ `traefik/traefik-private.yml` - Config Traefik (no Let's Encrypt)
- ✅ `traefik/dynamic/certificates-private.yml` - Config certificati
- ✅ `.env.private.example` - Template environment
- ✅ `generate-self-signed-cert.sh` - Script generazione certificati

### Step 2: Configurazione

```bash
# 1. Copia template environment
cp .env.private.example .env

# 2. Modifica dominio privato
nano .env
```

**Opzioni per `PRIVATE_DOMAIN`:**

```bash
# Opzione A: Nome .local (mDNS)
PRIVATE_DOMAIN=sphyra.local

# Opzione B: IP diretto
PRIVATE_DOMAIN=192.168.1.100

# Opzione C: Nome custom (richiede configurazione /etc/hosts)
PRIVATE_DOMAIN=sphyra.internal
```

---

## 🌐 Configurazione DNS/Hosts

### **Opzione A: mDNS (.local)**

**Linux (Avahi):**
```bash
# Installa Avahi
sudo apt install avahi-daemon avahi-utils

# Verifica
avahi-browse -a
```

**macOS:** Bonjour integrato (già funzionante)

**Windows:** Installa [Bonjour Print Services](https://support.apple.com/kb/DL999)

---

### **Opzione B: File /etc/hosts**

Aggiungi il dominio manualmente su **ogni dispositivo** della rete.

**Linux/macOS:**
```bash
# Modifica /etc/hosts
sudo nano /etc/hosts

# Aggiungi (sostituisci IP_SERVER con l'IP del tuo server)
192.168.1.100   sphyra.local
192.168.1.100   traefik.sphyra.local
```

**Windows:**
```powershell
# Apri come Administrator
notepad C:\Windows\System32\drivers\etc\hosts

# Aggiungi
192.168.1.100   sphyra.local
192.168.1.100   traefik.sphyra.local
```

**Mobile (iOS/Android):**
- iOS: Richiede jailbreak o app terze
- Android: Richiede root o app DNS locale
- **Soluzione:** Usa un DNS locale (vedi sotto)

---

### **Opzione C: DNS Server Locale**

Configura un DNS server locale (es. **Pi-hole**, **dnsmasq**).

**dnsmasq (esempio):**
```bash
# Installa
sudo apt install dnsmasq

# Configura
echo "address=/sphyra.local/192.168.1.100" | sudo tee -a /etc/dnsmasq.conf

# Restart
sudo systemctl restart dnsmasq
```

Poi configura i dispositivi per usare questo DNS (192.168.1.100).

---

## 🔐 Generazione Certificati

### Generazione Automatica

```bash
# Esegui script
chmod +x generate-self-signed-cert.sh
./generate-self-signed-cert.sh
```

Lo script:
1. ✅ Genera certificato self-signed valido 10 anni
2. ✅ Include SAN (Subject Alternative Names) per:
   - `sphyra.local`
   - `*.sphyra.local`
   - `localhost`
   - IP comuni (192.168.x.x, 10.0.x.x)
3. ✅ Salva in `traefik/certs/`
4. ✅ Opzionalmente installa nel sistema

**Output:**
```
traefik/certs/
├── sphyra.crt       ← Certificato pubblico
├── sphyra.key       ← Chiave privata
├── sphyra.csr       ← Certificate Signing Request
└── openssl.cnf      ← Config OpenSSL
```

---

### Generazione Manuale

Se preferisci generare manualmente:

```bash
# Crea directory
mkdir -p traefik/certs

# Genera chiave privata
openssl genrsa -out traefik/certs/sphyra.key 4096

# Genera certificato (valido 10 anni)
openssl req -new -x509 \
  -key traefik/certs/sphyra.key \
  -out traefik/certs/sphyra.crt \
  -days 3650 \
  -subj "/C=IT/ST=Italy/L=Rome/O=Sphyra/CN=sphyra.local" \
  -addext "subjectAltName=DNS:sphyra.local,DNS:*.sphyra.local,DNS:localhost,IP:127.0.0.1"

# Permessi
chmod 600 traefik/certs/sphyra.key
chmod 644 traefik/certs/sphyra.crt
```

---

## 🚀 Deploy

### Build e Avvio

```bash
# Build
docker compose -f docker-compose.https-private.yml build

# Avvio
docker compose -f docker-compose.https-private.yml up -d

# Logs
docker compose -f docker-compose.https-private.yml logs -f
```

### Verifica Servizi

```bash
# Status
docker compose -f docker-compose.https-private.yml ps

# Output atteso:
# NAME              STATUS
# sphyra-traefik    Up (healthy)
# sphyra-frontend   Up (healthy)
# sphyra-backend    Up (healthy)
# sphyra-couchdb    Up (healthy)
```

---

## 📲 Importazione Certificati Browser

Per rimuovere il warning "Not Secure", importa il certificato nel browser.

### **Chrome/Edge/Brave (Desktop)**

1. Apri: `chrome://settings/certificates`
2. Tab **"Authorities"**
3. Click **"Import"**
4. Seleziona: `traefik/certs/sphyra.crt`
5. ✅ **"Trust this certificate for identifying websites"**
6. Click **"OK"**

Riavvia il browser.

---

### **Firefox**

1. Apri: `about:preferences#privacy`
2. Scroll → **"View Certificates"**
3. Tab **"Authorities"**
4. Click **"Import"**
5. Seleziona: `traefik/certs/sphyra.crt`
6. ✅ **"Trust this CA to identify websites"**
7. Click **"OK"**

Riavvia Firefox.

---

### **Safari (macOS)**

1. Apri **Keychain Access** (Accesso Portachiavi)
2. Drag & drop `traefik/certs/sphyra.crt` nella finestra
3. Double-click sul certificato
4. Expand **"Trust"**
5. **"When using this certificate"** → **"Always Trust"**
6. Chiudi (richiede password)

---

### **iOS/iPadOS**

1. Invia `traefik/certs/sphyra.crt` via:
   - AirDrop
   - Email
   - Cloud (iCloud, Dropbox)

2. Tap sul file → **"Install Profile"**

3. **Settings → General → VPN & Device Management**
   - Tap sul profilo installato
   - **"Install"**

4. **Settings → General → About → Certificate Trust Settings**
   - Attiva il toggle per "Sphyra Wellness Lab"

---

### **Android**

1. Copia `traefik/certs/sphyra.crt` sul dispositivo

2. **Settings → Security → Advanced → Encryption & credentials**

3. **"Install a certificate"** → **"CA certificate"**

4. Warning → **"Install anyway"**

5. Seleziona il file `.crt`

---

### **Sistema Linux (System-wide)**

```bash
# Ubuntu/Debian
sudo cp traefik/certs/sphyra.crt /usr/local/share/ca-certificates/sphyra.crt
sudo update-ca-certificates

# CentOS/RHEL
sudo cp traefik/certs/sphyra.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
```

---

### **Sistema macOS (System-wide)**

```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  traefik/certs/sphyra.crt
```

---

## ✅ Testing

### Test Base

```bash
# Trova IP del server
hostname -I

# Test da stesso server
curl -I https://sphyra.local

# Output atteso:
# HTTP/2 200
# strict-transport-security: max-age=31536000
```

### Test da Altri Dispositivi

**Prerequisiti:**
1. ✅ Dispositivo sulla stessa rete
2. ✅ DNS/hosts configurato
3. ✅ Certificato importato

```bash
# Da altro PC in LAN
curl -I https://sphyra.local

# Browser
https://sphyra.local
```

**Atteso:** ✅ Lucchetto verde (se certificato importato)

---

### Verifica Certificato

```bash
# Dettagli certificato
openssl x509 -in traefik/certs/sphyra.crt -text -noout

# Verifica connessione HTTPS
openssl s_client -connect sphyra.local:443 -servername sphyra.local
```

---

### Test API

```bash
# Health check
curl https://sphyra.local/api/health

# Con certificato self-signed (senza importazione)
curl -k https://sphyra.local/api/health
```

---

## 🐛 Troubleshooting

### Warning "Not Secure" nel Browser

**Problema:** Browser mostra "Your connection is not private"

**Soluzioni:**

1. **Importa certificato** nel browser (vedi sezione importazione)

2. **Verifica SAN** nel certificato:
   ```bash
   openssl x509 -in traefik/certs/sphyra.crt -text -noout | grep -A10 "Subject Alternative Name"
   ```

   Deve includere il dominio che stai usando.

3. **Rigenera certificato** con SAN corretto:
   ```bash
   ./generate-self-signed-cert.sh
   ```

---

### "DNS_PROBE_FINISHED_NXDOMAIN"

**Problema:** Browser non risolve il dominio

**Soluzioni:**

1. **Verifica /etc/hosts:**
   ```bash
   cat /etc/hosts | grep sphyra
   ```

2. **Test risoluzione:**
   ```bash
   ping sphyra.local
   ```

3. **Verifica mDNS (se usi .local):**
   ```bash
   # Linux
   avahi-browse -a | grep sphyra

   # macOS
   dns-sd -B _http._tcp
   ```

---

### Certificato Non Trovato

**Problema:** Traefik non trova il certificato

**Verifica:**

```bash
# File esistono?
ls -la traefik/certs/

# Permessi corretti?
chmod 600 traefik/certs/sphyra.key
chmod 644 traefik/certs/sphyra.crt

# Traefik può leggerli?
docker exec sphyra-traefik ls -la /certs/
```

---

### Redirect Loop

**Problema:** Browser mostra "ERR_TOO_MANY_REDIRECTS"

**Soluzione:** Verifica configurazione Traefik:

```bash
docker logs sphyra-traefik | grep -i error
```

---

### Mobile Non Si Connette

**Problema:** Mobile non raggiunge il server

**Soluzioni:**

1. **Stesso WiFi?** Verifica che mobile e server siano sulla stessa rete

2. **Firewall?** Verifica che porte 80/443 siano aperte:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **Certificato importato?** Importa su iOS/Android (vedi sezione)

4. **DNS?** Usa DNS locale invece di /etc/hosts

---

## 🔒 Sicurezza

### Certificati Self-Signed vs Let's Encrypt

| Feature | Self-Signed | Let's Encrypt |
|---------|-------------|---------------|
| Crittografia | ✅ Identica | ✅ Identica |
| Validità pubblica | ❌ No | ✅ Sì |
| Browser warning | ⚠️ Sì (risolvibile) | ✅ No |
| Requisiti | Nessuno | Dominio pubblico |
| Costo | Gratuito | Gratuito |
| Uso consigliato | Rete privata | Internet pubblico |

**Importante:** La **crittografia** è **identica**! Self-signed protegge il traffico quanto Let's Encrypt.

---

### Best Practices

1. ✅ **Usa TLS 1.2+** (già configurato)
2. ✅ **Chiave 4096 bit** (già configurato)
3. ✅ **Certificato con SAN** (già configurato)
4. ✅ **Proteggi chiave privata** (chmod 600)
5. ✅ **Rinnova ogni 1-2 anni** (o prima)
6. ✅ **Non esporre su internet** (self-signed solo per reti private!)

---

## 🔄 Rinnovo Certificati

I certificati self-signed scadono (default: 10 anni).

### Verifica Scadenza

```bash
openssl x509 -in traefik/certs/sphyra.crt -noout -dates
```

### Rinnovo

```bash
# 1. Backup vecchio certificato
cp traefik/certs/sphyra.crt traefik/certs/sphyra.crt.old

# 2. Genera nuovo certificato
./generate-self-signed-cert.sh

# 3. Restart Traefik
docker compose -f docker-compose.https-private.yml restart traefik

# 4. Re-importa nel browser (sostituisce vecchio)
```

---

## 📊 Confronto Opzioni

| Metodo | Complessità | Browser Warning | Requisiti | Uso |
|--------|-------------|-----------------|-----------|-----|
| Self-Signed | ⭐ Basso | ⚠️ Sì (risolvibile) | Nessuno | Dev/Staging |
| mDNS (.local) | ⭐ Basso | ⚠️ Sì | Avahi/Bonjour | LAN piccole |
| Private CA | ⭐⭐⭐ Alto | ✅ No (con CA) | Setup CA | Enterprise |
| Let's Encrypt DNS | ⭐⭐ Medio | ✅ No | DNS pubblico | Hybrid cloud |

---

## 🎯 Quando Passare a Let's Encrypt

Passa a Let's Encrypt (pubblico) quando:

1. ✅ Applicazione diventa pubblica su internet
2. ✅ Hai un dominio pubblico
3. ✅ Vuoi eliminare browser warning per utenti esterni
4. ✅ Server è raggiungibile su porta 80/443 da internet

**Usa:** `docker-compose.https.yml` + configurazione dominio pubblico

---

## 📚 Comandi Utili

```bash
# Deploy
docker compose -f docker-compose.https-private.yml up -d

# Logs
docker compose -f docker-compose.https-private.yml logs -f

# Status
docker compose -f docker-compose.https-private.yml ps

# Stop
docker compose -f docker-compose.https-private.yml down

# Rebuild
docker compose -f docker-compose.https-private.yml up -d --build

# Verifica certificato
openssl x509 -in traefik/certs/sphyra.crt -text -noout

# Test HTTPS (ignora warning)
curl -k https://sphyra.local

# Test HTTPS (con certificato importato)
curl https://sphyra.local
```

---

## 🎉 Conclusione

Hai ora HTTPS funzionante in **rete privata** con:

✅ Certificati self-signed generati automaticamente
✅ Traefik configurato per certificati locali
✅ Redirect HTTP → HTTPS
✅ Security headers configurati
✅ Database isolato
✅ Istruzioni per importazione certificati

**Prossimi passi:**

1. Genera certificati: `./generate-self-signed-cert.sh`
2. Configura DNS/hosts
3. Deploy: `docker compose -f docker-compose.https-private.yml up -d`
4. Importa certificato nel browser
5. Apri: `https://sphyra.local`

---

**Documentazione completa pubblica:** [HTTPS-DEPLOYMENT.md](./HTTPS-DEPLOYMENT.md)
