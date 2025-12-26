# ✅ Setup HTTPS con DuckDNS - Configurazione Completata

## 📊 Riepilogo Configurazione

L'applicazione **Sphyra Wellness Lab** è stata configurata per il deploy HTTPS con:

- **Dominio**: `sphyrawellnesslab.duckdns.org`
- **Certificati SSL**: Let's Encrypt (gratuiti, auto-rinnovabili)
- **Database**: PostgreSQL 16
- **Reverse Proxy**: Nginx con SSL termination
- **Backend**: Node.js + Prisma ORM
- **Frontend**: React PWA

---

## 🎯 Stato Configurazione

### ✅ File Configurati

| File | Stato | Descrizione |
|------|-------|-------------|
| `.env` | ✅ Creato | Configurazione ambiente con PostgreSQL |
| `docker-compose.letsencrypt.yml` | ✅ Aggiornato | PostgreSQL invece di CouchDB |
| `deploy-duckdns.sh` | ✅ Creato | Script deploy automatico |
| `init-letsencrypt.sh` | ✅ Creato | Script inizializzazione certificati |
| `DEPLOY_DUCKDNS.md` | ✅ Creato | Documentazione completa |
| `certbot/` directories | ✅ Creato | Directory per certificati SSL |

### 📁 Struttura Directory

```
sphyrawellness/
├── .env                              ✅ Configurato per DuckDNS
├── docker-compose.letsencrypt.yml    ✅ Con PostgreSQL
├── deploy-duckdns.sh                 ✅ Script deploy
├── init-letsencrypt.sh               ✅ Script init certificati
├── DEPLOY_DUCKDNS.md                 ✅ Documentazione
├── certbot/
│   ├── conf/                         ✅ Creato
│   └── www/                          ✅ Creato
├── nginx/
│   ├── nginx.conf                    ✅ Esistente
│   └── conf.d/
│       └── sphyra-letsencrypt.conf   ✅ Esistente
└── server/
    ├── Dockerfile                     ✅ Esistente
    └── prisma/
        └── schema.prisma              ✅ PostgreSQL
```

---

## 🚀 Come Effettuare il Deploy

### Prerequisiti

Prima di iniziare, assicurati di avere:

1. **Docker e Docker Compose installati**
   ```bash
   docker --version
   docker compose version
   ```

2. **DuckDNS configurato**
   - Vai su https://www.duckdns.org/
   - Verifica che `sphyrawellnesslab` punti all'IP pubblico del server
   - Testa: `ping sphyrawellnesslab.duckdns.org`

3. **Porte aperte**
   - Porta 80 (HTTP) - necessaria per validazione Let's Encrypt
   - Porta 443 (HTTPS) - per traffico HTTPS
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw reload
   ```

4. **Email valida in `.env`**
   - Apri `.env` e modifica la riga `EMAIL=...` con una email reale
   - Let's Encrypt userà questa email per notifiche importanti

### Opzione 1: Deploy Automatico (Raccomandato)

```bash
# Entra nella directory del progetto
cd /path/to/sphyrawellness

# Primo deploy - usa certificati STAGING per test
# Modifica .env: STAGING=1
nano .env

# Esegui lo script
./deploy-duckdns.sh

# Se tutto funziona, passa a PRODUCTION
# Modifica .env: STAGING=0
nano .env

# Rimuovi certificati staging
sudo rm -rf certbot/conf/*

# Redeploy con certificati reali
./deploy-duckdns.sh
```

### Opzione 2: Inizializzazione Manuale

Per il primo deploy, è necessario ottenere i certificati SSL prima di avviare tutti i servizi:

```bash
# 1. Inizializza Let's Encrypt (primo avvio)
./init-letsencrypt.sh

# Questo script:
# - Scarica parametri TLS raccomandati
# - Crea certificato temporaneo
# - Avvia Nginx
# - Richiede certificato reale a Let's Encrypt
# - Riavvia Nginx con certificato reale
# - Avvia tutti gli altri servizi

# 2. Verifica lo stato
docker compose -f docker-compose.letsencrypt.yml ps

# 3. Controlla i logs
docker compose -f docker-compose.letsencrypt.yml logs -f
```

### Opzione 3: Deploy Manuale Completo

Se preferisci il controllo totale:

```bash
# 1. Crea directory
mkdir -p certbot/conf certbot/www

# 2. Download parametri TLS
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem

# 3. Build immagini
docker compose -f docker-compose.letsencrypt.yml build --no-cache

# 4. Avvia solo database e backend
docker compose -f docker-compose.letsencrypt.yml up -d postgres backend frontend

# 5. Usa init-letsencrypt.sh per ottenere certificati
./init-letsencrypt.sh

# 6. Verifica
docker compose -f docker-compose.letsencrypt.yml ps
```

---

## 🧪 Verifica del Deploy

Dopo il deploy, verifica che tutto funzioni:

### 1. Verifica Container

```bash
docker compose -f docker-compose.letsencrypt.yml ps

# Output atteso: tutti i container "Up" e "healthy"
# - sphyra-nginx        Up  (healthy)
# - sphyra-frontend     Up  (healthy)
# - sphyra-backend      Up  (healthy)
# - sphyra-postgres     Up  (healthy)
# - sphyra-certbot      Up
```

### 2. Verifica Certificato SSL

```bash
# Controlla i logs di Certbot
docker logs sphyra-certbot | grep -i "successfully"

# Verifica file certificato
docker exec sphyra-nginx ls -la /etc/letsencrypt/live/sphyrawellnesslab.duckdns.org/

# Output atteso:
# fullchain.pem
# privkey.pem
# chain.pem
# cert.pem
```

### 3. Test HTTP → HTTPS Redirect

```bash
# Deve reindirizzare a HTTPS
curl -I http://sphyrawellnesslab.duckdns.org

# Output atteso:
# HTTP/1.1 301 Moved Permanently
# Location: https://sphyrawellnesslab.duckdns.org
```

### 4. Test HTTPS

```bash
# Deve rispondere 200 OK
curl -I https://sphyrawellnesslab.duckdns.org

# Output atteso:
# HTTP/2 200
```

### 5. Test nel Browser

Apri il browser e vai su:

```
https://sphyrawellnesslab.duckdns.org
```

Verifica:
- ✅ Lucchetto verde (certificato valido)
- ✅ Applicazione carica correttamente
- ✅ Login funziona
- ✅ Nessun errore console

### 6. Test Sicurezza SSL

```bash
# Test SSL Labs (rating A/A+ atteso)
https://www.ssllabs.com/ssltest/analyze.html?d=sphyrawellnesslab.duckdns.org

# Test Security Headers
https://securityheaders.com/?q=sphyrawellnesslab.duckdns.org
```

---

## 🔧 Variabili d'Ambiente (.env)

### Variabili Obbligatorie

```env
# Dominio
DOMAIN=sphyrawellnesslab.duckdns.org

# Email per Let's Encrypt (IMPORTANTE!)
EMAIL=tua-email-reale@esempio.com

# Database PostgreSQL
POSTGRES_DB=sphyra_wellness
POSTGRES_USER=sphyra_user
POSTGRES_PASSWORD=password-molto-sicura-qui

# JWT per autenticazione
JWT_SECRET=stringa-random-molto-lunga-e-sicura
```

### Variabili Opzionali

```env
# Staging (0=production, 1=test)
STAGING=0

# SendGrid (email)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@sphyrawellnesslab.duckdns.org

# Twilio (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Password admin iniziale
VITE_ADMIN_INITIAL_PASSWORD=admin123
```

### ⚠️ IMPORTANTE - Sicurezza

Prima del deploy in produzione:

1. **Cambia tutte le password di default**
   ```bash
   # Genera password sicure
   openssl rand -base64 32
   ```

2. **Imposta email reale**
   - Let's Encrypt userà questa email per notifiche importanti

3. **Non committare .env su git**
   - `.env` è già nel `.gitignore`

---

## 🔄 Gestione e Manutenzione

### Comandi Utili

```bash
# Status servizi
docker compose -f docker-compose.letsencrypt.yml ps

# Logs in tempo reale
docker compose -f docker-compose.letsencrypt.yml logs -f

# Logs specifico servizio
docker logs sphyra-nginx -f
docker logs sphyra-backend -f
docker logs sphyra-certbot -f

# Restart servizio
docker compose -f docker-compose.letsencrypt.yml restart nginx

# Stop tutto
docker compose -f docker-compose.letsencrypt.yml down

# Rebuild e restart
docker compose -f docker-compose.letsencrypt.yml build --no-cache
docker compose -f docker-compose.letsencrypt.yml up -d
```

### Rinnovo Certificati

I certificati Let's Encrypt si rinnovano **automaticamente ogni 12 ore** grazie al container Certbot.

```bash
# Verifica rinnovo automatico
docker logs sphyra-certbot | grep renew

# Forza rinnovo manuale (test)
docker exec sphyra-certbot certbot renew --dry-run

# Forza rinnovo reale
docker exec sphyra-certbot certbot renew --force-renewal
docker compose -f docker-compose.letsencrypt.yml restart nginx
```

### Backup

```bash
# Backup database PostgreSQL
docker exec sphyra-postgres pg_dump -U sphyra_user sphyra_wellness > backup-$(date +%Y%m%d).sql

# Backup certificati
sudo tar czf certbot-backup-$(date +%Y%m%d).tar.gz certbot/

# Backup completo
docker compose -f docker-compose.letsencrypt.yml down
sudo tar czf sphyra-full-backup-$(date +%Y%m%d).tar.gz \
  .env \
  certbot/ \
  docker-compose.letsencrypt.yml
```

### Aggiornamenti

```bash
# Pull nuove immagini
docker compose -f docker-compose.letsencrypt.yml pull

# Rebuild applicazione
docker compose -f docker-compose.letsencrypt.yml build --no-cache

# Restart con nuove immagini
docker compose -f docker-compose.letsencrypt.yml up -d
```

---

## 🐛 Troubleshooting

### Problema: Certificato Non Ottenuto

**Causa**: DuckDNS non punta all'IP corretto o porte chiuse

**Soluzione**:
```bash
# 1. Verifica DNS
nslookup sphyrawellnesslab.duckdns.org

# 2. Verifica IP pubblico server
curl ifconfig.me

# 3. Aggiorna DuckDNS se necessario
# Vai su https://www.duckdns.org/

# 4. Verifica porte aperte
sudo ufw status
sudo netstat -tlnp | grep ':80\|:443'

# 5. Riprova
./init-letsencrypt.sh
```

### Problema: Nginx Non Parte

**Causa**: Certificati mancanti al primo avvio

**Soluzione**:
```bash
# Usa lo script di inizializzazione
./init-letsencrypt.sh
```

### Problema: Backend Errori Database

**Causa**: PostgreSQL non pronto o password errata

**Soluzione**:
```bash
# Verifica PostgreSQL
docker logs sphyra-postgres

# Verifica variabili ambiente backend
docker exec sphyra-backend env | grep DATABASE_URL

# Test connessione
docker exec sphyra-postgres psql -U sphyra_user -d sphyra_wellness -c "SELECT 1"

# Restart backend
docker compose -f docker-compose.letsencrypt.yml restart backend
```

### Problema: Frontend Non Carica

**Causa**: Nginx o backend non disponibili

**Soluzione**:
```bash
# Verifica tutti i servizi
docker compose -f docker-compose.letsencrypt.yml ps

# Verifica logs
docker logs sphyra-nginx
docker logs sphyra-frontend

# Test proxy
docker exec sphyra-nginx wget -O- http://frontend/
docker exec sphyra-nginx wget -O- http://backend:3001/health
```

---

## 📚 Documentazione Aggiuntiva

- **Guida Completa**: `DEPLOY_DUCKDNS.md`
- **Docker Guide**: `DOCKER_GUIDE.md`
- **Troubleshooting Backend**: `TROUBLESHOOTING-BACKEND.md`

---

## 🔐 Checklist Sicurezza

Prima del deploy in produzione:

- [ ] Password PostgreSQL cambiata (`.env`)
- [ ] JWT_SECRET cambiato (`.env`)
- [ ] Email reale configurata (`.env`)
- [ ] VITE_ADMIN_INITIAL_PASSWORD cambiata
- [ ] Firewall configurato (solo porte 80, 443)
- [ ] Backup configurati
- [ ] SSL test eseguito (SSL Labs A/A+)
- [ ] DuckDNS punta all'IP corretto
- [ ] `.env` NON committato su git

---

## ✅ Prossimi Passi

Dopo il deploy:

1. **Verifica funzionamento**
   - Testa login
   - Crea appuntamenti
   - Verifica database

2. **Configura backup automatici**
   - Script cron per backup database
   - Backup certificati

3. **Monitoring** (opzionale)
   - Uptime monitoring
   - SSL expiration monitoring

4. **Ottimizzazione** (opzionale)
   - CDN per static assets
   - Database tuning

---

## 📞 Support

Per problemi o domande:

1. Consulta `DEPLOY_DUCKDNS.md`
2. Controlla i logs: `docker compose -f docker-compose.letsencrypt.yml logs -f`
3. Verifica DuckDNS: https://www.duckdns.org/

---

**Data Configurazione**: 2025-12-26
**Dominio**: sphyrawellnesslab.duckdns.org
**Database**: PostgreSQL 16
**SSL**: Let's Encrypt

✅ **Setup HTTPS completato e pronto per il deploy!**
