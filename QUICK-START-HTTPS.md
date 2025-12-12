# 🚀 Quick Start - Deploy HTTPS

Guida rapida per deploy production HTTPS in **5 minuti**.

---

## ⚡ Deploy in 5 Step

### 1️⃣ Configura Dominio (OBBLIGATORIO)

Aggiungi record DNS per il tuo dominio:

```
A     @       YOUR_SERVER_IP
A     www     YOUR_SERVER_IP
```

Verifica:
```bash
nslookup your-domain.com
# Deve mostrare l'IP del tuo server
```

### 2️⃣ Configura Environment

```bash
# Copia template
cp .env.https.example .env

# Modifica i valori
nano .env
```

**Valori OBBLIGATORI:**
```bash
DOMAIN=your-domain.com                          # ← IL TUO DOMINIO
LETSENCRYPT_EMAIL=admin@your-domain.com        # ← LA TUA EMAIL
COUCHDB_PASSWORD=super-secure-password         # ← CAMBIA!
SENDGRID_API_KEY=SG.your-key                   # ← La tua API key
```

### 3️⃣ Configura Traefik

```bash
# Modifica traefik/traefik.yml
nano traefik/traefik.yml

# Cambia riga 38: domains.main
# Cambia riga 55: acme.email
```

### 4️⃣ Apri Firewall

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 5️⃣ Deploy!

```bash
# Build e avvio
docker compose -f docker-compose.https.yml up -d --build

# Verifica logs
docker logs sphyra-traefik -f

# Attendi messaggio:
# "Certificate obtained for your-domain.com"
```

---

## ✅ Verifica Funzionamento

### Browser
```
https://your-domain.com
```
✅ Lucchetto verde visibile

### cURL
```bash
curl -I https://your-domain.com
# HTTP/2 200

curl -I http://your-domain.com
# HTTP/1.1 301 (redirect a HTTPS)
```

### SSL Test
```
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```
✅ Rating A/A+

---

## 🎯 Comandi Utili

```bash
# Status servizi
docker compose -f docker-compose.https.yml ps

# Logs
docker compose -f docker-compose.https.yml logs -f

# Restart
docker compose -f docker-compose.https.yml restart

# Stop
docker compose -f docker-compose.https.yml down
```

---

## 🔧 Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| Certificato non ottenuto | Verifica DNS: `nslookup your-domain.com` |
| Porta chiusa | Apri firewall: `sudo ufw allow 80/tcp 443/tcp` |
| Rate limit Let's Encrypt | Usa staging: cambia `certresolver=letsencrypt-staging` |
| Mixed content | Verifica `.env`: `VITE_API_URL=https://...` |

---

## 📚 Documentazione Completa

Vedi [HTTPS-DEPLOYMENT.md](./HTTPS-DEPLOYMENT.md) per:
- Configurazione dettagliata
- Testing avanzato
- Gestione certificati
- Sicurezza
- Monitoring

---

**🎉 Fatto! La tua app è ora in HTTPS!**
