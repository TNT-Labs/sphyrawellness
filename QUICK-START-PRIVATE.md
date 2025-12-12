# 🔒 Quick Start - HTTPS Rete Privata

Deploy HTTPS in rete privata in **3 minuti**.

---

## ⚡ Setup in 3 Step

### 1️⃣ Configura Environment

```bash
# Copia template
cp .env.private.example .env

# Modifica (opzionale, default funziona)
nano .env
```

**Default:**
```bash
PRIVATE_DOMAIN=sphyra.local  # ← Funziona con mDNS
```

---

### 2️⃣ Genera Certificati

```bash
# Esegui script
chmod +x generate-self-signed-cert.sh
./generate-self-signed-cert.sh

# Output:
# ✅ Certificati generati in traefik/certs/
```

---

### 3️⃣ Deploy

```bash
# Build e avvio
docker compose -f docker-compose.https-private.yml up -d

# Verifica
docker compose -f docker-compose.https-private.yml ps
```

---

## ✅ Accesso

### Browser Desktop

```
https://sphyra.local
```

**Warning "Not Secure"?** → Importa certificato:

**Chrome:**
1. `chrome://settings/certificates`
2. Tab "Authorities" → Import
3. Seleziona `traefik/certs/sphyra.crt`
4. ✓ Trust → OK

**Firefox:**
1. `about:preferences#privacy`
2. View Certificates → Authorities → Import
3. Seleziona `traefik/certs/sphyra.crt`
4. ✓ Trust → OK

---

### Mobile (iOS/Android)

**iOS:**
1. AirDrop `traefik/certs/sphyra.crt`
2. Install Profile
3. Settings → General → About → Certificate Trust → Enable

**Android:**
1. Copia `traefik/certs/sphyra.crt` su device
2. Settings → Security → Install certificate (CA)

---

## 🌐 Configurazione DNS

### Opzione A: mDNS (già funziona!)

Se usi `sphyra.local`, **nessuna configurazione necessaria** su:
- ✅ macOS (Bonjour integrato)
- ✅ Linux con Avahi (`sudo apt install avahi-daemon`)
- ✅ Windows con Bonjour Print Services

---

### Opzione B: File /etc/hosts

**Linux/macOS:**
```bash
# Aggiungi (sostituisci IP)
echo "192.168.1.100  sphyra.local" | sudo tee -a /etc/hosts
```

**Windows (PowerShell Administrator):**
```powershell
Add-Content C:\Windows\System32\drivers\etc\hosts "192.168.1.100  sphyra.local"
```

---

## 🔍 Verifica

```bash
# Test HTTPS (ignora warning certificato)
curl -k https://sphyra.local

# Status servizi
docker compose -f docker-compose.https-private.yml ps

# Logs
docker compose -f docker-compose.https-private.yml logs -f
```

---

## 🐛 Problemi Comuni

| Problema | Soluzione |
|----------|-----------|
| `DNS_PROBE_FINISHED_NXDOMAIN` | Configura /etc/hosts o installa Avahi |
| Warning "Not Secure" | Importa certificato nel browser |
| Mobile non si connette | Verifica stesso WiFi + importa certificato |

---

## 📚 Documentazione Completa

Vedi [HTTPS-PRIVATE-NETWORK.md](./HTTPS-PRIVATE-NETWORK.md) per:
- Opzioni DNS avanzate
- Importazione certificati su tutti i dispositivi
- Private CA setup
- Troubleshooting completo

---

## 🎯 Differenze vs Deploy Pubblico

| Feature | Rete Privata | Internet Pubblico |
|---------|--------------|-------------------|
| Certificati | Self-signed | Let's Encrypt |
| Dominio | .local o custom | Dominio reale |
| DNS | /etc/hosts o mDNS | DNS pubblico |
| Browser warning | Sì (risolvibile) | No |
| File compose | `https-private.yml` | `https.yml` |

---

**🎉 Fatto! HTTPS funzionante in rete privata!**

```
https://sphyra.local
```
