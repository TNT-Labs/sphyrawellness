# 🌐 Configurazione Cloudflare Tunnel per Sphyra Wellness Lab

## 📋 Indice
- [Cos'è Cloudflare Tunnel](#cosè-cloudflare-tunnel)
- [Vantaggi](#vantaggi)
- [Requisiti](#requisiti)
- [Setup Passo-Passo](#setup-passo-passo)
- [Manutenzione](#manutenzione)
- [Troubleshooting](#troubleshooting)

---

## Cos'è Cloudflare Tunnel?

**Cloudflare Tunnel** (precedentemente Argo Tunnel) è un servizio che ti permette di esporre il tuo sito web pubblicamente **senza aprire alcuna porta sul router**.

### Come Funziona?

```
Internet → Cloudflare → Tunnel (outbound) → Il tuo Server
```

1. Il tuo server crea una connessione **in uscita** (outbound) verso Cloudflare
2. Cloudflare riceve le richieste HTTPS dal pubblico
3. Cloudflare le inoltra al tuo server tramite il tunnel
4. **Nessuna porta in ingresso sul router** è necessaria!

---

## ✅ Vantaggi

### 🔒 Sicurezza
- ✅ **Nessuna porta aperta sul router** (né 80, né 443)
- ✅ **IP del server nascosto** al pubblico
- ✅ **Protezione DDoS** automatica di Cloudflare
- ✅ **WAF** (Web Application Firewall) disponibile
- ✅ **Zero Trust Access** configurabile

### 🌍 Performance
- ✅ **CDN globale** incluso gratuitamente
- ✅ **Caching automatico** delle risorse statiche
- ✅ **HTTP/2 e HTTP/3** supportati
- ✅ **Compressione Brotli** automatica

### 🏠 Compatibilità
- ✅ Funziona con **CGNAT** (es. Fastweb, WindTre, ecc.)
- ✅ Funziona dietro **NAT multipli**
- ✅ Funziona con **IP dinamici**
- ✅ **Zero configurazione router** necessaria

### 💰 Costo
- ✅ **Completamente GRATUITO** per uso standard
- ✅ Nessun limite di banda con piano Free

---

## 📋 Requisiti

### Obbligatori
1. ✅ **Account Cloudflare** (gratuito) - [Registrati qui](https://dash.cloudflare.com/sign-up)
2. ✅ **Dominio pubblico** (es. `tuodominio.com`)
3. ✅ **Docker e Docker Compose** installati sul server
4. ✅ Server con accesso **outbound** a Internet (porta 443 in uscita)

### Opzionali
- SendGrid API Key (per invio email promemoria)

---

## 🚀 Setup Passo-Passo

### Parte 1: Configurazione Cloudflare (Dashboard)

#### 1.1 Aggiungi il Dominio a Cloudflare

1. Vai su [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Clicca su **"Add a Site"**
3. Inserisci il tuo dominio (es. `sphyrawellness.it`)
4. Seleziona il piano **Free** (gratuito)
5. Cloudflare ti mostrerà i **nameserver** da configurare

#### 1.2 Configura i Nameserver

1. Vai al pannello del tuo **registrar** (dove hai comprato il dominio)
2. Trova la sezione **DNS/Nameservers**
3. Sostituisci i nameserver esistenti con quelli forniti da Cloudflare:
   ```
   ns1.cloudflare.com
   ns2.cloudflare.com
   ```
4. Salva e attendi la propagazione (può richiedere 24h, spesso molto meno)

#### 1.3 Crea un Cloudflare Tunnel

1. Nel dashboard Cloudflare, seleziona il tuo dominio
2. Nel menu laterale, vai su **"Zero Trust"** (o clicca su "Access" → "Tunnels")
   - Se è la prima volta, ti verrà chiesto di scegliere un nome per il team (es. `sphyra-team`)
3. Vai su **"Networks"** → **"Tunnels"**
4. Clicca su **"Create a tunnel"**
5. Scegli **"Cloudflared"** come tipo di tunnel
6. Dai un nome al tunnel (es. `sphyra-tunnel`)
7. Clicca su **"Save tunnel"**

#### 1.4 Copia il Token del Tunnel

Dopo aver creato il tunnel, Cloudflare ti mostrerà un comando simile a questo:

```bash
docker run cloudflare/cloudflared:latest tunnel run --token eyJhIjoiYWJjZDEyMzQtZjU2Ny04OTAxLWFiY2QtZWYxMjM0NTY3ODkwIiwidCI6IjAxMjM0NTY3LTg5YWItY2RlZi0wMTIzLTQ1Njc4OWFiY2RlZiIsInMiOiJYWFhYWFhYWFhYWFhYWFhYIn0=
```

**COPIA IL TOKEN** (la parte dopo `--token`). Lo useremo nel passo successivo.

#### 1.5 Configura il Routing Pubblico

1. Nella pagina del tunnel, vai alla tab **"Public Hostname"**
2. Clicca su **"Add a public hostname"**
3. Configura:
   - **Subdomain**: lascia vuoto (oppure `www`)
   - **Domain**: seleziona il tuo dominio (es. `sphyrawellness.it`)
   - **Path**: lascia vuoto
   - **Type**: `HTTP`
   - **URL**: `nginx:80`
4. Clicca su **"Save hostname"**

5. (Opzionale) Se vuoi anche `www.tuodominio.com`, ripeti il processo:
   - **Subdomain**: `www`
   - **Domain**: `sphyrawellness.it`
   - **Type**: `HTTP`
   - **URL**: `nginx:80`

#### 1.6 Configurazioni SSL/TLS Cloudflare

1. Nel dashboard Cloudflare, vai su **"SSL/TLS"**
2. Imposta la modalità su **"Full"** (NON "Full (strict)")
   - Questo perché Nginx comunica con Cloudflare via HTTP internamente
3. Vai su **"SSL/TLS"** → **"Edge Certificates"**
4. Abilita:
   - ✅ **Always Use HTTPS**
   - ✅ **Automatic HTTPS Rewrites**
   - ✅ **Minimum TLS Version**: 1.2

---

### Parte 2: Configurazione Server (Linux/Raspberry Pi)

#### 2.1 Clona il Repository (se non l'hai già fatto)

```bash
git clone https://github.com/TNT-Labs/sphyrawellness.git
cd sphyrawellness
```

#### 2.2 Crea il File .env

```bash
cp .env.cloudflare.example .env
nano .env
```

Modifica i seguenti valori:

```bash
# Il tuo dominio
DOMAIN=sphyrawellness.it

# Il token del tunnel (quello copiato prima)
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoiYWJjZDEyMzQtZjU2Ny04OTAxLWFiY2QtZWYxMjM0NTY3ODkwIiwidCI6IjAxMjM0NTY3LTg5YWItY2RlZi0wMTIzLTQ1Njc4OWFiY2RlZiIsInMiOiJYWFhYWFhYWFhYWFhYWFhYWFhYIn0=

# Password sicura per CouchDB
COUCHDB_PASSWORD=la-tua-password-super-sicura-qui

# JWT Secret per autenticazione
JWT_SECRET=genera-una-stringa-casuale-molto-lunga-e-sicura

# (Opzionale) SendGrid per email
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@sphyrawellness.it
SENDGRID_FROM_NAME="Sphyra Wellness Lab"
```

**Salva e chiudi** (CTRL+O, ENTER, CTRL+X in nano)

#### 2.3 Avvia i Container Docker

```bash
# Avvia tutti i servizi
docker-compose -f docker-compose.cloudflare.yml up -d

# Verifica che tutto sia partito correttamente
docker-compose -f docker-compose.cloudflare.yml ps
```

Dovresti vedere tutti i servizi come **"Up"**:
- `sphyra-cloudflared`
- `sphyra-nginx`
- `sphyra-frontend`
- `sphyra-backend`
- `sphyra-couchdb`

#### 2.4 Verifica i Log

```bash
# Log del tunnel Cloudflare
docker logs sphyra-cloudflared

# Dovresti vedere:
# "Connection <UUID> registered connIndex=0"
# "Starting metrics server on 127.0.0.1:xxxx/metrics"
```

Se vedi questi messaggi, il tunnel è **connesso correttamente**! 🎉

#### 2.5 Testa il Sito

Apri il browser e vai su:
```
https://tuodominio.com
```

Dovresti vedere l'applicazione Sphyra Wellness Lab! 🎊

---

## 🔐 Setup Iniziale Applicazione

### 1. Primo Accesso

1. Vai su `https://tuodominio.com`
2. Credenziali di default:
   - **Username**: `admin`
   - **Password**: `admin123` (o quella configurata in `.env`)
3. **Cambia subito la password!** (vai in Impostazioni → Sicurezza)

### 2. Configurazione CouchDB Sync (Opzionale)

Se vuoi sincronizzare i dati tra più dispositivi:

1. Nell'applicazione, vai su **Impostazioni** → **Database**
2. Configura:
   - **URL**: `https://tuodominio.com/db`
   - **Username**: `admin` (o quello configurato)
   - **Password**: quella di `COUCHDB_PASSWORD`
3. Clicca su **Abilita Sincronizzazione**

---

## 🔧 Manutenzione

### Aggiornare i Container

```bash
cd /path/to/sphyrawellness

# Scarica gli ultimi aggiornamenti
git pull

# Riavvia i container
docker-compose -f docker-compose.cloudflare.yml down
docker-compose -f docker-compose.cloudflare.yml up -d --build
```

### Visualizzare i Log

```bash
# Tutti i log
docker-compose -f docker-compose.cloudflare.yml logs -f

# Log di un singolo servizio
docker logs -f sphyra-cloudflared
docker logs -f sphyra-nginx
docker logs -f sphyra-backend
```

### Backup dei Dati

```bash
# Backup CouchDB
docker exec sphyra-couchdb couchdb-backup -H localhost -u admin -p password -d /backup

# Copia il backup sul tuo computer
docker cp sphyra-couchdb:/backup ./backup-$(date +%Y%m%d)
```

### Fermare i Servizi

```bash
# Ferma tutti i container
docker-compose -f docker-compose.cloudflare.yml down

# Ferma E rimuovi anche i volumi (ATTENZIONE: cancella i dati!)
docker-compose -f docker-compose.cloudflare.yml down -v
```

---

## 🐛 Troubleshooting

### Il Tunnel Non Si Connette

**Problema**: `docker logs sphyra-cloudflared` mostra errori di connessione

**Soluzioni**:
1. Verifica che il token sia corretto in `.env`
2. Controlla che il server abbia accesso a Internet (porta 443 outbound)
3. Verifica il firewall locale:
   ```bash
   # Permetti connessioni in uscita
   sudo ufw allow out 443/tcp
   ```

### Errore 502 Bad Gateway

**Problema**: Il sito mostra errore 502

**Soluzioni**:
1. Verifica che Nginx sia in esecuzione:
   ```bash
   docker logs sphyra-nginx
   ```
2. Verifica che frontend e backend siano up:
   ```bash
   docker-compose -f docker-compose.cloudflare.yml ps
   ```
3. Controlla la configurazione del routing nel tunnel Cloudflare:
   - Deve puntare a `nginx:80` (non `localhost:80`)

### Errore SSL/TLS

**Problema**: Errore di certificato SSL

**Soluzioni**:
1. Verifica le impostazioni SSL/TLS in Cloudflare (dovrebbe essere "Full", NON "Full (strict)")
2. Verifica che "Always Use HTTPS" sia abilitato
3. Prova a disabilitare e riabilitare "Universal SSL" in Cloudflare

### CouchDB Non Accessibile

**Problema**: Errore di sincronizzazione CouchDB

**Soluzioni**:
1. Verifica che CouchDB sia in esecuzione:
   ```bash
   docker logs sphyra-couchdb
   ```
2. Verifica la password in `.env`
3. Testa l'accesso locale:
   ```bash
   curl http://admin:password@localhost:5984/_up
   ```

### Performance Lente

**Soluzioni**:
1. Abilita il caching in Cloudflare:
   - Dashboard → "Caching" → "Configuration"
   - Imposta "Caching Level" su "Standard"
2. Abilita "Auto Minify" per HTML, CSS, JS
3. Abilita "Brotli" compression
4. Considera di abilitare "Argo Smart Routing" (a pagamento, ma veloce)

---

## 📊 Monitoraggio

### Dashboard Cloudflare

1. Vai su Cloudflare Dashboard → Il tuo dominio
2. Nella pagina "Analytics" puoi vedere:
   - Traffico
   - Richieste bloccate
   - Banda utilizzata
   - Paesi di provenienza visitatori

### Tunnel Health

1. Vai su "Zero Trust" → "Networks" → "Tunnels"
2. Verifica che il tunnel sia **"Healthy"** (verde)
3. Puoi vedere:
   - Stato connessione
   - Traffico
   - Ultima connessione

---

## 🔐 Sicurezza Aggiuntiva (Opzionale)

### Cloudflare Access (Zero Trust)

Puoi limitare l'accesso all'app solo a utenti autorizzati:

1. Vai su "Zero Trust" → "Access" → "Applications"
2. Clicca "Add an application"
3. Scegli "Self-hosted"
4. Configura:
   - **Application name**: Sphyra Wellness
   - **Session Duration**: 24 hours
   - **Application domain**: `tuodominio.com`
5. Aggiungi una policy (es. solo email specifiche, solo da Italia, ecc.)

### WAF (Web Application Firewall)

1. Vai su "Security" → "WAF"
2. Abilita le "Managed Rules"
3. Cloudflare bloccherà automaticamente attacchi comuni (SQL injection, XSS, ecc.)

### Rate Limiting

1. Vai su "Security" → "WAF" → "Rate limiting rules"
2. Crea regole per limitare richieste (es. max 100 req/min per IP)

---

## 💡 Domande Frequenti (FAQ)

### Posso usare Cloudflare Tunnel con Fastweb?

**Sì!** Cloudflare Tunnel funziona perfettamente anche con CGNAT di Fastweb, perché non richiede porte aperte in ingresso.

### Devo pagare qualcosa?

**No**, il piano Free di Cloudflare include:
- Tunnel illimitati
- Banda illimitata
- CDN globale
- Certificati SSL
- Protezione DDoS base

### Posso usare più tunnel?

**Sì**, puoi creare più tunnel per diversi servizi o come backup. Cloudflare bilancerà automaticamente il traffico.

### I miei dati passano per i server Cloudflare?

**Sì**, tutto il traffico HTTPS passa per i server edge di Cloudflare. Cloudflare può vedere il traffico decriptato. Se questo è un problema, considera soluzioni self-hosted come WireGuard + reverse proxy.

### Posso usare un sottodominio?

**Sì**, puoi configurare `app.tuodominio.com` invece del dominio principale. Basta configurarlo nel routing del tunnel.

### Il mio IP è visibile al pubblico?

**No**, con Cloudflare Tunnel il tuo IP è completamente nascosto. Solo Cloudflare conosce l'IP del tuo server.

---

## 📞 Supporto

- **Documentazione Cloudflare**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Community Forum**: https://community.cloudflare.com/
- **Issue GitHub**: https://github.com/TNT-Labs/sphyrawellness/issues

---

## 🎉 Conclusione

Complimenti! Ora hai un'applicazione web professionale con HTTPS **senza aprire alcuna porta sul router**! 🚀

### Prossimi Passi

1. ✅ Cambia le password di default
2. ✅ Configura SendGrid per le email (opzionale)
3. ✅ Configura backup automatici
4. ✅ Esplora le funzionalità di sicurezza Cloudflare
5. ✅ Inizia a usare l'app per gestire il tuo centro estetico!

---

**Sviluppato con ❤️ per il settore wellness**
