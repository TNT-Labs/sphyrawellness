# 🚀 Cloudflare Quick Tunnel - Deploy Istantaneo

## 📋 Indice
- [Cos'è Quick Tunnel](#cosè-quick-tunnel)
- [Vantaggi e Limitazioni](#vantaggi-e-limitazioni)
- [Setup in 2 Minuti](#setup-in-2-minuti)
- [Gestione](#gestione)
- [FAQ](#faq)

---

## Cos'è Quick Tunnel?

**Cloudflare Quick Tunnel** è la versione più semplice di Cloudflare Tunnel che genera automaticamente un URL pubblico **senza richiedere alcuna configurazione**.

### Come Funziona?

```
Il tuo Server → cloudflared → Cloudflare Edge → URL automatico: xxx.trycloudflare.com
```

1. Avvii `cloudflared tunnel --url http://localhost:80`
2. Cloudflare genera automaticamente un URL tipo: `sphyrawellness-abc123.trycloudflare.com`
3. Il sito è immediatamente accessibile pubblicamente via HTTPS
4. **ZERO configurazione DNS**, **ZERO token**, **ZERO setup**

---

## ✅ Vantaggi e ⚠️ Limitazioni

### ✅ Vantaggi

#### 🚀 Semplicità
- ✅ **ZERO configurazione** richiesta
- ✅ **NESSUN token** necessario
- ✅ **NESSUN dominio** richiesto
- ✅ **NESSUNA configurazione DNS**
- ✅ Deploy in **2 minuti**

#### 🔒 Sicurezza
- ✅ **NESSUNA porta aperta** sul router
- ✅ **IP nascosto** al pubblico
- ✅ **HTTPS automatico** (certificato valido)
- ✅ **Protezione DDoS** di Cloudflare

#### 🌍 Compatibilità
- ✅ Funziona con **CGNAT** (Fastweb, WindTre, etc.)
- ✅ Funziona dietro **NAT multipli**
- ✅ Funziona con **IP dinamici**
- ✅ **Completamente GRATUITO**

### ⚠️ Limitazioni

#### 🔄 URL Non Permanente
- ⚠️ **URL casuale** generato ad ogni avvio
- ⚠️ Se riavvii il container, l'URL **cambia**
- ⚠️ **Non adatto per produzione** con utenti esterni

#### 🎯 Caso d'Uso Ideale
- ✅ **Demo** e presentazioni
- ✅ **Test** e sviluppo
- ✅ **Accesso temporaneo** da remoto
- ✅ **Proof of concept**
- ✅ **Condivisione rapida** con clienti/colleghi

#### 💼 Per Produzione
Se hai bisogno di un **URL permanente** per uso continuativo:
- 👉 Usa il **Named Tunnel** con dominio personalizzato
- 👉 Vedi: [CLOUDFLARE_TUNNEL_SETUP_IT.md](CLOUDFLARE_TUNNEL_SETUP_IT.md)

---

## 🚀 Setup in 2 Minuti

### Prerequisiti

1. ✅ Server Linux (Raspberry Pi, Ubuntu, Debian, etc.)
2. ✅ Docker e Docker Compose installati
3. ✅ Connessione Internet (solo outbound, porta 443)

### Installazione

#### Passo 1: Clone del Repository

```bash
git clone https://github.com/TNT-Labs/sphyrawellness.git
cd sphyrawellness
```

#### Passo 2: Configurazione

```bash
# Copia il template di configurazione
cp .env.quicktunnel.example .env

# Modifica le password (IMPORTANTE!)
nano .env
```

Modifica almeno questi valori:

```bash
# Password database (CAMBIA!)
COUCHDB_PASSWORD=la-tua-password-sicura-qui

# JWT Secret (CAMBIA!)
JWT_SECRET=genera-una-stringa-casuale-molto-lunga
```

**Configurazione Opzionale - Notifiche Email Cambio URL:**

Se vuoi ricevere una **email automatica** quando l'URL del Quick Tunnel cambia:

```bash
# 1. Ottieni API Key gratuita da SendGrid (https://sendgrid.com)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxx

# 2. Configura email mittente
SENDGRID_FROM_EMAIL=noreply@tuodominio.com

# 3. Configura email destinatario per notifiche
QUICKTUNNEL_NOTIFY_EMAIL=admin@tuodominio.com
```

Con questa configurazione:
- ✅ Riceverai email quando l'URL cambia
- ✅ Riceverai email al primo avvio con il nuovo URL
- ✅ Email formattate in HTML con link diretto
- ✅ Possibilità di aprire il sito direttamente dall'email

**Nota**: SendGrid offre 100 email/giorno gratuite, più che sufficienti per le notifiche.

Salva e chiudi (CTRL+O, ENTER, CTRL+X)

#### Passo 3: Deploy!

```bash
# Rendi eseguibile lo script
chmod +x deploy-quicktunnel.sh

# Avvia il deploy
./deploy-quicktunnel.sh
```

#### Passo 4: Ottieni l'URL

Dopo circa 30 secondi, lo script mostrerà l'URL pubblico:

```
========================================
🎉 TUNNEL ATTIVO!
========================================

🌐 Il tuo sito è disponibile su:

   https://sphyrawellness-abc123.trycloudflare.com

========================================
```

**FATTO!** 🎉 Il sito è pubblico e accessibile via HTTPS!

### Accesso Applicazione

1. Vai all'URL mostrato nello script
2. Credenziali di default:
   - **Username**: `admin`
   - **Password**: `admin123` (o quella configurata in `.env`)
3. **Cambia subito la password!** (Impostazioni → Sicurezza)

---

## 🔧 Gestione

### Vedere l'URL del Tunnel

#### Metodo 1: Script URL Manager (Consigliato) 🎯

Usa lo script di gestione URL incluso:

```bash
# Mostra l'URL corrente
./quicktunnel-url.sh

# Monitora l'URL in tempo reale
./quicktunnel-url.sh watch

# Genera QR code per accesso rapido da smartphone
./quicktunnel-url.sh qr

# Apri l'URL nel browser
./quicktunnel-url.sh open
```

Lo script:
- ✅ Salva automaticamente l'ultimo URL in `.quicktunnel-url`
- ✅ Ti avvisa se l'URL cambia dopo un riavvio
- ✅ Mostra l'ultimo URL noto anche se il container è fermo

#### Metodo 2: Manualmente dai log

```bash
docker logs sphyra-quicktunnel 2>&1 | grep trycloudflare
```

Vedrai qualcosa tipo:
```
https://sphyrawellness-abc123.trycloudflare.com
```

#### File URL salvato

L'URL corrente è sempre salvato in `.quicktunnel-url`:

```bash
cat .quicktunnel-url
```

### Notifiche Email Cambio URL 📧

Il sistema include un **monitor automatico** che invia email quando l'URL cambia.

#### Configurazione

Aggiungi in `.env`:

```bash
# SendGrid API Key (gratuita su https://sendgrid.com)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@tuodominio.com

# Email a cui ricevere notifiche
QUICKTUNNEL_NOTIFY_EMAIL=admin@tuodominio.com
```

#### Cosa ricevi via Email

**Al primo avvio:**
- 🎉 Email di benvenuto con il nuovo URL
- Link diretto per aprire il sito
- Credenziali di accesso

**Quando l'URL cambia:**
- 🚨 Email di notifica cambio URL
- Vecchio URL (non più valido)
- Nuovo URL (attivo)
- Link diretto per aprire il sito

#### Email di Esempio

Le email sono formattate in HTML professionale con:
- 📱 Design responsive (leggibile su mobile)
- 🎨 Colori e layout accattivanti
- 🔗 Pulsante "Apri Applicazione" cliccabile
- ⚠️ Avvisi e suggerimenti utili

#### Verifica Funzionamento

Controlla i log del monitor:

```bash
# Logs del monitor URL
docker logs sphyra-url-monitor -f
```

Dovresti vedere:
```
🔍 Quick Tunnel URL Monitor - Avviato
========================================
📧 Notifiche email: ATTIVE
⏱️  Intervallo controllo: 30s
========================================

✅ URL confermato: https://sphyrawellness-abc123.trycloudflare.com
✅ Email inviata con successo
```

#### Disabilitare le Notifiche

Per disabilitare le notifiche email, rimuovi o lascia vuoto in `.env`:

```bash
QUICKTUNNEL_NOTIFY_EMAIL=
```

Il monitor continuerà a tracciare l'URL ma non invierà email.

#### SendGrid Gratuito

SendGrid offre un piano gratuito con:
- ✅ 100 email/giorno (gratuito per sempre)
- ✅ Più che sufficienti per le notifiche
- ✅ Registrazione in 2 minuti
- ✅ Nessuna carta di credito richiesta

1. Vai su https://sendgrid.com
2. Crea un account gratuito
3. Crea una API Key (Settings → API Keys)
4. Copia la chiave in `.env`

### Monitoraggio

```bash
# Stato di tutti i servizi
docker compose -f docker-compose.quicktunnel.yml ps

# Logs in tempo reale
docker compose -f docker-compose.quicktunnel.yml logs -f

# Logs solo del tunnel
docker logs -f sphyra-quicktunnel
```

### Riavvio

```bash
# Riavvia tutti i servizi
docker compose -f docker-compose.quicktunnel.yml restart

# ⚠️ ATTENZIONE: L'URL cambierà!
```

Dopo il riavvio, recupera il nuovo URL con:
```bash
./quicktunnel-url.sh
```

### Fermare i Servizi

```bash
# Ferma tutto
docker compose -f docker-compose.quicktunnel.yml down

# Ferma e rimuovi anche i dati (ATTENZIONE!)
docker compose -f docker-compose.quicktunnel.yml down -v
```

### Backup dei Dati

```bash
# Backup CouchDB
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

docker run --rm \
  -v sphyrawellness_couchdb_data:/data \
  -v $(pwd)/$BACKUP_DIR:/backup \
  alpine tar czf /backup/couchdb_data.tar.gz -C /data .

echo "Backup salvato in: $BACKUP_DIR/couchdb_data.tar.gz"
```

### Aggiornare l'Applicazione

```bash
cd /path/to/sphyrawellness

# Scarica gli ultimi aggiornamenti
git pull

# Riavvia i container con il nuovo codice
docker compose -f docker-compose.quicktunnel.yml down
docker compose -f docker-compose.quicktunnel.yml up -d --build

# ⚠️ L'URL cambierà, recuperalo con:
docker logs sphyra-quicktunnel 2>&1 | grep trycloudflare
```

---

## 🐛 Troubleshooting

### Non Vedo l'URL nei Log

**Soluzione**:

```bash
# Attendi 30-60 secondi e riprova
docker logs sphyra-quicktunnel 2>&1 | grep trycloudflare

# Se ancora niente, controlla gli errori
docker logs sphyra-quicktunnel 2>&1 | tail -50
```

### Errore "Connection Failed"

**Problema**: Il tunnel non riesce a connettersi

**Soluzioni**:
1. Verifica che il server abbia accesso a Internet (porta 443 outbound)
2. Verifica il firewall:
   ```bash
   sudo ufw allow out 443/tcp
   ```
3. Riavvia il container:
   ```bash
   docker restart sphyra-quicktunnel
   ```

### Errore 502 Bad Gateway

**Problema**: Il tunnel è attivo ma il sito non risponde

**Soluzioni**:

1. Verifica che nginx sia in esecuzione:
   ```bash
   docker logs sphyra-nginx
   ```

2. Verifica che frontend e backend siano up:
   ```bash
   docker compose -f docker-compose.quicktunnel.yml ps
   ```

3. Riavvia tutto:
   ```bash
   docker compose -f docker-compose.quicktunnel.yml restart
   ```

### L'URL Non Funziona Più

**Causa**: Hai riavviato il container e l'URL è cambiato

**Soluzione**:

```bash
# Recupera il nuovo URL
./quicktunnel-url.sh
```

Lo script ti avviserà automaticamente che l'URL è cambiato e ti mostrerà quello nuovo.

### Prestazioni Lente

Quick Tunnel può essere più lento del Named Tunnel per traffico intenso.

**Soluzioni**:
1. Per uso serio, passa al Named Tunnel con dominio personalizzato
2. Verifica la connessione Internet del server
3. Il tunnel Cloudflare più vicino potrebbe essere lontano

---

## 💡 FAQ

### Posso usare Quick Tunnel in produzione?

**No, non è consigliato** perché:
- L'URL cambia ad ogni riavvio
- Non puoi personalizzare il dominio
- Non puoi configurare DNS

Per produzione usa il **Named Tunnel**: [CLOUDFLARE_TUNNEL_SETUP_IT.md](CLOUDFLARE_TUNNEL_SETUP_IT.md)

### Quanto dura l'URL generato?

L'URL è valido finché il container `sphyra-quicktunnel` è in esecuzione. Se:
- Riavvii il container → URL cambia
- Fermi e riavvii → URL cambia
- Il server si riavvia → URL cambia

### Posso scegliere l'URL generato?

No, Cloudflare genera un URL casuale. Se vuoi un URL personalizzato, devi usare un **Named Tunnel** con dominio tuo.

### Posso mantenere lo stesso URL dopo un riavvio?

**No, non è possibile** con il Quick Tunnel. È una limitazione del servizio Cloudflare:
- Il Quick Tunnel genera sempre un URL casuale ad ogni avvio
- Non esiste configurazione per renderlo permanente
- È progettato per test rapidi, non per uso continuativo

**Soluzioni**:
1. **Named Tunnel** (consigliato): URL permanente con dominio personalizzato
   - Vedi: [CLOUDFLARE_TUNNEL_SETUP_IT.md](CLOUDFLARE_TUNNEL_SETUP_IT.md)
   - Costo: Solo il dominio (~€10/anno), resto gratuito

2. **URL Manager Script**: Rende più facile gestire gli URL che cambiano
   ```bash
   ./quicktunnel-url.sh        # Mostra URL corrente e ultimo noto
   ./quicktunnel-url.sh watch  # Monitora cambiamenti
   ```

### È sicuro?

**Sì**, Quick Tunnel offre:
- ✅ HTTPS con certificato valido
- ✅ Protezione DDoS di Cloudflare
- ✅ IP del server nascosto

Ma ricorda:
- ⚠️ Chiunque abbia l'URL può accedere al sito
- ⚠️ L'URL è casuale ma "indovinabile" se molto semplice

Per maggiore sicurezza, aggiungi autenticazione nell'applicazione.

### Funziona con Fastweb/CGNAT?

**Sì!** Quick Tunnel funziona perfettamente dietro CGNAT perché non richiede porte aperte in ingresso.

### Costa qualcosa?

**No, è completamente GRATUITO** per sempre.

### Posso usare più Quick Tunnel contemporaneamente?

Sì, puoi avviare più tunnel su porte diverse:

```bash
# Tunnel 1 (porta 80)
docker run cloudflare/cloudflared tunnel --url http://localhost:80

# Tunnel 2 (porta 3000)
docker run cloudflare/cloudflared tunnel --url http://localhost:3000
```

### Come condivido il sito con un cliente?

1. Avvia il Quick Tunnel
2. Recupera l'URL: `docker logs sphyra-quicktunnel 2>&1 | grep trycloudflare`
3. Invia l'URL al cliente
4. Il cliente può accedere immediatamente via browser

**IMPORTANTE**: Se riavvii, dovrai inviare il nuovo URL!

### Posso passare da Quick Tunnel a Named Tunnel?

**Sì, facilmente!**

```bash
# Ferma Quick Tunnel
docker compose -f docker-compose.quicktunnel.yml down

# Configura Named Tunnel
cp .env.cloudflare.example .env
nano .env  # Aggiungi dominio e token

# Avvia Named Tunnel
./deploy-cloudflare.sh
```

I dati (database, configurazioni) rimangono intatti.

---

## 🎯 Quando Usare Quick Tunnel vs Named Tunnel

### 🚀 Usa Quick Tunnel Se:

- ✅ Vuoi testare l'applicazione velocemente
- ✅ Stai facendo una demo a un cliente
- ✅ Hai bisogno di accesso remoto temporaneo
- ✅ Non vuoi configurare DNS
- ✅ Non ti serve un URL permanente

### 🏢 Usa Named Tunnel Se:

- ✅ Vuoi un URL permanente e personalizzato
- ✅ L'applicazione è in produzione
- ✅ Hai clienti/utenti che accedono regolarmente
- ✅ Vuoi configurare sottodomini (es. `app.tuodominio.com`)
- ✅ Vuoi integrare con altri servizi

---

## 📞 Supporto

- **Documentazione Cloudflare**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/run-tunnel/trycloudflare/
- **Issue GitHub**: https://github.com/TNT-Labs/sphyrawellness/issues

---

## 🎉 Conclusione

Quick Tunnel è perfetto per:
- ✅ Test rapidi
- ✅ Demo e presentazioni
- ✅ Sviluppo e debugging remoto
- ✅ Condivisione temporanea

**Ma per produzione, usa il Named Tunnel!** 🏢

Vedi: [CLOUDFLARE_TUNNEL_SETUP_IT.md](CLOUDFLARE_TUNNEL_SETUP_IT.md)

---

**Sviluppato con ❤️ per il settore wellness**
