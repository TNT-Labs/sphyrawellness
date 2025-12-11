# 🚀 Guida Deploy GitHub Pages

## Configurazione PWA

### ✅ Checklist Completata

- [x] **Service Worker** - Configurato con Workbox per caching offline
- [x] **Manifest** - Web App Manifest con tutte le proprietà necessarie
- [x] **Icone** - Set completo di icone (192x192, 512x512, favicon, apple-touch-icon)
- [x] **Base Path** - Configurato `/sphyrawellness/` per GitHub Pages
- [x] **GitHub Actions** - Workflow automatico per deploy
- [x] **.nojekyll** - File per evitare problemi con Jekyll
- [x] **Offline First** - App funzionante anche offline

### 📱 Caratteristiche PWA

1. **Installabilità**: L'app può essere installata su dispositivi mobile e desktop
2. **Offline Mode**: Tutti gli asset sono pre-cached per funzionamento offline
3. **Auto-update**: Service worker aggiornato automaticamente
4. **Performance**: Cache strategy ottimizzate per Google Fonts e asset statici

## Configurazione GitHub Pages

### Passaggi per Attivare GitHub Pages

1. Vai su **Settings** nel repository GitHub
2. Seleziona **Pages** dal menu laterale
3. In **Source**, seleziona `GitHub Actions`
4. Il workflow `.github/workflows/deploy.yml` gestirà automaticamente il deploy

### URL Produzione

L'app sarà disponibile su:
```
https://[tuo-username].github.io/sphyrawellness/
```

### Deploy Automatico

Il deploy avviene automaticamente quando:
- Fai push sul branch `main`
- Attivi manualmente il workflow da GitHub Actions

### Verifica Deploy

Dopo il deploy, verifica:
1. ✅ L'app si carica correttamente
2. ✅ Il service worker è registrato (controlla Developer Tools > Application > Service Workers)
3. ✅ Il manifest è valido (controlla Developer Tools > Application > Manifest)
4. ✅ L'app è installabile (cerca l'icona di installazione nella barra degli indirizzi)
5. ✅ L'app funziona offline (disattiva la connessione e ricarica)

## Test Locale

### Build Produzione
```bash
npm run build
```

### Preview Locale
```bash
npm run preview
```

L'app sarà disponibile su `http://localhost:4173`

### Test PWA in Locale

Per testare la PWA in locale:
1. Esegui `npm run build && npm run preview`
2. Apri Chrome DevTools
3. Vai su Application > Service Workers
4. Verifica che il SW sia registrato
5. Attiva "Offline" e ricarica la pagina

## Troubleshooting

### Il service worker non si registra

- Verifica che l'app sia servita su HTTPS (GitHub Pages lo fa automaticamente)
- Controlla la console per errori
- Verifica che il base path sia corretto

### Le icone non si caricano

- Verifica che le icone siano nella cartella `public/`
- Controlla che i path nel manifest siano corretti
- Rebuilda l'app: `npm run build`

### Il deploy fallisce

- Verifica che le GitHub Actions abbiano i permessi corretti
- Controlla i log del workflow in GitHub Actions
- Verifica che il branch sia `main`

## Monitoraggio

### Lighthouse Score

Esegui un audit con Lighthouse per verificare:
- Performance
- Accessibility
- Best Practices
- SEO
- PWA

Target: Score 90+ su tutte le metriche

### Service Worker Updates

Il service worker si aggiorna automaticamente quando:
1. Rilevi una nuova versione dell'app
2. L'utente chiude tutte le tab dell'app
3. Al prossimo caricamento, la nuova versione è attiva

---

💡 **Tip**: Usa Chrome DevTools > Lighthouse per audit PWA completi
