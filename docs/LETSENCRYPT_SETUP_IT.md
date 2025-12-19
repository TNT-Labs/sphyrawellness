# Guida Completa: Configurazione Let's Encrypt per Sphyra Wellness

## 📋 Indice

1. [Introduzione](#introduzione)
2. [Prerequisiti](#prerequisiti)
3. [Configurazione Iniziale](#configurazione-iniziale)
4. [Installazione Certificati](#installazione-certificati)
5. [Avvio Servizi](#avvio-servizi)
6. [Verifica Configurazione](#verifica-configurazione)
7. [Rinnovo Certificati](#rinnovo-certificati)
8. [Risoluzione Problemi](#risoluzione-problemi)
9. [Domande Frequenti](#domande-frequenti)

---

## 📖 Introduzione

Questa guida ti aiuterà a configurare certificati SSL/TLS **validi e fidati** per Sphyra Wellness utilizzando **Let's Encrypt**.

### Cos'è Let's Encrypt?

Let's Encrypt è un'autorità di certificazione (CA) **gratuita, automatizzata e aperta** che fornisce certificati SSL/TLS per abilitare HTTPS sui siti web.

### Vantaggi

✅ **Gratuito**: Nessun costo per i certificati
✅ **Fidato**: Riconosciuto da tutti i browser moderni
✅ **Automatico**: Rinnovo automatico ogni 90 giorni
✅ **Sicuro**: Crittografia TLS 1.2 e 1.3
✅ **Nessun warning**: I browser non mostreranno avvisi di sicurezza

### Differenze con Certificati Self-Signed

| Caratteristica | Self-Signed | Let's Encrypt |
|----------------|-------------|---------------|
| Costo | Gratuito | Gratuito |
| Fidato dai browser | ❌ No | ✅ Sì |
| Avvisi di sicurezza | ⚠️ Sì | ✅ No |
| Validità | Configurabile | 90 giorni |
| Rinnovo | Manuale | Automatico |
| Dominio pubblico richiesto | ❌ No | ✅ Sì |

---

## ✅ Prerequisiti

### 1. Dominio Pubblico

**OBBLIGATORIO**: Devi possedere un dominio pubblico (es. `esempio.com`)

- ✅ Domini registrati presso provider (GoDaddy, Namecheap, CloudFlare, ecc.)
- ❌ Domini locali (`.local`, `localhost`)
- ❌ Indirizzi IP (Let's Encrypt non emette certificati per IP)

### 2. DNS Configurato

Il tuo dominio **DEVE** puntare all'IP pubblico del server:

```bash
# Verifica DNS (sostituisci con il tuo dominio)
nslookup esempio.com
# oppure
dig esempio.com
```

**Risultato atteso**: L'IP mostrato deve corrispondere all'IP pubblico del tuo server.

### 3. Porte Aperte

Le seguenti porte devono essere **aperte e raggiungibili** dall'esterno:

- **Porta 80 (HTTP)**: Necessaria per la validazione ACME di Let's Encrypt
- **Porta 443 (HTTPS)**: Per il traffico HTTPS

#### Verifica porte aperte

```bash
# Verifica porta 80
nc -zv tuo-ip-pubblico 80

# Verifica porta 443
nc -zv tuo-ip-pubblico 443
```

### 4. Firewall e Router

Assicurati che:

- ✅ Il firewall del server permetta traffico su porte 80 e 443
- ✅ Il router/NAT inoltri le porte 80 e 443 al server
- ✅ Non ci siano altri servizi in ascolto su queste porte

#### Configurazione Firewall (UFW su Ubuntu/Debian)

```bash
# Abilita firewall
sudo ufw enable

# Permetti porte HTTP e HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verifica regole
sudo ufw status
```

#### Configurazione Firewall (firewalld su CentOS/RHEL)

```bash
# Permetti porte HTTP e HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Verifica regole
sudo firewall-cmd --list-all
```

### 5. Software Richiesto

- Docker (versione 20.10+)
- Docker Compose (versione 2.0+)

#### Verifica versioni

```bash
docker --version
docker-compose --version
```

---

## ⚙️ Configurazione Iniziale

### 1. Crea File Ambiente

Copia il file di esempio e modificalo:

```bash
cp .env.letsencrypt.example .env
```

### 2. Modifica Configurazione

Apri il file `.env` e configura:

```bash
nano .env
# oppure
vim .env
```

#### Parametri Obbligatori

```bash
# Il tuo dominio pubblico
DOMAIN=esempio.com

# La tua email (per notifiche Let's Encrypt)
EMAIL=tua@email.com

# Modalità: 0 = production, 1 = staging (test)
STAGING=0
```

#### Parametri Database

```bash
COUCHDB_USER=admin
COUCHDB_PASSWORD=password-sicura-da-cambiare
```

**⚠️ IMPORTANTE**: Cambia `COUCHDB_PASSWORD` con una password sicura!

#### Parametri Backend

```bash
# JWT Secret per autenticazione
JWT_SECRET=stringa-casuale-molto-lunga-e-sicura

# SendGrid (opzionale, per invio email)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@esempio.com
SENDGRID_FROM_NAME=Sphyra Wellness Lab
```

**Generare JWT Secret sicuro**:

```bash
# Genera stringa casuale di 64 caratteri
openssl rand -base64 64
```

### 3. Modalità Staging vs Production

#### Staging (Test) - Consigliato per il primo test

```bash
STAGING=1
```

- ✅ **Vantaggi**: Nessun limite di rate, perfetto per test
- ⚠️ **Svantaggi**: Certificati NON fidati dai browser (vedrai warning)

#### Production (Produzione)

```bash
STAGING=0
```

- ✅ **Vantaggi**: Certificati validi, nessun warning browser
- ⚠️ **Limiti**: Max 50 certificati/settimana per dominio ([Rate Limits](https://letsencrypt.org/docs/rate-limits/))

**Raccomandazione**:
1. Prima esegui un test con `STAGING=1`
2. Se funziona, rimuovi i certificati di test
3. Cambia in `STAGING=0` e rigenera

---

## 🚀 Installazione Certificati

### Script Automatico

Il modo più semplice è usare lo script di inizializzazione:

```bash
# Rendi eseguibile lo script
chmod +x scripts/init-letsencrypt.sh

# Esegui lo script
./scripts/init-letsencrypt.sh
```

### Cosa fa lo script?

1. ✅ Verifica configurazione `.env`
2. ✅ Crea directory necessarie
3. ✅ Scarica parametri SSL raccomandati
4. ✅ Crea certificato dummy temporaneo
5. ✅ Avvia Nginx
6. ✅ Richiede certificato Let's Encrypt
7. ✅ Ricarica Nginx con il nuovo certificato

### Output Esempio

```
=========================================
   Sphyra Wellness - Let's Encrypt Setup
=========================================

Configurazione:
  Dominio: esempio.com
  Email: tua@email.com
  Ambiente: Production

Continuare con questa configurazione? (y/n) y

✓ Parametri SSL scaricati
✓ Certificato dummy creato
✓ Nginx avviato
✓ Certificato dummy rimosso
✓ Certificato Let's Encrypt ottenuto con successo!
✓ Nginx ricaricato

=========================================
  Setup completato con successo!
=========================================

Il tuo sito è ora accessibile tramite HTTPS su:
  https://esempio.com
```

### Procedura Manuale (Alternativa)

Se preferisci configurare manualmente:

#### 1. Crea directory

```bash
mkdir -p certbot/conf
mkdir -p certbot/www
```

#### 2. Scarica parametri SSL

```bash
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf

curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem
```

#### 3. Crea certificato dummy

```bash
docker-compose -f docker-compose.letsencrypt.yml run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
  -keyout '/etc/letsencrypt/live/$DOMAIN/privkey.pem' \
  -out '/etc/letsencrypt/live/$DOMAIN/fullchain.pem' \
  -subj '/CN=localhost'" certbot
```

Sostituisci `$DOMAIN` con il tuo dominio.

#### 4. Avvia Nginx

```bash
docker-compose -f docker-compose.letsencrypt.yml up -d nginx
```

#### 5. Rimuovi certificato dummy

```bash
docker-compose -f docker-compose.letsencrypt.yml run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$DOMAIN && \
  rm -rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot
```

#### 6. Richiedi certificato Let's Encrypt

**Production**:
```bash
docker-compose -f docker-compose.letsencrypt.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email tua@email.com \
  --agree-tos \
  --no-eff-email \
  -d esempio.com
```

**Staging** (per test):
```bash
docker-compose -f docker-compose.letsencrypt.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email tua@email.com \
  --agree-tos \
  --no-eff-email \
  --staging \
  -d esempio.com
```

#### 7. Ricarica Nginx

```bash
docker-compose -f docker-compose.letsencrypt.yml exec nginx nginx -s reload
```

---

## 🎯 Avvio Servizi

### Prima Volta

```bash
docker-compose -f docker-compose.letsencrypt.yml up -d
```

### Verifica Stato

```bash
docker-compose -f docker-compose.letsencrypt.yml ps
```

**Output atteso**:

```
NAME                 STATUS         PORTS
sphyra-nginx         Up (healthy)   0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
sphyra-certbot       Up
sphyra-backend       Up (healthy)
sphyra-frontend      Up (healthy)
sphyra-couchdb       Up (healthy)   0.0.0.0:5984->5984/tcp
```

### Visualizza Log

```bash
# Tutti i servizi
docker-compose -f docker-compose.letsencrypt.yml logs -f

# Solo Nginx
docker-compose -f docker-compose.letsencrypt.yml logs -f nginx

# Solo Certbot
docker-compose -f docker-compose.letsencrypt.yml logs -f certbot
```

### Fermare Servizi

```bash
docker-compose -f docker-compose.letsencrypt.yml down
```

### Riavviare Servizi

```bash
docker-compose -f docker-compose.letsencrypt.yml restart
```

---

## ✔️ Verifica Configurazione

### 1. Verifica HTTPS nel Browser

Apri il browser e vai a:

```
https://tuo-dominio.com
```

**Cosa verificare**:
- ✅ Nessun warning di sicurezza
- ✅ Lucchetto verde nella barra degli indirizzi
- ✅ Certificato valido (clicca sul lucchetto → Certificato)

### 2. Verifica Certificato Online

Usa strumenti online per verificare la configurazione SSL:

- **SSL Labs**: https://www.ssllabs.com/ssltest/
- **SSL Checker**: https://www.sslshopper.com/ssl-checker.html

**Punteggio atteso**: A o A+

### 3. Verifica Redirect HTTP → HTTPS

```bash
curl -I http://tuo-dominio.com
```

**Output atteso**:
```
HTTP/1.1 301 Moved Permanently
Location: https://tuo-dominio.com/
```

### 4. Verifica Informazioni Certificato

```bash
# Visualizza informazioni certificato
docker-compose -f docker-compose.letsencrypt.yml run --rm certbot certificates
```

**Output esempio**:
```
Certificate Name: esempio.com
  Domains: esempio.com
  Expiry Date: 2024-03-15 12:34:56+00:00 (VALID: 89 days)
  Certificate Path: /etc/letsencrypt/live/esempio.com/fullchain.pem
  Private Key Path: /etc/letsencrypt/live/esempio.com/privkey.pem
```

### 5. Verifica Scadenza Certificato

```bash
# Via OpenSSL
echo | openssl s_client -servername tuo-dominio.com -connect tuo-dominio.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Output esempio**:
```
notBefore=Dec 16 10:23:45 2024 GMT
notAfter=Mar 15 10:23:44 2025 GMT
```

### 6. Verifica HSTS Header

```bash
curl -I https://tuo-dominio.com
```

Cerca l'header:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 🔄 Rinnovo Certificati

### Rinnovo Automatico

I certificati Let's Encrypt scadono dopo **90 giorni**. Il rinnovo è **completamente automatico**.

Il container `certbot` controlla **ogni 12 ore** se i certificati necessitano di rinnovo e li rinnova automaticamente quando mancano **30 giorni** alla scadenza.

**Non devi fare nulla!** 🎉

### Rinnovo Manuale (Opzionale)

Se vuoi rinnovare manualmente (es. per test):

```bash
# Usa lo script
chmod +x scripts/renew-certificates.sh
./scripts/renew-certificates.sh
```

Oppure manualmente:

```bash
# Rinnova certificati
docker-compose -f docker-compose.letsencrypt.yml run --rm certbot renew --webroot --webroot-path=/var/www/certbot

# Ricarica Nginx
docker-compose -f docker-compose.letsencrypt.yml exec nginx nginx -s reload
```

### Verifica Log Rinnovo

```bash
docker-compose -f docker-compose.letsencrypt.yml logs certbot | grep -i renew
```

### Forzare Rinnovo (Solo Test)

⚠️ **ATTENZIONE**: Usa solo per test, rispetta i rate limits!

```bash
docker-compose -f docker-compose.letsencrypt.yml run --rm certbot renew --force-renewal --webroot --webroot-path=/var/www/certbot
```

---

## 🔧 Risoluzione Problemi

### Problema: "Failed to connect to the ACME server"

**Causa**: Problemi di connettività verso Let's Encrypt

**Soluzione**:
```bash
# Verifica connessione internet
ping 8.8.8.8

# Verifica DNS
nslookup acme-v02.api.letsencrypt.org

# Verifica firewall in uscita
curl -I https://acme-v02.api.letsencrypt.org
```

### Problema: "Challenge failed for domain"

**Causa**: Let's Encrypt non riesce a raggiungere il tuo server sulla porta 80

**Soluzione**:

1. Verifica DNS:
```bash
nslookup tuo-dominio.com
```

2. Verifica porta 80 aperta:
```bash
# Da un server esterno
telnet tuo-ip-pubblico 80
```

3. Verifica Nginx risponda su porta 80:
```bash
docker-compose -f docker-compose.letsencrypt.yml logs nginx
```

4. Test manuale ACME challenge:
```bash
# Crea file di test
mkdir -p certbot/www/.well-known/acme-challenge
echo "test" > certbot/www/.well-known/acme-challenge/test.txt

# Verifica accessibilità
curl http://tuo-dominio.com/.well-known/acme-challenge/test.txt
```

### Problema: "Too many certificates already issued"

**Causa**: Hai superato i rate limits di Let's Encrypt (50 certificati/settimana)

**Soluzione**:
- Usa modalità staging per test: `STAGING=1`
- Aspetta qualche giorno
- Vedi limiti: https://letsencrypt.org/docs/rate-limits/

### Problema: Certificato Staging Non Fidato

**Causa**: Stai usando `STAGING=1`

**Soluzione**:
```bash
# 1. Ferma servizi
docker-compose -f docker-compose.letsencrypt.yml down

# 2. Rimuovi certificati staging
rm -rf certbot/

# 3. Cambia in production
# Modifica .env: STAGING=0

# 4. Rigenera certificati
./scripts/init-letsencrypt.sh
```

### Problema: "Nginx failed to reload"

**Causa**: Errore nella configurazione Nginx

**Soluzione**:
```bash
# Test configurazione
docker-compose -f docker-compose.letsencrypt.yml exec nginx nginx -t

# Visualizza errori
docker-compose -f docker-compose.letsencrypt.yml logs nginx
```

### Problema: "Address already in use"

**Causa**: Altra applicazione usa le porte 80 o 443

**Soluzione**:
```bash
# Trova processo sulla porta 80
sudo lsof -i :80

# Trova processo sulla porta 443
sudo lsof -i :443

# Ferma processo (esempio Apache)
sudo systemctl stop apache2
```

### Problema: Container Certbot si riavvia continuamente

**Causa**: Errore nella configurazione o nel comando certbot

**Soluzione**:
```bash
# Visualizza log dettagliati
docker-compose -f docker-compose.letsencrypt.yml logs --tail=100 certbot

# Verifica file .env
cat .env | grep -E 'DOMAIN|EMAIL|STAGING'
```

### Debug Generale

```bash
# Stato container
docker-compose -f docker-compose.letsencrypt.yml ps

# Log tutti i servizi
docker-compose -f docker-compose.letsencrypt.yml logs

# Shell nel container Nginx
docker-compose -f docker-compose.letsencrypt.yml exec nginx /bin/sh

# Lista certificati
ls -la certbot/conf/live/

# Test connessione backend
docker-compose -f docker-compose.letsencrypt.yml exec nginx wget -O- http://backend:3001/health
```

---

## ❓ Domande Frequenti

### Posso usare Let's Encrypt per una rete locale?

**No**. Let's Encrypt richiede un dominio pubblico raggiungibile da internet. Per reti locali usa certificati self-signed.

### Quanto durano i certificati Let's Encrypt?

**90 giorni**. Il rinnovo automatico avviene ogni 12 ore quando mancano 30 giorni alla scadenza.

### Posso usare un sottodominio?

**Sì**. Esempio:
```bash
DOMAIN=app.esempio.com
```

### Posso usare certificati wildcard?

**Sì**, ma richiede validazione DNS (più complessa). Questa guida copre solo la validazione HTTP (webroot).

Per wildcard: `DOMAIN=*.esempio.com` + configurazione DNS challenge

### Cosa succede se il server è offline durante il rinnovo?

Il rinnovo fallirà, ma certbot riproverà automaticamente ogni 12 ore. Hai 30 giorni di tempo prima della scadenza.

### Posso migrare i certificati su un altro server?

**Sì**. Copia la directory `certbot/` sul nuovo server.

### Come aggiorno la configurazione Nginx?

1. Modifica il file `nginx/conf.d/sphyra-letsencrypt.conf`
2. Test configurazione:
   ```bash
   docker-compose -f docker-compose.letsencrypt.yml exec nginx nginx -t
   ```
3. Ricarica Nginx:
   ```bash
   docker-compose -f docker-compose.letsencrypt.yml exec nginx nginx -s reload
   ```

### Come cambio dominio?

1. Aggiorna `.env` con nuovo dominio
2. Rimuovi vecchi certificati: `rm -rf certbot/`
3. Rigenera: `./scripts/init-letsencrypt.sh`

### Come aggiungo più domini allo stesso certificato?

Modifica lo script di init o usa manualmente:

```bash
docker-compose -f docker-compose.letsencrypt.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email tua@email.com \
  --agree-tos \
  -d dominio1.com \
  -d dominio2.com \
  -d www.dominio1.com
```

### Dove sono salvati i certificati?

```
certbot/
├── conf/
│   ├── live/
│   │   └── tuo-dominio.com/
│   │       ├── fullchain.pem    # Certificato completo
│   │       ├── privkey.pem      # Chiave privata
│   │       └── chain.pem        # Catena certificati
│   └── renewal/                 # Configurazione rinnovo
└── www/                         # ACME challenge
```

### Come faccio il backup dei certificati?

```bash
# Backup
tar -czf certbot-backup-$(date +%Y%m%d).tar.gz certbot/

# Restore
tar -xzf certbot-backup-20241216.tar.gz
```

### Posso usare Cloudflare con Let's Encrypt?

**Sì**, ma disabilita il proxy arancione (orange cloud) durante la generazione del certificato, altrimenti la validazione potrebbe fallire.

### Come verifico i log di Let's Encrypt?

```bash
# Log certbot
docker-compose -f docker-compose.letsencrypt.yml logs certbot

# Log dettagliati Let's Encrypt
docker-compose -f docker-compose.letsencrypt.yml exec certbot cat /var/log/letsencrypt/letsencrypt.log
```

---

## 📚 Risorse Aggiuntive

### Documentazione Ufficiale

- **Let's Encrypt**: https://letsencrypt.org/docs/
- **Certbot**: https://certbot.eff.org/
- **Rate Limits**: https://letsencrypt.org/docs/rate-limits/
- **FAQ Let's Encrypt**: https://letsencrypt.org/docs/faq/

### Tool Utili

- **SSL Labs Test**: https://www.ssllabs.com/ssltest/
- **SSL Checker**: https://www.sslshopper.com/ssl-checker.html
- **DNS Checker**: https://dnschecker.org/
- **Security Headers**: https://securityheaders.com/

### Community

- **Let's Encrypt Community**: https://community.letsencrypt.org/
- **Certbot GitHub**: https://github.com/certbot/certbot

---

## 📞 Supporto

Se riscontri problemi:

1. Consulta la sezione [Risoluzione Problemi](#risoluzione-problemi)
2. Verifica i log: `docker-compose -f docker-compose.letsencrypt.yml logs`
3. Cerca nella [Let's Encrypt Community](https://community.letsencrypt.org/)

---

## 📝 Note Finali

### Sicurezza

- ✅ Cambia sempre le password di default
- ✅ Usa JWT secret sicuri e casuali
- ✅ Mantieni Docker aggiornato
- ✅ Monitora i log regolarmente

### Manutenzione

- ✅ Il rinnovo è automatico, ma controlla periodicamente
- ✅ Fai backup regolari dei certificati
- ✅ Monitora le email di Let's Encrypt per notifiche

### Best Practices

- ✅ Testa sempre con staging prima di production
- ✅ Usa domini reali, non di test
- ✅ Configura correttamente DNS prima di iniziare
- ✅ Verifica che porte 80 e 443 siano raggiungibili

---

**Buon lavoro con Sphyra Wellness! 🚀**
