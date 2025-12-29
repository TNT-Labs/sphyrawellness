# 🔒 Configurazione HTTPS per App Mobile

Guida per esporre il backend Sphyra su HTTPS pubblico per l'app mobile.

## 🎯 Perché HTTPS Pubblico?

### Vantaggi
- ✅ **App funziona ovunque** - Non serve rete locale
- ✅ **Sicurezza massima** - Traffico crittografato
- ✅ **Sincronizzazione continua** - Anche fuori ufficio
- ✅ **Professionale** - Setup produzione reale

### Sicurezza
- 🔒 Crittografia TLS/SSL end-to-end
- 🛡️ JWT authentication già implementato
- 🚫 Rate limiting protezione brute-force
- ✅ Certificato SSL gratuito con Let's Encrypt

## 📋 Prerequisiti

- Server Linux con Docker (o backend installato)
- Porta 80 e 443 aperte sul firewall
- IP pubblico fisso o dinamico
- (Opzionale) Router con port forwarding configurato

## 🚀 Setup Rapido con DuckDNS

### 1. Crea Dominio Gratuito

1. Vai su **https://www.duckdns.org**
2. Login con GitHub/Google/Reddit
3. Crea subdomain: `sphyra-wellness` (o nome a tua scelta)
4. Risultato: `sphyra-wellness.duckdns.org`
5. Annota il **token DuckDNS** (mostrato nella pagina)

### 2. Configura IP Pubblico

**Se hai IP pubblico statico:**
```bash
# Annota il tuo IP pubblico
curl ifconfig.me

# Aggiorna DuckDNS con il tuo IP (fatto automaticamente)
```

**Se hai IP pubblico dinamico:**
- DuckDNS si aggiorna automaticamente ogni 5 minuti
- Oppure installa client DuckDNS per aggiornamenti real-time

### 3. Configura Firewall/Router

**Router (Port Forwarding):**
```
Porta 80 (HTTP) → IP-SERVER:80
Porta 443 (HTTPS) → IP-SERVER:443
```

**Server Firewall:**
```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 4. Deploy HTTPS con Script Automatico

```bash
cd /home/user/sphyrawellness

# Copia template configurazione
cp .env.letsencrypt.example .env

# Modifica configurazione
nano .env
```

**Configura .env:**
```bash
# Il tuo dominio DuckDNS
DOMAIN=sphyra-wellness.duckdns.org

# Tua email per Let's Encrypt (notifiche rinnovo)
EMAIL=tua@email.com

# Token DuckDNS (dalla dashboard DuckDNS)
DUCKDNS_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Altre configurazioni (già presenti)
DATABASE_URL=...
JWT_SECRET=...
# etc.
```

**Avvia deploy:**
```bash
# Rendi eseguibile lo script
chmod +x deploy-duckdns.sh

# Esegui deploy automatico
./deploy-duckdns.sh
```

Lo script:
1. ✅ Aggiorna IP su DuckDNS
2. ✅ Avvia container Docker
3. ✅ Configura Nginx reverse proxy
4. ✅ Ottiene certificato SSL Let's Encrypt
5. ✅ Configura rinnovo automatico certificato
6. ✅ Espone backend su HTTPS

### 5. Verifica Funzionamento

```bash
# Test da browser o terminale
curl https://sphyra-wellness.duckdns.org/api/health

# Dovresti ricevere:
# {"status":"ok"}

# Verifica certificato SSL
curl -I https://sphyra-wellness.duckdns.org
# Cerca "HTTP/2 200" o "HTTP/1.1 200"
```

## 📱 Configurazione App Mobile

### 1. Nell'App

1. Apri app mobile
2. Vai in **⚙️ Impostazioni**
3. **URL API Server:**
   ```
   https://sphyra-wellness.duckdns.org/api
   ```
   (Usa il TUO dominio!)
4. Tocca **🔍 Testa Connessione**
5. Se OK → **💾 Salva Impostazioni**

### 2. Test Completo

```bash
# 1. Login nell'app
# 2. Tocca "📤 Sincronizza Ora"
# 3. Verifica che funzioni anche su dati mobili (4G/5G)
# 4. Disabilita Wi-Fi e riprova
# 5. Avvia Auto-Sync
```

## 🔒 Sicurezza Produzione

### Checklist Obbligatoria

- [ ] **HTTPS attivo** (non HTTP!)
- [ ] **Certificato SSL valido** (verde nel browser)
- [ ] **Firewall configurato** (solo porte 80, 443, 22 aperte)
- [ ] **JWT_SECRET forte** (almeno 64 caratteri casuali)
- [ ] **Password admin cambiata** (non usare admin/admin123!)
- [ ] **Rate limiting attivo** (già configurato ✅)
- [ ] **Helmet security headers** (già configurato ✅)
- [ ] **Database password forte** (cambia default!)

### Configurazioni Raccomandate

**Backend .env:**
```bash
# JWT Secret (genera nuovo!)
JWT_SECRET=$(openssl rand -base64 64)

# Node environment
NODE_ENV=production

# Database (password forte!)
DATABASE_URL=postgresql://sphyra_user:PASSWORD_FORTE_QUI@postgres:5432/sphyra_wellness

# CORS (solo origini fidate)
CORS_ORIGIN=https://sphyra-wellness.duckdns.org
```

**Genera JWT_SECRET sicuro:**
```bash
openssl rand -base64 64
# Copia output in .env come JWT_SECRET
```

### Monitoraggio

```bash
# Verifica logs Nginx
docker compose logs -f nginx-proxy

# Verifica logs backend
docker compose logs -f backend

# Rinnovo certificato SSL (automatico ogni 60 giorni)
docker compose exec certbot certbot renew --dry-run
```

## 🐛 Troubleshooting

### "Connessione rifiutata" dall'app

**Possibili cause:**
1. Firewall blocca porte 80/443
2. Port forwarding non configurato
3. Certificato SSL scaduto
4. Nginx non avviato

**Soluzioni:**
```bash
# 1. Verifica porte aperte
sudo netstat -tulpn | grep -E ':80|:443'

# 2. Verifica container attivi
docker compose ps

# 3. Controlla certificato
sudo certbot certificates

# 4. Riavvia Nginx
docker compose restart nginx-proxy
```

### "Certificato non valido"

```bash
# Rigenera certificato
docker compose exec certbot certbot delete --cert-name sphyra-wellness.duckdns.org
docker compose exec certbot certbot certonly --webroot \
  -w /var/www/certbot \
  -d sphyra-wellness.duckdns.org \
  --email tua@email.com \
  --agree-tos
```

### "DuckDNS IP non aggiornato"

```bash
# Verifica IP pubblico attuale
curl ifconfig.me

# Verifica IP su DuckDNS
nslookup sphyra-wellness.duckdns.org

# Se diversi, aggiorna manualmente
curl "https://www.duckdns.org/update?domains=sphyra-wellness&token=TUO_TOKEN&ip="
```

### App non si connette su dati mobili

**Verifica:**
1. IP pubblico raggiungibile da internet (non solo LAN)
2. Port forwarding configurato correttamente su router
3. ISP non blocca porte 80/443 in entrata
4. URL corretto nell'app (https:// non http://)

## 📊 Monitoraggio e Manutenzione

### Logs Importanti

```bash
# Backend API logs
docker compose logs -f backend | grep -i error

# Nginx access logs
docker compose logs -f nginx-proxy | grep -i mobile

# Certificato SSL rinnovo
docker compose logs certbot | grep -i renew
```

### Backup Certificati

```bash
# Backup certificati SSL
sudo tar -czf letsencrypt-backup-$(date +%Y%m%d).tar.gz \
  /etc/letsencrypt/

# Salva in luogo sicuro!
```

### Rinnovo Automatico Certificato

Il certificato SSL si rinnova automaticamente ogni 60 giorni.

**Verifica funzionamento:**
```bash
# Test rinnovo (dry-run, non rinnova realmente)
docker compose exec certbot certbot renew --dry-run

# Se OK, vedrai: "Congratulations, all simulated renewals succeeded"
```

## 🌍 Alternative a DuckDNS

### Cloudflare Tunnel (Gratuito, più avanzato)

- Nessun port forwarding necessario
- DDoS protection incluso
- CDN globale
- Setup: https://developers.cloudflare.com/cloudflare-one/

### ngrok (Per testing)

```bash
# Solo per development/test, non produzione
ngrok http 3001

# URL pubblico temporaneo: https://xxxxx.ngrok.io
```

### Dominio Personalizzato

Se hai già un dominio:

```bash
# 1. Punta A record al tuo IP
# DNS: api.tuodominio.com → IL-TUO-IP-PUBBLICO

# 2. Ottieni certificato SSL
sudo certbot certonly --nginx -d api.tuodominio.com

# 3. Configura Nginx
# Vedi: SETUP_HTTPS_DUCKDNS_COMPLETE.md
```

## ✅ Checklist Finale

Prima di usare in produzione:

- [ ] HTTPS funzionante (browser mostra lucchetto verde)
- [ ] App mobile si connette correttamente
- [ ] Test invio SMS completato con successo
- [ ] Auto-sync funziona su dati mobili
- [ ] Firewall configurato correttamente
- [ ] Password admin cambiata
- [ ] JWT_SECRET casuale e forte
- [ ] Backup database configurato
- [ ] Monitoraggio logs attivo
- [ ] Certificato SSL rinnovo automatico verificato

## 🆘 Supporto

**Documentazione completa:**
- `DEPLOY_DUCKDNS.md` - Deploy DuckDNS specifico
- `SETUP_HTTPS_DUCKDNS_COMPLETE.md` - Setup HTTPS dettagliato
- `DOCKER_GUIDE.md` - Guida Docker

**Test connessione pubblica:**
```bash
# Da qualsiasi dispositivo su internet
curl https://tuo-dominio.duckdns.org/api/health
```

---

**🎉 Fatto! Ora la tua app mobile può inviare SMS da qualsiasi posto! 🚀**
