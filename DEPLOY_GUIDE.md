# 🚀 Guida Deploy su GitHub Pages

## Configurazione Attuale

La tua app React è configurata per il deploy automatico su GitHub Pages.

**URL Produzione:** https://tnt-labs.github.io/sphyrawellness/

## Come Funziona

### Deploy Automatico

Ogni volta che fai push sul branch `main`, GitHub Actions:
1. ✅ Installa le dipendenze
2. ✅ Builda l'app React
3. ✅ Deploya automaticamente su GitHub Pages

### File di Configurazione

#### 1. `.github/workflows/deploy.yml`
Workflow GitHub Actions che gestisce il deploy automatico.

#### 2. `vite.config.ts`
```typescript
base: '/sphyrawellness/'  // Path base per GitHub Pages
```

#### 3. `src/App.tsx`
```typescript
<Router basename="/sphyrawellness">  // Routing per sottocartella
```

#### 4. `dist/404.html`
Gestisce i redirect per il routing client-side su GitHub Pages.

## 📝 Come Fare il Deploy

### Opzione 1: Deploy Automatico (Consigliato)

```bash
# Fai le tue modifiche
git add .
git commit -m "feat: descrizione modifiche"
git push origin main

# Il deploy parte automaticamente! 🎉
```

### Opzione 2: Deploy Manuale

1. Vai su: https://github.com/TNT-Labs/sphyrawellness/actions
2. Clicca su "Deploy to GitHub Pages"
3. Clicca "Run workflow" → "Run workflow"

### Opzione 3: Deploy da Branch Diverso

Per fare il deploy da un branch di sviluppo:

```bash
# 1. Crea una Pull Request verso main
# 2. Fai il merge della PR
# 3. Il deploy parte automaticamente
```

## 🔍 Monitorare il Deploy

### Controllare lo Stato

1. Vai su: https://github.com/TNT-Labs/sphyrawellness/actions
2. Vedrai lo stato del workflow:
   - 🟡 Giallo: Build in corso
   - ✅ Verde: Deploy completato con successo
   - ❌ Rosso: Errore nel deploy

### Tempo di Deploy

- **Build**: ~1-2 minuti
- **Deploy**: ~30 secondi
- **Propagazione**: ~2-5 minuti per vedere le modifiche live

## ⚙️ Configurazione GitHub Pages

### Verificare le Impostazioni

1. Vai su: https://github.com/TNT-Labs/sphyrawellness/settings/pages

2. Assicurati che sia configurato così:
   - **Source**: GitHub Actions ✅
   - **Custom domain**: (opzionale)
   - **Enforce HTTPS**: ✅ Abilitato

### Permessi Necessari

Il workflow ha questi permessi (già configurati):
```yaml
permissions:
  contents: read      # Leggere il codice
  pages: write        # Scrivere su GitHub Pages
  id-token: write     # Autenticazione
```

## 🐛 Risoluzione Problemi

### Il Deploy Fallisce

1. **Controlla i log del workflow:**
   ```
   Actions → Deploy to GitHub Pages → Click sul workflow fallito
   ```

2. **Errori comuni:**
   - ❌ Test falliti: Verifica che `npm test` passi localmente
   - ❌ Build fallito: Verifica che `npm run build` funzioni localmente
   - ❌ Dipendenze mancanti: Controlla `package.json`

### Le Modifiche Non Appaiono

1. **Aspetta 2-5 minuti** per la propagazione
2. **Svuota la cache del browser:**
   - Chrome/Edge: `Ctrl+F5` o `Cmd+Shift+R`
   - Firefox: `Ctrl+Shift+R`
3. **Verifica Service Worker:**
   - Apri DevTools → Application → Service Workers
   - Click "Unregister" se necessario

### Errori 404 sulle Rotte

Il file `public/404.html` gestisce i redirect per React Router.
Se vedi errori 404:

1. Verifica che `basename="/sphyrawellness"` sia in `App.tsx`
2. Verifica che `base: '/sphyrawellness/'` sia in `vite.config.ts`
3. Controlla che `404.html` esista in `dist/`

## 🧪 Test Prima del Deploy

### Test Locale

```bash
# 1. Build locale
npm run build

# 2. Preview del build
npm run preview

# 3. Apri http://localhost:4173/sphyrawellness/
```

### Test di Produzione

```bash
# Testa l'URL di produzione
curl -I https://tnt-labs.github.io/sphyrawellness/
```

## 📦 Build Locale

Se vuoi buildare localmente:

```bash
# Install
npm install

# Build
npm run build

# Il risultato sarà in dist/
ls -la dist/
```

## 🔐 Environment Variables

Per variabili d'ambiente in produzione:

1. **Vai su:** Settings → Secrets and variables → Actions
2. **Aggiungi secret:** New repository secret
3. **Usa nel workflow:**
   ```yaml
   env:
     VITE_API_KEY: ${{ secrets.API_KEY }}
   ```

## 🌐 Custom Domain (Opzionale)

Per usare un dominio personalizzato:

1. **Aggiungi file `public/CNAME`:**
   ```
   tuodominio.com
   ```

2. **Configura DNS:**
   - Type: `A`
   - Host: `@`
   - Value: `185.199.108.153` (e altri IP GitHub)

3. **Abilita su GitHub:**
   - Settings → Pages → Custom domain → Salva

## 📊 Monitoraggio

### Metriche di Deploy

Visualizza nelle Actions:
- Tempo di build
- Dimensione bundle
- Numero di file generati

### Analytics (Opzionale)

Aggiungi Google Analytics o Plausible per monitorare:
- Visitatori
- Performance
- Errori lato client

## 🔄 Rollback

Per tornare a una versione precedente:

```bash
# 1. Trova il commit da ripristinare
git log --oneline

# 2. Fai revert
git revert <commit-hash>

# 3. Pusha
git push origin main

# Il deploy automatico ripristinerà la versione precedente
```

## 📚 Risorse Utili

- [GitHub Pages Docs](https://docs.github.com/pages)
- [GitHub Actions Docs](https://docs.github.com/actions)
- [Vite Deploy Guide](https://vitejs.dev/guide/static-deploy.html)
- [React Router Docs](https://reactrouter.com/)

## ✅ Checklist Pre-Deploy

Prima di fare push su main:

- [ ] `npm run build` funziona senza errori
- [ ] `npm test` passa tutti i test
- [ ] Le modifiche sono testate localmente
- [ ] Il commit message è descrittivo
- [ ] Non ci sono console.log() di debug dimenticati
- [ ] Le dipendenze in package.json sono aggiornate

## 🎯 Best Practices

1. **Branch Protection:** Proteggi il branch main richiedendo PR reviews
2. **Staging Environment:** Considera un branch `develop` per test
3. **Semantic Versioning:** Usa tag Git per le versioni (`v1.0.0`)
4. **Changelog:** Mantieni un CHANGELOG.md aggiornato
5. **Monitoring:** Configura alerts per deploy falliti

## 🚨 Note Importanti

⚠️ **Non committare mai:**
- File `.env` con secrets
- `node_modules/`
- File di build locali (`dist/`) - viene generato da GitHub Actions

✅ **Committa sempre:**
- Codice sorgente (`src/`)
- Configurazioni (`vite.config.ts`, `package.json`)
- Assets (`public/`)
- Workflow (`.github/workflows/`)
