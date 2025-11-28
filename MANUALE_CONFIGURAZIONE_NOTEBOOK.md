# 📖 Manuale Configurazione Notebook - Sphyra Wellness PWA

Guida completa per configurare il tuo notebook e iniziare a sviluppare l'applicazione Sphyra Wellness.

---

## 📋 Indice

1. [Requisiti di Sistema](#requisiti-di-sistema)
2. [Installazione Prerequisiti](#installazione-prerequisiti)
3. [Clonazione del Progetto](#clonazione-del-progetto)
4. [Configurazione Ambiente](#configurazione-ambiente)
5. [Esecuzione Applicazione](#esecuzione-applicazione)
6. [Comandi Utili](#comandi-utili)
7. [Troubleshooting](#troubleshooting)
8. [Strumenti Consigliati](#strumenti-consigliati)

---

## 🖥️ Requisiti di Sistema

### Sistema Operativo
- **Windows 10/11** (64-bit)
- **macOS 10.15** o superiore
- **Linux** (Ubuntu 20.04+, Debian, Fedora, ecc.)

### Hardware Minimo
- **RAM**: 4 GB (8 GB consigliati)
- **Spazio Disco**: 2 GB disponibili
- **Processore**: Dual-core 2.0 GHz o superiore

### Software Richiesto
- **Node.js**: versione 18.x o superiore
- **npm**: versione 9.x o superiore (incluso con Node.js)
- **Git**: ultima versione stabile
- **Editor di codice**: VS Code (consigliato)
- **Browser**: Chrome, Firefox o Edge (ultimi 2 versioni)

---

## 🔧 Installazione Prerequisiti

### 1. Installazione Node.js e npm

#### Windows
1. Scarica l'installer da [nodejs.org](https://nodejs.org/)
2. Scegli la versione **LTS** (Long Term Support)
3. Esegui l'installer e segui la procedura guidata
4. Assicurati di selezionare l'opzione "Add to PATH"
5. Riavvia il terminale/prompt dei comandi

#### macOS
**Opzione A - Installer ufficiale:**
```bash
# Scarica da https://nodejs.org/
# Oppure usa Homebrew:
brew install node
```

**Opzione B - nvm (consigliato):**
```bash
# Installa nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Riavvia il terminale, poi:
nvm install 18
nvm use 18
```

#### Linux (Ubuntu/Debian)
```bash
# Metodo 1 - Repository ufficiale NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Metodo 2 - nvm (consigliato)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

#### Verifica Installazione
Apri un terminale e digita:
```bash
node --version
# Output atteso: v18.x.x o superiore

npm --version
# Output atteso: 9.x.x o superiore
```

### 2. Installazione Git

#### Windows
1. Scarica Git da [git-scm.com](https://git-scm.com/download/win)
2. Esegui l'installer
3. Usa le impostazioni predefinite (o personalizza se necessario)
4. Riavvia il terminale

#### macOS
```bash
# Installa con Homebrew
brew install git

# Oppure scarica da git-scm.com
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install git
```

#### Verifica Installazione
```bash
git --version
# Output atteso: git version 2.x.x
```

#### Configurazione Git (Prima Volta)
```bash
git config --global user.name "Il Tuo Nome"
git config --global user.email "tua.email@example.com"
```

### 3. Installazione Editor di Codice (VS Code)

#### Download
Scarica Visual Studio Code da [code.visualstudio.com](https://code.visualstudio.com/)

#### Estensioni Consigliate per VS Code
Installa queste estensioni per migliorare l'esperienza di sviluppo:

1. **ESLint** - Linting JavaScript/TypeScript
2. **Prettier** - Formattazione codice
3. **Tailwind CSS IntelliSense** - Autocompletamento Tailwind
4. **TypeScript Vue Plugin (Volar)** - Supporto TypeScript
5. **GitLens** - Strumenti Git avanzati
6. **Auto Rename Tag** - Rinomina tag HTML automaticamente
7. **Path Intellisense** - Autocompletamento percorsi file
8. **Error Lens** - Visualizzazione errori inline

Per installarle rapidamente, apri il terminale in VS Code (`Ctrl+\``) e digita:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension Vue.volar
code --install-extension eamodio.gitlens
code --install-extension formulahendry.auto-rename-tag
code --install-extension christian-kohler.path-intellisense
code --install-extension usernamehw.errorlens
```

---

## 📥 Clonazione del Progetto

### 1. Scegli una Directory di Lavoro

Crea o scegli una cartella dove mantenere i tuoi progetti:

**Windows:**
```cmd
# Ad esempio:
cd C:\Users\TuoNome\Progetti
# oppure
mkdir C:\dev
cd C:\dev
```

**macOS/Linux:**
```bash
# Ad esempio:
cd ~/Projects
# oppure
mkdir ~/dev
cd ~/dev
```

### 2. Clona il Repository

```bash
git clone https://github.com/TNT-Labs/sphyrawellness.git
```

### 3. Entra nella Directory del Progetto

```bash
cd sphyrawellness
```

### 4. Verifica il Branch

Il branch di sviluppo attuale è `claude/notebook-setup-manual-01AmKcXXNqr2boheQg9UvYxJ`:

```bash
# Verifica il branch corrente
git branch

# Se necessario, cambia branch
git checkout claude/notebook-setup-manual-01AmKcXXNqr2boheQg9UvYxJ
```

---

## ⚙️ Configurazione Ambiente

### 1. Installazione Dipendenze

Nella directory del progetto, esegui:

```bash
npm install
```

Questo comando:
- Legge il file `package.json`
- Scarica e installa tutte le dipendenze necessarie
- Crea la cartella `node_modules`
- Genera il file `package-lock.json` (se non esiste)

**Tempo stimato**: 2-5 minuti (dipende dalla velocità di connessione)

**Cosa viene installato:**
- **React 18** - Framework UI
- **TypeScript** - Linguaggio tipizzato
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS utility-first
- **React Router** - Gestione routing
- **Vite PWA Plugin** - Supporto Progressive Web App
- **PouchDB** - Database locale
- **date-fns** - Utilità per date
- **Lucide React** - Icone

### 2. Verifica Struttura Progetto

Dopo l'installazione, la struttura dovrebbe essere:

```
sphyrawellness/
├── .github/              # Configurazione GitHub Actions
├── node_modules/         # Dipendenze (generato da npm install)
├── public/              # File statici (icone, favicon, ecc.)
├── src/                 # Codice sorgente applicazione
│   ├── components/      # Componenti React
│   ├── pages/          # Pagine dell'app
│   ├── services/       # Servizi (database, API)
│   ├── types/          # Definizioni TypeScript
│   ├── utils/          # Funzioni di utilità
│   ├── App.tsx         # Componente principale
│   ├── main.tsx        # Entry point
│   └── index.css       # Stili globali
├── .gitignore          # File ignorati da Git
├── index.html          # Template HTML
├── package.json        # Configurazione npm e dipendenze
├── package-lock.json   # Lock delle versioni dipendenze
├── tsconfig.json       # Configurazione TypeScript
├── tailwind.config.js  # Configurazione Tailwind CSS
├── vite.config.ts      # Configurazione Vite
└── README.md           # Documentazione progetto
```

---

## 🚀 Esecuzione Applicazione

### Modalità Sviluppo (Development)

Questa è la modalità che userai durante lo sviluppo:

```bash
npm run dev
```

**Cosa succede:**
- Vite avvia un server di sviluppo locale
- L'app viene compilata in modalità "hot reload" (aggiornamenti automatici)
- Il server resta in ascolto su `http://localhost:5173`
- Il PWA service worker è abilitato anche in dev mode

**Output atteso:**
```
  VITE v5.4.3  ready in 523 ms

  ➜  Local:   http://localhost:5173/sphyrawellness/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Come accedere all'app:**
1. Apri il browser
2. Vai su `http://localhost:5173/sphyrawellness/`
3. L'app si caricherà automaticamente

**Funzionalità Dev Mode:**
- ✅ **Hot Module Replacement (HMR)**: Le modifiche al codice si riflettono istantaneamente nel browser
- ✅ **Source Maps**: Debug facilitato con riferimenti al codice originale
- ✅ **Error Overlay**: Gli errori vengono mostrati direttamente nel browser
- ✅ **PWA DevOptions**: Service worker attivo anche in sviluppo

**Per fermare il server:**
Premi `Ctrl+C` nel terminale

### Modalità Build (Produzione)

Per creare una build ottimizzata per la produzione:

```bash
npm run build
```

**Cosa succede:**
- TypeScript compila e verifica i tipi
- Vite crea una build ottimizzata nella cartella `dist/`
- Minificazione del codice
- Tree-shaking (rimozione codice non utilizzato)
- Ottimizzazione asset (immagini, CSS, JS)
- Generazione service worker per PWA
- Generazione manifest.json

**Output atteso:**
```
vite v5.4.3 building for production...
✓ 234 modules transformed.
dist/index.html                    0.52 kB │ gzip:  0.31 kB
dist/assets/index-a1b2c3d4.css     45.23 kB │ gzip: 12.45 kB
dist/assets/index-e5f6g7h8.js     156.78 kB │ gzip: 52.34 kB
✓ built in 3.45s
```

### Modalità Preview (Anteprima Produzione)

Per testare la build di produzione in locale:

```bash
npm run preview
```

**Cosa succede:**
- Vite avvia un server locale che serve la cartella `dist/`
- Simula l'ambiente di produzione
- Disponibile su `http://localhost:4173`

**Utilizzo tipico:**
```bash
# 1. Crea la build
npm run build

# 2. Testa la build
npm run preview
```

---

## 🛠️ Comandi Utili

### Comandi npm

```bash
# Installazione dipendenze
npm install

# Avvio sviluppo
npm run dev

# Build produzione
npm run build

# Preview build produzione
npm run preview

# Linting del codice
npm run lint

# Pulizia node_modules e reinstallazione
rm -rf node_modules package-lock.json
npm install

# Aggiornamento dipendenze (attenzione!)
npm update

# Verifica dipendenze obsolete
npm outdated

# Audit sicurezza dipendenze
npm audit
```

### Comandi Git

```bash
# Stato del repository
git status

# Vedi le modifiche
git diff

# Aggiungi file allo stage
git add .

# Commit delle modifiche
git commit -m "Descrizione modifiche"

# Push su GitHub
git push -u origin claude/notebook-setup-manual-01AmKcXXNqr2boheQg9UvYxJ

# Pull delle ultime modifiche
git pull origin claude/notebook-setup-manual-01AmKcXXNqr2boheQg9UvYxJ

# Verifica branch
git branch

# Cambia branch
git checkout nome-branch

# Crea nuovo branch
git checkout -b nome-nuovo-branch

# Visualizza storico commit
git log --oneline

# Annulla modifiche non committate
git checkout -- .

# Annulla ultimo commit (mantieni modifiche)
git reset --soft HEAD~1
```

### Comandi Vite Dev Server

Quando il server di sviluppo è in esecuzione, puoi usare questi comandi:

- `r` + `Enter`: Riavvia server
- `u` + `Enter`: Mostra URL
- `o` + `Enter`: Apri nel browser
- `c` + `Enter`: Pulisci console
- `q` + `Enter`: Esci dal server
- `h` + `Enter`: Mostra tutti i comandi

---

## 🔍 Testing e Debug

### Test della PWA

#### 1. Test in Modalità Sviluppo

```bash
npm run dev
```

Apri Chrome DevTools (`F12`):
1. Vai su **Application** > **Service Workers**
2. Verifica che il SW sia registrato
3. Vai su **Application** > **Manifest**
4. Verifica che il manifest sia valido

#### 2. Test in Modalità Produzione

```bash
npm run build
npm run preview
```

Apri `http://localhost:4173/sphyrawellness/` e verifica:
- ✅ Service worker attivo
- ✅ Funzionamento offline (attiva "Offline" in DevTools > Network)
- ✅ App installabile (icona + nella barra indirizzi)
- ✅ Icone caricate correttamente

#### 3. Lighthouse Audit

In Chrome DevTools:
1. Vai su **Lighthouse**
2. Seleziona tutte le categorie
3. Clicca "Analyze page load"
4. Verifica score PWA > 90

### Debug Common Issues

#### Port già in uso
```bash
# Se la porta 5173 è occupata
npm run dev -- --port 3000
```

#### Cache del browser
```bash
# Svuota cache in Chrome DevTools
# Application > Storage > Clear site data
```

#### Service Worker stuck
```bash
# In Chrome DevTools
# Application > Service Workers > Unregister
# Poi ricarica la pagina
```

---

## ❗ Troubleshooting

### Problema: `npm install` fallisce

**Causa possibile**: Permessi insufficienti, cache corrotta, proxy

**Soluzioni**:
```bash
# 1. Pulisci cache npm
npm cache clean --force

# 2. Riprova installazione
npm install

# 3. Se sei dietro un proxy aziendale
npm config set proxy http://proxy.azienda.com:8080
npm config set https-proxy http://proxy.azienda.com:8080

# 4. Verifica permessi (Linux/macOS)
sudo chown -R $USER ~/.npm
```

### Problema: `npm run dev` non avvia il server

**Causa possibile**: Porta occupata, dipendenze mancanti

**Soluzioni**:
```bash
# 1. Verifica che node_modules esista
ls node_modules

# 2. Se manca, reinstalla
npm install

# 3. Usa una porta diversa
npm run dev -- --port 3000

# 4. Verifica processi Node.js attivi (Windows)
tasklist | findstr node

# 4. Verifica processi Node.js attivi (macOS/Linux)
ps aux | grep node
```

### Problema: Errori TypeScript

**Causa possibile**: Tipi mancanti, configurazione errata

**Soluzioni**:
```bash
# 1. Verifica tsconfig.json esista
cat tsconfig.json

# 2. Reinstalla tipi
npm install --save-dev @types/react @types/react-dom

# 3. Riavvia TypeScript server in VS Code
# Ctrl+Shift+P > "TypeScript: Restart TS Server"
```

### Problema: Modifiche non si riflettono nel browser

**Causa possibile**: Cache, HMR non funzionante

**Soluzioni**:
```bash
# 1. Hard reload nel browser
# Windows/Linux: Ctrl+Shift+R
# macOS: Cmd+Shift+R

# 2. Riavvia dev server
# Ctrl+C nel terminale, poi npm run dev

# 3. Pulisci cartella dist e cache Vite
rm -rf dist
rm -rf node_modules/.vite
npm run dev
```

### Problema: Service Worker non si registra

**Causa possibile**: HTTP invece di HTTPS, base path errato

**Soluzioni**:
- Il SW funziona solo su HTTPS o localhost
- Verifica `vite.config.ts` > `base: '/sphyrawellness/'`
- Rebuilda: `npm run build && npm run preview`

### Problema: Errori CORS in sviluppo

**Causa possibile**: Chiamate API cross-origin

**Soluzione**:
Aggiungi proxy in `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://api.esempio.com',
        changeOrigin: true,
      }
    }
  }
})
```

### Problema: Out of Memory durante build

**Causa possibile**: Progetto grande, RAM insufficiente

**Soluzione**:
```bash
# Aumenta heap size di Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Windows (PowerShell)
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Windows (CMD)
set NODE_OPTIONS=--max-old-space-size=4096
npm run build
```

---

## 🧰 Strumenti Consigliati

### Browser Extensions

#### Chrome/Edge
- **React Developer Tools** - Debug componenti React
- **Redux DevTools** - Debug state management (se usato)
- **Lighthouse** - Audit PWA e performance (integrato in DevTools)

#### Firefox
- **React Developer Tools**
- **Vue.js devtools** (compatibile con molti framework)

### Terminali Consigliati

#### Windows
- **Windows Terminal** (raccomandato) - [Microsoft Store](https://aka.ms/terminal)
- **Git Bash** (incluso con Git)
- **PowerShell 7+**

#### macOS
- **iTerm2** - Terminal potenziato
- **Terminal** (built-in)

#### Linux
- **Gnome Terminal**
- **Terminator**
- **Tilix**

### Strumenti di Produttività

#### VS Code Settings Consigliate

Crea/modifica `.vscode/settings.json` nel progetto:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

#### Scorciatoie VS Code Utili

- `Ctrl+P` (Cmd+P): Apri file velocemente
- `Ctrl+Shift+P` (Cmd+Shift+P): Command palette
- `Ctrl+\`` (Cmd+\`): Toggle terminale
- `Ctrl+B` (Cmd+B): Toggle sidebar
- `Ctrl+/` (Cmd+/): Commenta/decommenta
- `Alt+↑/↓` (Option+↑/↓): Sposta linea su/giù
- `Shift+Alt+↑/↓` (Shift+Option+↑/↓): Duplica linea
- `Ctrl+D` (Cmd+D): Seleziona occorrenza successiva
- `F2`: Rinomina simbolo

---

## 📚 Risorse Utili

### Documentazione Ufficiale

- **React**: [react.dev](https://react.dev)
- **TypeScript**: [typescriptlang.org](https://www.typescriptlang.org/docs/)
- **Vite**: [vitejs.dev](https://vitejs.dev)
- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com/docs)
- **React Router**: [reactrouter.com](https://reactrouter.com)
- **PWA**: [web.dev/progressive-web-apps](https://web.dev/progressive-web-apps/)

### Guide e Tutorial

- **MDN Web Docs**: [developer.mozilla.org](https://developer.mozilla.org)
- **freeCodeCamp**: Tutorial React gratuiti
- **TypeScript Handbook**: Guida completa TypeScript
- **Tailwind CSS Play**: [play.tailwindcss.com](https://play.tailwindcss.com)

### Community e Supporto

- **Stack Overflow**: Domande tecniche
- **GitHub Issues**: Segnalazione bug del progetto
- **React Community**: Discord e forum ufficiali
- **Dev.to**: Articoli e tutorial community

---

## 🎯 Prossimi Passi

Dopo aver configurato il notebook:

1. ✅ **Familiarizza con il progetto**
   - Esplora la struttura delle cartelle
   - Leggi il file `README.md`
   - Esamina il codice in `src/`

2. ✅ **Esegui l'app in dev mode**
   ```bash
   npm run dev
   ```

3. ✅ **Apporta una piccola modifica**
   - Modifica un testo in `src/App.tsx`
   - Osserva l'hot reload nel browser

4. ✅ **Testa la build di produzione**
   ```bash
   npm run build
   npm run preview
   ```

5. ✅ **Configura Git per il tuo lavoro**
   ```bash
   git config user.name "Tuo Nome"
   git config user.email "tua@email.com"
   ```

6. ✅ **Esplora le funzionalità PWA**
   - Installa l'app nel browser
   - Testa la modalità offline
   - Esamina il service worker

---

## 📞 Supporto

Se incontri problemi durante la configurazione:

1. **Controlla la sezione Troubleshooting** di questo manuale
2. **Consulta i log** nel terminale per messaggi di errore
3. **Verifica i requisiti di sistema** siano soddisfatti
4. **Cerca online** l'errore specifico (Stack Overflow, GitHub Issues)
5. **Contatta il team** se il problema persiste

---

## ✅ Checklist Configurazione Completata

Prima di iniziare a sviluppare, assicurati di aver completato:

- [ ] Node.js 18+ installato e verificato
- [ ] npm 9+ installato e verificato
- [ ] Git installato e configurato
- [ ] VS Code installato con estensioni consigliate
- [ ] Repository clonato localmente
- [ ] Dipendenze installate (`npm install`)
- [ ] Dev server avviato con successo (`npm run dev`)
- [ ] App accessibile su `http://localhost:5173/sphyrawellness/`
- [ ] Build di produzione funzionante (`npm run build`)
- [ ] Preview testato (`npm run preview`)
- [ ] Service Worker registrato correttamente
- [ ] PWA installabile nel browser

---

## 📝 Note Finali

- **Backup**: Fai commit frequenti del tuo lavoro con Git
- **Documentazione**: Commenta il codice complesso
- **Performance**: Monitora le performance con Lighthouse
- **Sicurezza**: Mantieni le dipendenze aggiornate (`npm audit`)
- **Testing**: Testa sempre su browser diversi

**Buon sviluppo! 🚀**

---

*Ultimo aggiornamento: 28 Novembre 2025*
*Versione manuale: 1.0.0*
