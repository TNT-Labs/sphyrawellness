# 💆‍♀️ Sphyra Wellness - PWA Gestione Centro Estetico

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

L'applicazione è configurata per il deploy automatico su GitHub Pages tramite GitHub Actions.

### Configurazione GitHub Pages

1. Vai su Settings > Pages nel repository
2. Source: seleziona "GitHub Actions"
3. Il deploy avverrà automaticamente ad ogni push sul branch `main`

URL di produzione: `https://[username].github.io/sphyrawellness/`

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
   - Cloud (IBM Cloudant)

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
