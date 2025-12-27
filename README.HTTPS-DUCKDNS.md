# 🔒 HTTPS con DuckDNS - Configurazione Senza Porta 80

Questa guida ti permette di configurare HTTPS con certificati SSL/TLS validi usando **solo la porta 443**, senza bisogno della porta 80.

## 📋 Panoramica

- ✅ **Certificati validi** Let's Encrypt
- ✅ **Solo porta HTTPS (443)** - Nessun bisogno della porta 80
- ✅ **DNS-01 Challenge** con DuckDNS
- ✅ **Rinnovo automatico** ogni 12 ore
- ✅ **Configurazione semplice** in 4 passi

## 🎯 Requisiti

### 1. Porta 443 Instradata

Nel tuo router Fastweb, configura il port forwarding:
- **Porta esterna:** 443
- **Porta interna:** 443
- **Protocollo:** TCP
- **IP destinazione:** 192.168.1.75 (il tuo server)

> ⚠️ **IMPORTANTE:** La porta 80 NON è necessaria!

### 2. Account DuckDNS

1. Vai su [https://www.duckdns.org](https://www.duckdns.org)
2. Fai login con Google, GitHub o altri provider
3. Crea un sottodominio (es: `sphyrawellnesslab`)
4. Configura il sottodominio per puntare al tuo **IP pubblico**
5. Copia il **token** dalla pagina principale (in alto)

> 💡 **Trova il tuo IP pubblico:** Visita [https://whatismyip.com](https://whatismyip.com)

### 3. Docker e Docker Compose

Assicurati di avere installato:
- Docker 20.10+
- Docker Compose 2.0+

## 🚀 Setup Iniziale

### Passo 1: Configurazione Variabili

Copia il file di esempio e configuralo:

```bash
cp .env.duckdns.example .env
nano .env
```

Configura almeno queste variabili **obbligatorie**:

```bash
# Il tuo dominio DuckDNS
DOMAIN=sphyrawellnesslab.duckdns.org

# La tua email per notifiche Let's Encrypt
EMAIL=tua@email.com

# Il token DuckDNS (copiato dal sito)
DUCKDNS_TOKEN=12345678-1234-1234-1234-123456789abc

# Password sicure
POSTGRES_PASSWORD=una_password_sicura_qui
JWT_SECRET=genera_con_openssl_rand_base64_32
```

> 💡 **Genera JWT_SECRET sicuro:**
> ```bash
> openssl rand -base64 32
> ```

### Passo 2: Ottieni i Certificati SSL

Esegui lo script di setup:

```bash
chmod +x scripts/get-cert-duckdns.sh
./scripts/get-cert-duckdns.sh
```

Questo processo:
1. Valida la configurazione
2. Crea il record TXT su DuckDNS
3. Richiede il certificato a Let's Encrypt
4. Salva i certificati in `certbot/conf/`

> ⏱️ **Tempo richiesto:** 2-3 minuti (inclusa propagazione DNS)

### Passo 3: Avvia l'Applicazione

```bash
docker compose -f docker-compose.duckdns.yml up -d
```

Questo avvia:
- **Nginx** - Reverse proxy HTTPS (porta 443)
- **Certbot** - Rinnovo automatico certificati
- **Backend** - API Node.js + Express
- **Frontend** - React PWA
- **PostgreSQL** - Database

### Passo 4: Verifica

Apri il browser e visita:

```
https://sphyrawellnesslab.duckdns.org
```

Dovresti vedere:
- ✅ Lucchetto verde nel browser
- ✅ Certificato valido emesso da Let's Encrypt
- ✅ Applicazione funzionante

## 🔄 Rinnovo Automatico

I certificati Let's Encrypt scadono dopo **90 giorni**.

Il rinnovo automatico è già configurato:
- **Frequenza:** Ogni 12 ore
- **Metodo:** DNS-01 Challenge
- **Nessuna azione richiesta**

Certbot verificherà automaticamente se i certificati hanno meno di 30 giorni prima della scadenza e li rinnoverà.

## 📊 Monitoraggio

### Controlla lo stato dei container

```bash
docker compose -f docker-compose.duckdns.yml ps
```

### Visualizza i log

```bash
# Tutti i servizi
docker compose -f docker-compose.duckdns.yml logs -f

# Solo Nginx
docker compose -f docker-compose.duckdns.yml logs -f nginx

# Solo Certbot
docker compose -f docker-compose.duckdns.yml logs -f certbot

# Solo Backend
docker compose -f docker-compose.duckdns.yml logs -f backend
```

### Verifica certificato

```bash
# Info sul certificato
docker compose -f docker-compose.duckdns.yml exec nginx \
  openssl x509 -in /etc/letsencrypt/live/sphyrawellnesslab.duckdns.org/fullchain.pem -text -noout

# Data di scadenza
docker compose -f docker-compose.duckdns.yml exec nginx \
  openssl x509 -in /etc/letsencrypt/live/sphyrawellnesslab.duckdns.org/fullchain.pem -enddate -noout
```

## 🔧 Gestione

### Riavvia i servizi

```bash
docker compose -f docker-compose.duckdns.yml restart
```

### Ferma i servizi

```bash
docker compose -f docker-compose.duckdns.yml down
```

### Aggiorna l'applicazione

```bash
# Ferma i servizi
docker compose -f docker-compose.duckdns.yml down

# Ricostruisci le immagini
docker compose -f docker-compose.duckdns.yml build --no-cache

# Riavvia
docker compose -f docker-compose.duckdns.yml up -d
```

### Forza rinnovo certificato

Se vuoi forzare il rinnovo del certificato (es: per test):

```bash
docker compose -f docker-compose.duckdns.yml exec certbot \
  certbot renew --force-renewal \
  --manual \
  --preferred-challenges dns \
  --manual-auth-hook /usr/local/bin/duckdns-auth.sh \
  --manual-cleanup-hook /usr/local/bin/duckdns-cleanup.sh
```

## ❓ Troubleshooting

### Problema: "Certificato non valido" nel browser

**Possibili cause:**
1. I certificati non sono stati ottenuti correttamente
2. Nginx non trova i certificati

**Soluzione:**
```bash
# Controlla che i certificati esistano
ls -la certbot/conf/live/sphyrawellnesslab.duckdns.org/

# Se mancano, ri-ottieni i certificati
./scripts/get-cert-duckdns.sh

# Riavvia nginx
docker compose -f docker-compose.duckdns.yml restart nginx
```

### Problema: "Connection refused" o "Site can't be reached"

**Possibili cause:**
1. Port forwarding non configurato correttamente
2. Firewall che blocca la porta 443
3. Nginx non è in esecuzione

**Soluzione:**
```bash
# Verifica che nginx sia in esecuzione
docker compose -f docker-compose.duckdns.yml ps nginx

# Controlla i log nginx
docker compose -f docker-compose.duckdns.yml logs nginx

# Verifica che la porta 443 sia in ascolto
netstat -tuln | grep 443

# Testa dal server locale
curl -k https://localhost
```

### Problema: Script get-cert-duckdns.sh fallisce

**Possibili cause:**
1. Token DuckDNS non valido
2. Dominio non configurato su DuckDNS
3. Dominio non punta all'IP pubblico corretto

**Soluzione:**
```bash
# Verifica il token DuckDNS
# Vai su https://www.duckdns.org e controlla

# Testa manualmente l'API DuckDNS
curl "https://www.duckdns.org/update?domains=sphyrawellnesslab&token=IL_TUO_TOKEN&ip="

# Verifica che il dominio risolva all'IP pubblico
nslookup sphyrawellnesslab.duckdns.org

# Verifica il tuo IP pubblico
curl https://api.ipify.org
```

### Problema: Rinnovo automatico non funziona

**Soluzione:**
```bash
# Controlla i log del container certbot
docker compose -f docker-compose.duckdns.yml logs certbot

# Riavvia certbot
docker compose -f docker-compose.duckdns.yml restart certbot

# Testa il rinnovo manualmente (dry-run)
docker compose -f docker-compose.duckdns.yml exec certbot \
  certbot renew --dry-run \
  --manual \
  --preferred-challenges dns \
  --manual-auth-hook /usr/local/bin/duckdns-auth.sh \
  --manual-cleanup-hook /usr/local/bin/duckdns-cleanup.sh
```

### Problema: "Backend API non raggiungibile"

**Soluzione:**
```bash
# Verifica che il backend sia in esecuzione
docker compose -f docker-compose.duckdns.yml ps backend

# Controlla i log backend
docker compose -f docker-compose.duckdns.yml logs backend

# Testa direttamente l'endpoint di health
docker compose -f docker-compose.duckdns.yml exec backend curl http://localhost:3001/health

# Verifica la connessione al database
docker compose -f docker-compose.duckdns.yml logs postgres
```

## 🔐 Sicurezza

### Best Practices

1. **Cambia le password di default** in `.env`:
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`
   - `VITE_ADMIN_INITIAL_PASSWORD`

2. **Mantieni segreto il token DuckDNS**:
   - Non committare `.env` su git
   - `.env` è già in `.gitignore`

3. **Aggiorna regolarmente**:
   ```bash
   docker compose -f docker-compose.duckdns.yml pull
   docker compose -f docker-compose.duckdns.yml up -d
   ```

4. **Monitora i log** per attività sospette:
   ```bash
   docker compose -f docker-compose.duckdns.yml logs -f nginx | grep -E "POST|DELETE|PUT"
   ```

### Headers di Sicurezza

Nginx è configurato con header di sicurezza moderni:
- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options`
- `X-Content-Type-Options`
- `X-XSS-Protection`
- `Referrer-Policy`
- `Permissions-Policy`

## 📚 Riferimenti

- [Let's Encrypt](https://letsencrypt.org/)
- [DuckDNS](https://www.duckdns.org/)
- [Certbot](https://certbot.eff.org/)
- [Nginx](https://nginx.org/)

## 🆘 Supporto

Se hai problemi:
1. Controlla la sezione [Troubleshooting](#-troubleshooting)
2. Verifica i log: `docker compose -f docker-compose.duckdns.yml logs`
3. Apri un issue su GitHub con i log del problema

## 📝 Note Tecniche

### Perché DNS-01 invece di HTTP-01?

**HTTP-01** (metodo standard):
- ✅ Più semplice
- ❌ Richiede porta 80 aperta
- ❌ Non funziona se la porta 80 è bloccata

**DNS-01** (questo setup):
- ✅ Funziona senza porta 80
- ✅ Supporta wildcard certificates
- ✅ Perfetto per situazioni come la tua
- ⚠️ Richiede accesso all'API DNS

### Come funziona il DNS-01 Challenge?

1. Certbot richiede un certificato per il tuo dominio
2. Let's Encrypt chiede di creare un record TXT: `_acme-challenge.sphyrawellnesslab.duckdns.org`
3. Lo script `duckdns-auth.sh` crea il record tramite API DuckDNS
4. Let's Encrypt verifica il record TXT
5. Se valido, emette il certificato
6. Lo script `duckdns-cleanup.sh` rimuove il record TXT

### Struttura File

```
sphyrawellness/
├── docker-compose.duckdns.yml          # Configurazione Docker per DuckDNS
├── .env                                # Variabili di ambiente (non in git)
├── .env.duckdns.example                # Template variabili
├── nginx/
│   ├── nginx.conf                      # Configurazione base Nginx
│   └── conf.d/
│       └── sphyra-duckdns.conf        # Virtual host HTTPS
├── docker/
│   └── certbot/
│       └── Dockerfile.duckdns          # Certbot con curl
├── scripts/
│   ├── get-cert-duckdns.sh            # Ottieni certificato iniziale
│   ├── duckdns-auth.sh                # Autenticazione DNS-01
│   └── duckdns-cleanup.sh             # Cleanup DNS-01
└── certbot/
    └── conf/
        └── live/
            └── sphyrawellnesslab.duckdns.org/
                ├── fullchain.pem       # Certificato completo
                ├── privkey.pem         # Chiave privata
                └── chain.pem           # Chain intermedia
```

## ✨ Vantaggi di Questo Setup

1. ✅ **Nessuna porta 80 richiesta** - Perfetto per la tua situazione con Fastweb
2. ✅ **Certificati validi** - Nessun warning nel browser
3. ✅ **Rinnovo automatico** - Zero manutenzione
4. ✅ **Gratuito** - Let's Encrypt + DuckDNS sono gratis
5. ✅ **Sicuro** - TLS 1.2/1.3 + header di sicurezza moderni
6. ✅ **Semplice** - Setup in 4 passi

---

**🎉 Buon utilizzo di Sphyra Wellness Lab in HTTPS!**
