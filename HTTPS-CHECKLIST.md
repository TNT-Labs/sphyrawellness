# ✅ HTTPS Deploy - Checklist Completa

Questa checklist verifica che tutti i file necessari per il deploy HTTPS siano presenti e configurati correttamente.

---

## 📁 File Creati

### Configurazioni Docker

- [x] `docker-compose.https.yml` - Compose file con Traefik + SSL
- [x] `Dockerfile.https` - Frontend ottimizzato per HTTPS
- [x] `.env.https.example` - Template configurazione environment

### Configurazioni Traefik

- [x] `traefik/traefik.yml` - Configurazione statica Traefik
- [x] `traefik/dynamic/security.yml` - Headers e middleware sicurezza

### Documentazione

- [x] `HTTPS-DEPLOYMENT.md` - Guida completa (13 sezioni)
- [x] `QUICK-START-HTTPS.md` - Quick start 5 minuti
- [x] `HTTPS-README.md` - README riassuntivo
- [x] `HTTPS-CHECKLIST.md` - Questa checklist

### Scripts

- [x] `deploy-https.sh` - Script deploy automatico
- [x] `test-https-local.sh` - Script test configurazione

### Altro

- [x] `.gitignore` - Aggiornato con certificati e backup

---

## ⚙️ Configurazione Pre-Deploy

### 1. File `.env`

```bash
# Crea da template
cp .env.https.example .env

# Modifica i valori
nano .env
```

**Valori obbligatori:**
- [ ] `DOMAIN` - Il tuo dominio (es. example.com)
- [ ] `LETSENCRYPT_EMAIL` - Email per Let's Encrypt
- [ ] `COUCHDB_PASSWORD` - Password database (NON usare default!)
- [ ] `SENDGRID_API_KEY` - API key SendGrid (se usi email)

### 2. File `traefik/traefik.yml`

- [ ] Riga 38: Modificare `main: example.com` con il tuo dominio
- [ ] Riga 55: Modificare `email: admin@example.com` con la tua email

### 3. DNS

- [ ] Record A per `@` (root domain)
- [ ] Record A per `www` (opzionale)
- [ ] DNS propagato e funzionante (`nslookup your-domain.com`)

### 4. Server

- [ ] Firewall: Porta 80 aperta
- [ ] Firewall: Porta 443 aperta
- [ ] Docker installato (v20.10+)
- [ ] Docker Compose installato (v2.0+)

---

## 🚀 Deploy

### Opzione A: Script Automatico (Consigliato)

```bash
chmod +x deploy-https.sh
./deploy-https.sh
```

Lo script verifica automaticamente:
- ✅ Prerequisiti installati
- ✅ File `.env` configurato
- ✅ DNS funzionante
- ✅ Porte disponibili
- ✅ Build e deploy servizi
- ✅ Ottenimento certificato SSL

### Opzione B: Deploy Manuale

```bash
# 1. Test configurazione
chmod +x test-https-local.sh
./test-https-local.sh

# 2. Build
docker compose -f docker-compose.https.yml build

# 3. Deploy
docker compose -f docker-compose.https.yml up -d

# 4. Verifica logs
docker logs sphyra-traefik -f
```

---

## ✅ Verifica Post-Deploy

### Test Base

- [ ] **Browser**: `https://your-domain.com` mostra lucchetto verde
- [ ] **HTTP Redirect**: `http://your-domain.com` redirige a HTTPS
- [ ] **API**: `https://your-domain.com/api/health` risponde 200

### Test cURL

```bash
# HTTPS funzionante
curl -I https://your-domain.com
# Atteso: HTTP/2 200

# HTTP redirect
curl -I http://your-domain.com
# Atteso: HTTP/1.1 301

# Security headers
curl -I https://your-domain.com | grep -i "strict-transport-security"
# Atteso: strict-transport-security: max-age=31536000
```

### Test SSL

- [ ] **SSL Labs**: [Test your domain](https://www.ssllabs.com/ssltest/)
  - Rating atteso: **A** o **A+**

- [ ] **Security Headers**: [Test headers](https://securityheaders.com/)
  - Verifica presenza HSTS, X-Frame-Options, CSP

### Verifica Certificato

```bash
# Scadenza certificato
echo | openssl s_client -servername your-domain.com \
  -connect your-domain.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Logs Traefik
docker logs sphyra-traefik 2>&1 | grep -i "certificate obtained"
```

### Verifica Servizi

```bash
# Status containers
docker compose -f docker-compose.https.yml ps
# Tutti devono essere "Up (healthy)"

# Logs errori
docker compose -f docker-compose.https.yml logs --tail=50
```

---

## 🔐 Sicurezza Post-Deploy

### Configurazione

- [ ] Dashboard Traefik **disabilitato** o protetto con auth
- [ ] Database **NON esposto** pubblicamente (verifica: `docker ps`)
- [ ] Password database **modificata** (non default!)
- [ ] File `.env` **NON committato** su Git
- [ ] Certificati salvati in volume persistente

### Headers Sicurezza

Verifica presenza di tutti questi headers:

```bash
curl -I https://your-domain.com
```

- [ ] `strict-transport-security` (HSTS)
- [ ] `x-frame-options: DENY`
- [ ] `x-content-type-options: nosniff`
- [ ] `content-security-policy`
- [ ] `referrer-policy`

### Monitoring

- [ ] Health checks attivi su tutti i servizi
- [ ] Logs accessibili e monitorati
- [ ] Alert per scadenza certificati (opzionale)

---

## 🔄 Manutenzione

### Rinnovo Certificati

- [ ] **Automatico**: Traefik rinnova 30 giorni prima scadenza
- [ ] **Verifica**: Controlla logs Traefik periodicamente
- [ ] **Backup**: Backup certificati in `./backups/`

### Aggiornamenti

```bash
# Pull immagini aggiornate
docker compose -f docker-compose.https.yml pull

# Restart con nuove immagini
docker compose -f docker-compose.https.yml up -d
```

### Backup

```bash
# Certificati
docker cp sphyra-traefik:/certificates/acme.json \
  ./backups/acme-$(date +%Y%m%d).json

# Database
docker run --rm \
  -v sphyrawellness_couchdb_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/couchdb-$(date +%Y%m%d).tar.gz -C /data .
```

---

## 🐛 Troubleshooting

### Certificato Non Ottenuto

**Problema**: `Error obtaining certificate`

**Soluzioni**:
1. Verifica DNS: `nslookup your-domain.com`
2. Verifica porte: `sudo netstat -tlnp | grep ':80\|:443'`
3. Usa staging: Cambia `certresolver=letsencrypt-staging` in compose
4. Controlla logs: `docker logs sphyra-traefik`

### Redirect Loop

**Problema**: Browser mostra `ERR_TOO_MANY_REDIRECTS`

**Soluzione**: Verifica configurazione redirect in `traefik/traefik.yml`

### Database Non Raggiungibile

**Problema**: Backend non si connette a CouchDB

**Soluzione**:
```bash
# Test connessione interna
docker exec sphyra-backend curl http://couchdb:5984/_up
# Atteso: {"status":"ok"}
```

### Mixed Content

**Problema**: Console browser mostra errori "Mixed Content"

**Soluzione**: Verifica che `VITE_API_URL` in `.env` usi `https://`

---

## 📊 Metriche di Successo

| Metrica | Target | Status |
|---------|--------|--------|
| SSL Labs Rating | A/A+ | [ ] |
| HTTPS Funzionante | 200 OK | [ ] |
| HTTP Redirect | 301 | [ ] |
| Security Headers | Tutti presenti | [ ] |
| Uptime | 99%+ | [ ] |
| Certificato Valido | Sì | [ ] |
| Database Privato | Non esposto | [ ] |

---

## 📚 Documentazione di Riferimento

1. **[HTTPS-DEPLOYMENT.md](./HTTPS-DEPLOYMENT.md)** - Guida completa
   - Architettura dettagliata
   - Configurazione step-by-step
   - Testing e verifica
   - Troubleshooting avanzato

2. **[QUICK-START-HTTPS.md](./QUICK-START-HTTPS.md)** - Quick start
   - Deploy in 5 step
   - Comandi essenziali

3. **[HTTPS-README.md](./HTTPS-README.md)** - Overview
   - Struttura file
   - Comandi utili
   - Link rapidi

---

## ✨ Prossimi Passi (Opzionali)

### Ottimizzazioni

- [ ] Configurare CDN (Cloudflare, etc.)
- [ ] Abilitare HTTP/3 (QUIC)
- [ ] Configurare rate limiting avanzato
- [ ] Implementare Web Application Firewall (WAF)

### Monitoring

- [ ] Configurare Prometheus/Grafana
- [ ] Setup alert email per errori
- [ ] Log aggregation (ELK stack)
- [ ] Uptime monitoring (UptimeRobot, etc.)

### Performance

- [ ] Configurare caching headers
- [ ] Ottimizzare immagini Docker
- [ ] Setup load balancing (se necessario)
- [ ] Configurare brotli compression

---

## 🎉 Conclusione

Se tutti i check sono ✅:

**🎊 Congratulazioni! La tua applicazione è ora completamente configurata con HTTPS!**

### Links Utili

- 🌐 **Frontend**: https://your-domain.com
- 🔧 **API**: https://your-domain.com/api/health
- 📊 **Dashboard**: https://traefik.your-domain.com (se abilitato)

### Support

Per domande o problemi:
1. Consulta [HTTPS-DEPLOYMENT.md](./HTTPS-DEPLOYMENT.md)
2. Verifica logs: `docker logs sphyra-traefik -f`
3. Test config: `docker compose -f docker-compose.https.yml config`

---

**Ultimo aggiornamento**: 2025-12-12
**Versione**: 1.0.0
