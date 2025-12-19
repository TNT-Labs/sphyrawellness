# 💆‍♀️ Sphyra Wellness Lab - PWA Gestione Centro Estetico

Applicazione Progressive Web App (PWA) per la gestione completa di centri estetici e spa.

## ✨ Caratteristiche

- 📱 **Progressive Web App** - Installabile su tutti i dispositivi
- 📅 **Gestione Appuntamenti** - Sistema completo di prenotazioni
- 👥 **Gestione Clienti** - Archivio clienti con storico trattamenti
- 💅 **Catalogo Trattamenti** - Gestione servizi e listino prezzi
- 📊 **Dashboard** - Statistiche e metriche in tempo reale
- 🔔 **Notifiche** - Sistema di promemoria appuntamenti
- 💳 **Gestione Pagamenti** - Tracciamento incassi e fatturazione
- 📱 **Responsive** - Ottimizzato per mobile, tablet e desktop
- 🔒 **Offline-first** - Funziona anche senza connessione
- 🔄 **Sincronizzazione CouchDB** - Sync multi-dispositivo opzionale (vedi [COUCHDB_SETUP.md](COUCHDB_SETUP.md))

## 🚀 Deploy

L'applicazione è progettata per l'esecuzione in ambiente **Docker con HTTPS privato**.

### 🔒 Deployment HTTPS Privato (Rete Locale)

Per installare l'applicazione in ambiente privato con HTTPS e Nginx:

1. **Quick Start**: Vedi [QUICK-START-PRIVATE.md](QUICK-START-PRIVATE.md)
2. **Setup Completo**: Vedi [HTTPS-PRIVATE-NETWORK.md](HTTPS-PRIVATE-NETWORK.md)
3. **Installazione Docker**: Vedi [DOCKER_INSTALL_GUIDE.md](DOCKER_INSTALL_GUIDE.md)

**Domini supportati:**
- `https://sphyra.local` (dominio locale)
- `https://192.168.1.95` (IP privato configurabile)

**Stack:**
- ✅ Docker + Docker Compose
- ✅ Nginx reverse proxy
- ✅ HTTPS con certificati self-signed
- ✅ CouchDB per storage dati
- ✅ Backend Node.js per email reminders

### 🌐 Deployment HTTPS Pubblico (Let's Encrypt)

Per installare l'applicazione con certificati SSL/TLS validi tramite Let's Encrypt:

**📖 Guida Completa**: Vedi [docs/LETSENCRYPT_SETUP_IT.md](docs/LETSENCRYPT_SETUP_IT.md)

**Requisiti:**
- ✅ Dominio pubblico registrato
- ✅ DNS configurato correttamente
- ✅ Porte 80 e 443 aperte e raggiungibili
- ✅ Docker + Docker Compose

**Quick Start:**
```bash
# 1. Configura ambiente
cp .env.letsencrypt.example .env
# Modifica .env con il tuo dominio e email

# 2. Genera certificati
chmod +x scripts/init-letsencrypt.sh
./scripts/init-letsencrypt.sh

# 3. Avvia servizi
docker-compose -f docker-compose.letsencrypt.yml up -d
```

**Stack:**
- ✅ Docker + Docker Compose
- ✅ Nginx reverse proxy
- ✅ HTTPS con certificati Let's Encrypt (validi e fidati)
- ✅ Rinnovo automatico certificati ogni 12 ore
- ✅ CouchDB per storage dati
- ✅ Backend Node.js per email reminders

## 🛠️ Sviluppo

### Prerequisiti

- Node.js 18+
- npm

### Installazione

```bash
npm install
```

### Sviluppo locale

```bash
npm run dev
```

L'app sarà disponibile su `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview build

```bash
npm run preview
```

## 📦 Tecnologie

- **React 18** - UI Framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Vite PWA Plugin** - Service Worker e Manifest
- **Workbox** - Caching strategies
- **PouchDB** - Local database
- **CouchDB** - Remote sync (opzionale)
- **Lucide React** - Icons
- **date-fns** - Date utilities

## 📱 PWA Features

- ✅ Service Worker per caching
- ✅ Web App Manifest
- ✅ Icone ottimizzate (192x192, 512x512)
- ✅ Theme color e splash screen
- ✅ Installabile su dispositivi
- ✅ Funzionamento offline
- ✅ Update automatici

## 🔄 Sincronizzazione Multi-Dispositivo

L'app supporta la sincronizzazione opzionale con **CouchDB** per mantenere i dati aggiornati su più dispositivi.

### Setup CouchDB

Per configurare la sincronizzazione:

1. **Installa CouchDB** (vedi [COUCHDB_SETUP.md](COUCHDB_SETUP.md) per istruzioni dettagliate)
   - Docker (consigliato)
   - Installazione locale

2. **Crea i database automaticamente**:
   ```bash
   npm run setup-couchdb -- http://localhost:5984 admin password
   ```

3. **Configura l'app**:
   - Apri Impostazioni nell'app
   - Inserisci URL CouchDB e credenziali
   - Abilita sincronizzazione

**📖 Documentazione completa**: [COUCHDB_SETUP.md](COUCHDB_SETUP.md)

### Database Creati

Lo script di setup crea automaticamente questi database:
- `sphyra-customers` - Clienti
- `sphyra-services` - Servizi
- `sphyra-staff` - Personale
- `sphyra-appointments` - Appuntamenti
- `sphyra-payments` - Pagamenti
- `sphyra-reminders` - Promemoria
- `sphyra-staff-roles` - Ruoli
- `sphyra-service-categories` - Categorie

## 📝 Licenza

MIT License - vedi [LICENSE](LICENSE)

## 🤝 Contributi

I contributi sono benvenuti! Sentiti libero di aprire issue o pull request.

---

Sviluppato con ❤️ per il settore wellness
