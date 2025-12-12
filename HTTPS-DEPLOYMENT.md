# 🔒 Sphyra Wellness Lab - Deploy HTTPS con Traefik

Guida completa per il deploy production con **HTTPS automatico** tramite **Traefik** e **Let's Encrypt**.

---

## 📋 Indice

1. [Architettura](#architettura)
2. [Prerequisiti](#prerequisiti)
3. [Struttura File](#struttura-file)
4. [Configurazione](#configurazione)
5. [Deploy](#deploy)
6. [Verifica HTTPS](#verifica-https)
7. [Gestione Certificati](#gestione-certificati)
8. [Troubleshooting](#troubleshooting)
9. [Sicurezza](#sicurezza)

---

## 🏗️ Architettura

```
Internet (HTTPS)
       ↓
   Traefik :443
       ↓
   ┌──────────────┬──────────────┐
   ↓              ↓              ↓
Frontend      Backend       Database
(Nginx)       (Node.js)    (CouchDB)
 :80           :3001         :5984
PUBLIC        PUBLIC        PRIVATO
```

### Componenti

- **Traefik**: Reverse proxy con SSL/TLS automatico
- **Frontend**: React PWA servito via HTTPS
- **Backend**: API Node.js servito via HTTPS
- **Database**: CouchDB accessibile solo internamente

### Sicurezza

✅ **Certificati SSL/TLS**: Let's Encrypt automatico
✅ **Redirect HTTP→HTTPS**: Automatico su tutte le route
✅ **TLS 1.2/1.3**: Solo protocolli sicuri
✅ **Security Headers**: HSTS, X-Frame-Options, CSP
✅ **Database Privato**: Non esposto pubblicamente

---

## ✅ Prerequisiti

### 1. Dominio Configurato

**OBBLIGATORIO**: Devi avere un dominio con DNS configurato.

```bash
# Il tuo dominio deve puntare al server
nslookup your-domain.com
# Output dovrebbe mostrare l'IP del tuo server
```

**Record DNS richiesti:**
```
A     @                 YOUR_SERVER_IP
A     www               YOUR_SERVER_IP
```

### 2. Porte Aperte

Assicurati che il firewall permetta:
- **Porta 80** (HTTP): Redirect e ACME challenge
- **Porta 443** (HTTPS): Traffico sicuro

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 3. Docker & Docker Compose

```bash
# Verifica installazione
docker --version
docker compose version

# Versioni minime richieste:
# Docker: 20.10+
# Docker Compose: 2.0+
```

---

## 📁 Struttura File

```
sphyrawellness/
├── docker-compose.https.yml       # Compose file HTTPS
├── Dockerfile                      # Frontend originale
├── Dockerfile.https                # Frontend per HTTPS
├── .env.https.example              # Template configurazione
├── .env                            # Configurazione (NON committare!)
│
├── traefik/
│   ├── traefik.yml                 # Configurazione statica Traefik
│   └── dynamic/
│       └── security.yml            # Headers e middleware sicurezza
│
├── server/
│   └── Dockerfile                  # Backend (invariato)
│
└── HTTPS-DEPLOYMENT.md             # Questa guida
```

---

## ⚙️ Configurazione

### Step 1: Crea File `.env`

```bash
# Copia il template
cp .env.https.example .env

# Modifica con i tuoi dati
nano .env
```

**Configurazione minima obbligatoria:**

```bash
# DOMINIO (OBBLIGATORIO!)
DOMAIN=your-domain.com

# EMAIL PER LET'S ENCRYPT (OBBLIGATORIO!)
LETSENCRYPT_EMAIL=admin@your-domain.com

# DATABASE (Cambia password!)
COUCHDB_USER=admin
COUCHDB_PASSWORD=super-secure-password-here

# SENDGRID (per email)
SENDGRID_API_KEY=SG.your-api-key
SENDGRID_FROM_EMAIL=noreply@your-domain.com
```

### Step 2: Configura Traefik

Modifica `traefik/traefik.yml`:

```yaml
# Riga 38-40: Imposta il tuo dominio
entryPoints:
  websecure:
    http:
      tls:
        domains:
          - main: your-domain.com  # ← MODIFICA QUI
            sans:
              - "*.your-domain.com"

# Riga 55: Imposta la tua email
certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@your-domain.com  # ← MODIFICA QUI
```

### Step 3: Permessi Certificati

```bash
# Crea directory per certificati
mkdir -p $(pwd)/certificates

# IMPORTANTE: Let's Encrypt richiede permessi specifici
chmod 600 $(pwd)/certificates
```

---

## 🚀 Deploy

### Testing Locale (Senza SSL)

Prima di fare deploy production, testa localmente:

```bash
# 1. Aggiungi al file /etc/hosts (Linux/Mac)
echo "127.0.0.1 test.localhost" | sudo tee -a /etc/hosts

# 2. Usa dominio di test
export DOMAIN=test.localhost

# 3. Avvia con certificato staging
docker compose -f docker-compose.https.yml up -d

# 4. Verifica funzionamento
curl -k https://test.localhost
```

### Deploy Production

```bash
# 1. Assicurati che il DNS sia configurato
nslookup your-domain.com

# 2. Build e avvio servizi
docker compose -f docker-compose.https.yml up -d --build

# 3. Verifica logs Traefik
docker logs sphyra-traefik -f

# Output atteso:
# "Obtaining certificate for your-domain.com"
# "Certificate obtained for your-domain.com"
```

### Comandi Utili

```bash
# Verifica stato servizi
docker compose -f docker-compose.https.yml ps

# Logs in tempo reale
docker compose -f docker-compose.https.yml logs -f

# Restart servizio specifico
docker compose -f docker-compose.https.yml restart frontend

# Stop completo
docker compose -f docker-compose.https.yml down

# Stop + rimozione volumi
docker compose -f docker-compose.https.yml down -v
```

---

## ✅ Verifica HTTPS

### 1. Test Browser

Apri il browser e vai su:
```
https://your-domain.com
```

**Cosa verificare:**
- ✅ Lucchetto verde nella barra indirizzi
- ✅ Certificato valido (clicca sul lucchetto → Certificato)
- ✅ HTTP reindirizza automaticamente a HTTPS

### 2. Test cURL

```bash
# Test HTTPS funzionante
curl -I https://your-domain.com

# Output atteso:
# HTTP/2 200
# strict-transport-security: max-age=31536000
# x-frame-options: DENY
# x-content-type-options: nosniff

# Test redirect HTTP → HTTPS
curl -I http://your-domain.com

# Output atteso:
# HTTP/1.1 301 Moved Permanently
# Location: https://your-domain.com/

# Test API backend
curl -I https://your-domain.com/api/health

# Output atteso:
# HTTP/2 200
```

### 3. Test SSL Labs

Verifica la qualità del certificato SSL:

```
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

**Rating atteso: A o A+**

### 4. Test Security Headers

```bash
# Verifica headers di sicurezza
curl -I https://your-domain.com | grep -i "security\|frame\|content-type"

# Output atteso:
# strict-transport-security: max-age=31536000; includeSubDomains; preload
# x-frame-options: DENY
# x-content-type-options: nosniff
# content-security-policy: ...
```

### 5. Verifica Logs Traefik

```bash
# Logs generali
docker logs sphyra-traefik

# Access logs (real-time)
docker exec sphyra-traefik tail -f /logs/access.log

# Errori certificati
docker logs sphyra-traefik 2>&1 | grep -i "certificate\|acme\|error"
```

### 6. Dashboard Traefik

Se abilitato (solo per testing!):
```
https://traefik.your-domain.com
```

**⚠️ ATTENZIONE**: In produzione, **disabilita o proteggi** il dashboard!

---

## 🔄 Gestione Certificati

### Rinnovo Automatico

Traefik rinnova **automaticamente** i certificati 30 giorni prima della scadenza.

**Verifica rinnovo automatico:**
```bash
# Logs rinnovo
docker logs sphyra-traefik 2>&1 | grep -i "renew"

# Certificati attivi
docker exec sphyra-traefik cat /certificates/acme.json | jq '.letsencrypt.Certificates[].domain'
```

### Forzare Rinnovo

```bash
# 1. Backup certificati esistenti
docker cp sphyra-traefik:/certificates/acme.json ./acme.json.backup

# 2. Rimuovi certificati
docker exec sphyra-traefik rm /certificates/acme.json

# 3. Restart Traefik
docker compose -f docker-compose.https.yml restart traefik

# 4. Verifica nuovo certificato
docker logs sphyra-traefik -f
```

### Verifica Scadenza

```bash
# Data scadenza certificato
echo | openssl s_client -servername your-domain.com \
  -connect your-domain.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Output:
# notBefore=Dec 10 12:00:00 2025 GMT
# notAfter=Mar 10 12:00:00 2026 GMT
```

### Backup Certificati

```bash
# Backup manuale
docker cp sphyra-traefik:/certificates/acme.json \
  ./backups/acme-$(date +%Y%m%d).json

# Restore
docker cp ./backups/acme-20251210.json \
  sphyra-traefik:/certificates/acme.json
docker compose -f docker-compose.https.yml restart traefik
```

---

## 🐛 Troubleshooting

### Problema: Certificato Non Ottenuto

**Sintomi:**
```
Error obtaining certificate: acme: error: 403
```

**Soluzioni:**

1. **Verifica DNS:**
   ```bash
   nslookup your-domain.com
   # Deve puntare al tuo server!
   ```

2. **Verifica porte aperte:**
   ```bash
   sudo netstat -tlnp | grep ':80\|:443'
   ```

3. **Verifica firewall:**
   ```bash
   sudo ufw status
   curl -I http://your-domain.com
   ```

4. **Usa certificato staging (test):**
   ```yaml
   # In docker-compose.https.yml
   - "traefik.http.routers.frontend.tls.certresolver=letsencrypt-staging"
   ```

### Problema: Redirect Loop

**Sintomi:** Browser mostra "ERR_TOO_MANY_REDIRECTS"

**Soluzione:**
```bash
# Verifica configurazione Traefik
docker exec sphyra-traefik cat /traefik.yml | grep -A5 "entryPoints"

# Assicurati che redirect sia solo in entryPoint "web"
```

### Problema: Mixed Content (HTTP/HTTPS)

**Sintomi:** Console browser mostra errori "Mixed Content"

**Soluzione:**
```javascript
// Assicurati che tutte le risorse usino HTTPS
// In .env:
VITE_API_URL=https://your-domain.com/api  # NON http://
```

### Problema: Database Non Raggiungibile

**Sintomi:** Backend non si connette a CouchDB

**Verifica:**
```bash
# Test connessione interna
docker exec sphyra-backend curl http://couchdb:5984/_up

# Output atteso: {"status":"ok"}
```

**Soluzione:**
```bash
# Verifica che database sia nella rete corretta
docker inspect sphyra-couchdb | grep -A10 Networks
```

### Problema: Rate Limit Let's Encrypt

**Sintomi:** Errore "too many certificates already issued"

**Soluzione:**
- Let's Encrypt ha limite di **5 certificati/settimana** per dominio
- **Usa staging durante test**: `letsencrypt-staging`
- Aspetta una settimana o usa un sottodominio diverso

### Log Debugging

```bash
# Abilita debug mode in traefik.yml
log:
  level: DEBUG  # Era INFO

# Restart
docker compose -f docker-compose.https.yml restart traefik

# Verifica logs dettagliati
docker logs sphyra-traefik -f
```

---

## 🔐 Sicurezza

### Checklist Produzione

- [ ] **Dominio configurato** con DNS valido
- [ ] **Email Let's Encrypt** valida e monitorata
- [ ] **Password database** modificata (non usare default!)
- [ ] **File `.env`** NON committato su Git (in `.gitignore`)
- [ ] **Dashboard Traefik** disabilitato o protetto con auth
- [ ] **Porte database** non esposte pubblicamente (verificato con `docker ps`)
- [ ] **Firewall attivo** con solo porte 80/443 aperte
- [ ] **Backup certificati** configurato
- [ ] **Monitoring logs** attivo
- [ ] **Security headers** verificati con SSL Labs

### Disabilitare Dashboard Traefik

In produzione, **disabilita completamente** il dashboard:

```yaml
# In docker-compose.https.yml, rimuovi:
ports:
  - "8080:8080"  # ← RIMUOVI QUESTA RIGA

labels:
  # Rimuovi tutte le label traefik-dashboard
```

Oppure proteggi con autenticazione:

```bash
# Genera password con htpasswd
docker run --rm httpd:2.4-alpine htpasswd -nb admin your-password

# Output: admin:$apr1$xyz...
# Aggiungi a traefik/dynamic/security.yml
```

### Network Isolation

```yaml
# La rete sphyra-network è INTERNA
networks:
  sphyra-network:
    driver: bridge
    internal: true  # ← Database NON raggiungibile da internet
```

### Aggiornamenti

```bash
# Aggiorna immagini regolarmente
docker compose -f docker-compose.https.yml pull
docker compose -f docker-compose.https.yml up -d

# Verifica vulnerabilità
docker scout cves sphyra-backend
```

---

## 📊 Monitoring

### Health Checks

Tutti i servizi hanno health check configurati:

```bash
# Verifica stato
docker compose -f docker-compose.https.yml ps

# Output:
# NAME               STATUS
# sphyra-traefik     Up (healthy)
# sphyra-frontend    Up (healthy)
# sphyra-backend     Up (healthy)
# sphyra-couchdb     Up (healthy)
```

### Logs Centralizzati

```bash
# Logs di tutti i servizi
docker compose -f docker-compose.https.yml logs -f

# Logs specifici
docker logs sphyra-frontend -f
docker logs sphyra-backend -f
docker logs sphyra-couchdb -f
docker logs sphyra-traefik -f
```

### Metriche Prometheus (Opzionale)

Abilita metriche in `traefik/traefik.yml`:

```yaml
metrics:
  prometheus:
    entryPoint: websecure
    addEntryPointsLabels: true
```

Accedi alle metriche:
```
https://your-domain.com/metrics
```

---

## 🎯 Best Practices

1. **Testa sempre con staging** prima di usare certificati production
2. **Backup regolari** di certificati e database
3. **Monitora scadenza** certificati (anche se rinnovano automaticamente)
4. **Aggiorna Docker** e immagini regolarmente
5. **Rivedi security headers** periodicamente
6. **Non esporre** servizi non necessari
7. **Usa `.env` diversi** per dev/staging/production
8. **Documenta modifiche** custom

---

## 📚 Risorse

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- [Security Headers Test](https://securityheaders.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)

---

## 💬 Support

Per problemi o domande:

1. Verifica [Troubleshooting](#troubleshooting)
2. Controlla logs: `docker logs sphyra-traefik -f`
3. Testa configurazione: `docker compose -f docker-compose.https.yml config`

---

**🎉 Congratulazioni! La tua applicazione è ora servita in HTTPS sicuro!**
