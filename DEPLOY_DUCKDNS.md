# 🚀 Deploy HTTPS con DuckDNS - Sphyra Wellness Lab

Guida completa per il deploy dell'applicazione Sphyra Wellness Lab con HTTPS su **sphyrawellnesslab.duckdns.org** utilizzando certificati SSL/TLS gratuiti di Let's Encrypt.

---

## 📋 Indice

1. [Prerequisiti](#-prerequisiti)
2. [Architettura](#-architettura)
3. [Configurazione DuckDNS](#-configurazione-duckdns)
4. [Deploy Rapido](#-deploy-rapido)
5. [Configurazione Dettagliata](#-configurazione-dettagliata)
6. [Verifica e Test](#-verifica-e-test)
7. [Troubleshooting](#-troubleshooting)
8. [Manutenzione](#-manutenzione)
9. [Sicurezza](#-sicurezza)

---

## ✅ Prerequisiti

### Software Richiesto

- **Docker** (versione 20.10+)
- **Docker Compose** (versione 2.0+)
- **Accesso SSH** al server
- **Porte aperte**: 80 (HTTP) e 443 (HTTPS)

### Verifica Installazione

```bash
# Verifica Docker
docker --version

# Verifica Docker Compose
docker compose version

# Verifica porte aperte
sudo netstat -tlnp | grep ':80\|:443'
# oppure
sudo ss -tlnp | grep ':80\|:443'
```

### Configurazione DuckDNS

✅ **IMPORTANTE**: Prima di procedere, assicurati che DuckDNS sia configurato:

1. Vai su https://www.duckdns.org/
2. Login con il tuo account
3. Verifica che **sphyrawellnesslab** punti all'IP pubblico del server
4. Testa la risoluzione DNS:
   ```bash
   nslookup sphyrawellnesslab.duckdns.org
   # oppure
   ping sphyrawellnesslab.duckdns.org
   ```

---

## 🏗️ Architettura

```
                     Internet
                        ↓
                  Port 80/443
                        ↓
        ┌───────────── Nginx ─────────────┐
        │    (Reverse Proxy + SSL)        │
        │                                 │
        ↓                ↓                ↓
    Frontend         Backend          CouchDB
   (React PWA)     (Node.js API)    (Database)
     :80              :3001            :5984
                                    (PRIVATO)

Let's Encrypt Certbot
(Auto-renewal ogni 12h)
```

### Componenti

| Servizio | Porta | Descrizione | Pubblico |
|----------|-------|-------------|----------|
| **Nginx** | 80, 443 | Reverse proxy, SSL termination | ✅ |
| **Frontend** | 80 (interno) | React PWA con Nginx | No (via proxy) |
| **Backend** | 3001 (interno) | API Node.js/Express | No (via proxy) |
| **CouchDB** | 5984 (interno) | Database NoSQL | ❌ Privato |
| **Certbot** | - | Gestione certificati SSL | - |

---

## 🚀 Deploy Rapido

### Opzione 1: Script Automatico (Raccomandato)

```bash
# 1. Entra nella directory del progetto
cd /path/to/sphyrawellness

# 2. Esegui lo script di deploy
./deploy-duckdns.sh
```

Lo script eseguirà automaticamente:
- ✅ Verifica prerequisiti
- ✅ Controllo configurazione
- ✅ Creazione directory
- ✅ Build immagini Docker
- ✅ Avvio servizi
- ✅ Richiesta certificato SSL
- ✅ Test funzionamento

### Opzione 2: Deploy Manuale

```bash
# 1. Verifica configurazione .env
cat .env

# 2. Crea directory necessarie
mkdir -p certbot/conf certbot/www

# 3. Build e avvio
docker compose -f docker-compose.letsencrypt.yml build --no-cache
docker compose -f docker-compose.letsencrypt.yml up -d

# 4. Monitora i logs
docker compose -f docker-compose.letsencrypt.yml logs -f
```

---

## ⚙️ Configurazione Dettagliata

### File .env

Il file `.env` è già stato creato con la configurazione base. Verifica e modifica questi valori:

```bash
# Apri il file .env
nano .env
```

#### Parametri Obbligatori

```env
# Domain configurato su DuckDNS
DOMAIN=sphyrawellnesslab.duckdns.org

# Email per notifiche Let's Encrypt (IMPORTANTE!)
EMAIL=tua-email-reale@esempio.com

# Modalità certificati (0=production, 1=staging per test)
STAGING=0

# Password database (CAMBIA IN PRODUZIONE!)
COUCHDB_PASSWORD=password-molto-sicura-qui

# JWT Secret per autenticazione (CAMBIA IN PRODUZIONE!)
JWT_SECRET=stringa-random-molto-lunga-e-sicura
```

#### Parametri Opzionali

```env
# SendGrid per email (opzionale)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@sphyrawellnesslab.duckdns.org
SENDGRID_FROM_NAME=Sphyra Wellness Lab

# Password admin iniziale
VITE_ADMIN_INITIAL_PASSWORD=admin123
```

### Modalità Staging vs Production

**IMPORTANTE**: Per evitare rate limiting di Let's Encrypt durante i test:

#### 1. Prima Deploy - Modalità STAGING (Test)

```env
STAGING=1
```

```bash
./deploy-duckdns.sh
```

Verifica che tutto funzioni correttamente. I certificati staging NON saranno fidati dal browser (normale).

#### 2. Deploy Produzione - Certificati Reali

Una volta verificato che tutto funziona:

```env
STAGING=0
```

```bash
# Rimuovi vecchi certificati staging
docker compose -f docker-compose.letsencrypt.yml down
sudo rm -rf certbot/conf/*

# Redeploy con certificati production
./deploy-duckdns.sh
```

---

## 🧪 Verifica e Test

### 1. Verifica Container in Esecuzione

```bash
docker compose -f docker-compose.letsencrypt.yml ps
```

Dovresti vedere tutti i container nello stato `Up`:
- sphyra-nginx
- sphyra-frontend
- sphyra-backend
- sphyra-couchdb
- sphyra-certbot

### 2. Verifica Certificato SSL

```bash
# Controlla i logs di Certbot
docker logs sphyra-certbot

# Cerca questa riga:
# "Successfully received certificate"
```

```bash
# Verifica i file del certificato
docker exec sphyra-nginx ls -la /etc/letsencrypt/live/sphyrawellnesslab.duckdns.org/
```

Dovresti vedere:
- `fullchain.pem`
- `privkey.pem`
- `chain.pem`
- `cert.pem`

### 3. Test HTTP → HTTPS Redirect

```bash
# Il redirect dovrebbe portare automaticamente a HTTPS
curl -I http://sphyrawellnesslab.duckdns.org

# Output atteso:
# HTTP/1.1 301 Moved Permanently
# Location: https://sphyrawellnesslab.duckdns.org
```

### 4. Test HTTPS

```bash
# Test certificato SSL
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
- ✅ Lucchetto verde nella barra degli indirizzi
- ✅ Certificato valido (click sul lucchetto → Certificato)
- ✅ Emesso da "Let's Encrypt"
- ✅ Applicazione carica correttamente

### 6. Test Avanzati

```bash
# Test sicurezza SSL (SSL Labs)
# Apri nel browser:
https://www.ssllabs.com/ssltest/analyze.html?d=sphyrawellnesslab.duckdns.org

# Test Security Headers
https://securityheaders.com/?q=sphyrawellnesslab.duckdns.org

# Test con OpenSSL
openssl s_client -connect sphyrawellnesslab.duckdns.org:443 -servername sphyrawellnesslab.duckdns.org
```

---

## 🐛 Troubleshooting

### Problema: Certificato Non Ottenuto

**Sintomo**: Certbot fallisce con errore di validazione

```bash
# Verifica logs
docker logs sphyra-certbot
```

**Cause Comuni**:

1. **DuckDNS non punta all'IP corretto**
   ```bash
   # Verifica DNS
   nslookup sphyrawellnesslab.duckdns.org

   # Verifica IP pubblico del server
   curl ifconfig.me
   ```

   Soluzione: Aggiorna DuckDNS con l'IP corretto su https://www.duckdns.org/

2. **Porte 80/443 non raggiungibili**
   ```bash
   # Verifica firewall
   sudo ufw status
   sudo iptables -L -n | grep -E '(:80|:443)'
   ```

   Soluzione: Apri le porte
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw reload
   ```

3. **DNS non ancora propagato**

   Soluzione: Attendi 5-10 minuti e riprova

4. **Rate limiting Let's Encrypt**

   Soluzione: Usa STAGING=1 per i test, poi passa a STAGING=0

### Problema: Nginx Non Parte

```bash
# Verifica logs Nginx
docker logs sphyra-nginx

# Possibili problemi:
# - Porte già occupate
# - Configurazione errata
# - Certificati mancanti
```

**Soluzione - Porte Occupate**:
```bash
# Trova processo sulla porta 80/443
sudo lsof -i :80
sudo lsof -i :443

# Ferma il processo o ferma container conflittuali
docker ps | grep -E '80|443'
docker stop <container_id>
```

**Soluzione - Certificati Mancanti (primo avvio)**:

Nginx potrebbe fallire al primo avvio perché i certificati non esistono ancora. Questo è normale:

```bash
# Certbot otterrà i certificati e Nginx ripartirà automaticamente
docker compose -f docker-compose.letsencrypt.yml restart nginx
```

### Problema: Backend Non Raggiungibile

```bash
# Verifica backend
docker logs sphyra-backend

# Test diretto al backend (interno)
docker exec sphyra-nginx curl -I http://backend:3001/health
```

**Soluzione**:
```bash
# Restart backend
docker compose -f docker-compose.letsencrypt.yml restart backend

# Verifica variabili ambiente
docker exec sphyra-backend env | grep -E 'COUCHDB|JWT|FRONTEND'
```

### Problema: CouchDB Non Funziona

```bash
# Verifica CouchDB
docker logs sphyra-couchdb

# Test connessione
docker exec sphyra-couchdb curl http://localhost:5984
```

**Soluzione**:
```bash
# Restart CouchDB
docker compose -f docker-compose.letsencrypt.yml restart couchdb

# Verifica password
docker exec sphyra-couchdb curl -u admin:PASSWORD http://localhost:5984/_all_dbs
```

### Problema: Redirect Loop

**Sintomo**: Il browser continua a ricaricare la pagina

**Causa**: Configurazione HTTPS headers errata

**Soluzione**:
```bash
# Verifica configurazione Nginx
docker exec sphyra-nginx nginx -t

# Verifica headers
curl -I https://sphyrawellnesslab.duckdns.org
```

### Comandi Utili per Debug

```bash
# Status completo
docker compose -f docker-compose.letsencrypt.yml ps

# Logs tutti i servizi
docker compose -f docker-compose.letsencrypt.yml logs -f

# Logs specifico servizio
docker logs sphyra-nginx -f
docker logs sphyra-certbot -f
docker logs sphyra-backend -f
docker logs sphyra-frontend -f

# Entra in un container
docker exec -it sphyra-nginx sh
docker exec -it sphyra-backend sh

# Restart servizio
docker compose -f docker-compose.letsencrypt.yml restart nginx

# Rebuild completo
docker compose -f docker-compose.letsencrypt.yml down
docker compose -f docker-compose.letsencrypt.yml build --no-cache
docker compose -f docker-compose.letsencrypt.yml up -d
```

---

## 🔧 Manutenzione

### Rinnovo Certificati

I certificati Let's Encrypt sono validi per **90 giorni** e si rinnovano **automaticamente ogni 12 ore** grazie al container Certbot.

#### Verifica Rinnovo Automatico

```bash
# Verifica che Certbot sia in esecuzione
docker ps | grep certbot

# Verifica logs rinnovo
docker logs sphyra-certbot | grep renew

# Forza rinnovo manuale (test)
docker exec sphyra-certbot certbot renew --dry-run
```

#### Rinnovo Manuale (se necessario)

```bash
# Forza rinnovo
docker exec sphyra-certbot certbot renew --force-renewal

# Ricarica Nginx per usare i nuovi certificati
docker compose -f docker-compose.letsencrypt.yml restart nginx
```

### Backup

#### Backup Certificati

```bash
# Backup directory certificati
sudo tar czf certbot-backup-$(date +%Y%m%d).tar.gz certbot/

# Ripristino
sudo tar xzf certbot-backup-YYYYMMDD.tar.gz
```

#### Backup Database

```bash
# Backup CouchDB
docker run --rm \
  -v sphyrawellness_couchdb_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/couchdb-$(date +%Y%m%d).tar.gz -C /data .

# Ripristino CouchDB
docker run --rm \
  -v sphyrawellness_couchdb_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/couchdb-YYYYMMDD.tar.gz -C /data
```

### Aggiornamenti

#### Aggiorna Immagini Docker

```bash
# Pull nuove immagini
docker compose -f docker-compose.letsencrypt.yml pull

# Rebuild e restart
docker compose -f docker-compose.letsencrypt.yml up -d --build
```

#### Aggiorna Applicazione

```bash
# Pull codice aggiornato
git pull origin main

# Rebuild
docker compose -f docker-compose.letsencrypt.yml build --no-cache

# Restart con nuove immagini
docker compose -f docker-compose.letsencrypt.yml up -d
```

### Monitoraggio

```bash
# Controlla spazio disco
df -h

# Controlla uso risorse container
docker stats

# Verifica scadenza certificato
echo | openssl s_client -servername sphyrawellnesslab.duckdns.org -connect sphyrawellnesslab.duckdns.org:443 2>/dev/null | openssl x509 -noout -dates
```

---

## 🔐 Sicurezza

### Checklist Sicurezza

- [x] **DNS**: DuckDNS configurato correttamente
- [x] **Firewall**: Solo porte 80, 443 aperte
- [ ] **Passwords**: Password sicure in `.env`
- [x] **Database**: CouchDB NON esposto pubblicamente
- [x] **HTTPS**: Certificati SSL validi
- [x] **Headers**: Security headers configurati
- [ ] **Backup**: Backup regolari configurati
- [ ] **Monitoring**: Monitoraggio attivo

### Hardening Consigliato

#### 1. Password Sicure

```bash
# Genera password sicure
openssl rand -base64 32

# Aggiorna .env
nano .env
```

Modifica:
- `COUCHDB_PASSWORD`
- `JWT_SECRET`
- `VITE_ADMIN_INITIAL_PASSWORD`

#### 2. Firewall

```bash
# UFW (Ubuntu/Debian)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Verifica
sudo ufw status verbose
```

#### 3. Fail2Ban (Opzionale)

```bash
# Installa fail2ban
sudo apt-get install fail2ban

# Configura per nginx
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
```

#### 4. Aggiornamenti Sistema

```bash
# Aggiornamenti regolari
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get autoremove -y
```

### Security Headers

Le seguenti security headers sono già configurate in Nginx:

```nginx
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

Verifica:
```bash
curl -I https://sphyrawellnesslab.duckdns.org | grep -E 'Strict-Transport|X-Frame|X-Content|X-XSS|Referrer'
```

---

## 📊 Comandi Rapidi

```bash
# Start
./deploy-duckdns.sh

# Stop
docker compose -f docker-compose.letsencrypt.yml down

# Restart
docker compose -f docker-compose.letsencrypt.yml restart

# Logs
docker compose -f docker-compose.letsencrypt.yml logs -f

# Status
docker compose -f docker-compose.letsencrypt.yml ps

# Rebuild
docker compose -f docker-compose.letsencrypt.yml build --no-cache
docker compose -f docker-compose.letsencrypt.yml up -d

# Clean (ATTENZIONE: rimuove volumi!)
docker compose -f docker-compose.letsencrypt.yml down -v
```

---

## 📞 Support

### Link Utili

- **DuckDNS**: https://www.duckdns.org/
- **Let's Encrypt**: https://letsencrypt.org/
- **SSL Test**: https://www.ssllabs.com/ssltest/
- **Security Headers**: https://securityheaders.com/

### Problemi Comuni

1. Certificato non ottenuto → Verifica DNS e porte
2. Nginx non parte → Verifica porte libere
3. Backend non risponde → Verifica logs backend
4. Database errori → Verifica password CouchDB

### Logs Importanti

```bash
# Tutti i logs
docker compose -f docker-compose.letsencrypt.yml logs -f

# Certbot (certificati)
docker logs sphyra-certbot -f

# Nginx (proxy/SSL)
docker logs sphyra-nginx -f

# Backend (API)
docker logs sphyra-backend -f
```

---

## 🎯 Prossimi Passi

Dopo il deploy:

1. ✅ Verifica che l'applicazione sia accessibile su HTTPS
2. ✅ Cambia password di default in `.env`
3. ✅ Configura backup regolari
4. ✅ Testa il rinnovo automatico certificati
5. ✅ Configura monitoraggio (opzionale)
6. ✅ Esegui test SSL Labs (obiettivo: A/A+)

---

**🎉 Buon lavoro con Sphyra Wellness Lab!**

Per domande o problemi, consulta la sezione [Troubleshooting](#-troubleshooting) o verifica i logs dei container.
