# Configurazione Multi-Ambiente per Deploy

Questo documento spiega come l'applicazione Sphyra Wellness Lab gestisce i deployment in diversi ambienti (Docker e GitHub Pages) con configurazioni diverse per i percorsi base.

## Il Problema

L'applicazione deve essere deployabile in due ambienti diversi:

1. **Docker**: L'app è servita dalla root (`/`)
2. **GitHub Pages**: L'app è servita da una sottocartella (`/sphyrawellness/`)

Se configuriamo un percorso fisso, l'app funzionerà solo in uno dei due ambienti.

## La Soluzione

Utilizziamo variabili d'ambiente per configurare dinamicamente il percorso base (`base`) dell'applicazione durante la build.

### File di Configurazione

#### 1. `vite.config.ts`

Il file Vite è stato modificato per leggere il percorso base dalle variabili d'ambiente:

```typescript
const base = process.env.BASE_URL || process.env.VITE_BASE_PATH || '/'
```

Questo significa che Vite userà (in ordine di priorità):
1. La variabile d'ambiente `BASE_URL`
2. La variabile d'ambiente `VITE_BASE_PATH`
3. Il default `/` se nessuna variabile è definita

#### 2. `.env.production` (per GitHub Pages)

```env
BASE_URL=/sphyrawellness/
VITE_BASE_PATH=/sphyrawellness/
```

Questo file viene **automaticamente caricato** da Vite quando si esegue `npm run build` in modalità produzione.

#### 3. `.env.docker.example` (per Docker)

```env
BASE_URL=/
VITE_BASE_PATH=/
```

Questo file serve come template per creare il file `.env` locale per Docker.

#### 4. `Dockerfile`

Il Dockerfile imposta esplicitamente le variabili d'ambiente per Docker:

```dockerfile
ENV BASE_URL=/
ENV VITE_BASE_PATH=/
```

## Come Funziona in Ogni Ambiente

### GitHub Pages

1. Il workflow GitHub Actions (`.github/workflows/deploy.yml`) esegue `npm run build`
2. Vite carica automaticamente `.env.production`
3. L'app viene builddata con `base: '/sphyrawellness/'`
4. Tutti i link e percorsi statici useranno `/sphyrawellness/` come prefisso

**Variabili d'ambiente nel workflow:**
```yaml
env:
  BASE_URL: /sphyrawellness/
  VITE_BASE_PATH: /sphyrawellness/
```

### Docker

1. Il Dockerfile imposta `ENV BASE_URL=/` e `ENV VITE_BASE_PATH=/`
2. Durante `RUN npm run build`, Vite legge queste variabili
3. L'app viene builddata con `base: '/'`
4. Tutti i link e percorsi statici useranno `/` come prefisso
5. Nginx serve l'app dalla root

### Sviluppo Locale

Per lo sviluppo locale con `npm run dev`:
- Non sono necessarie configurazioni speciali
- Vite userà il default `/` come percorso base
- L'app sarà disponibile su `http://localhost:5173/`

## Comandi di Build per Diversi Ambienti

### Build per GitHub Pages
```bash
# Usando .env.production (automatico)
npm run build

# Oppure esplicitamente
BASE_URL=/sphyrawellness/ npm run build
```

### Build per Docker
```bash
# Il Dockerfile gestisce automaticamente le variabili
docker build -t sphyrawellness-frontend .
```

### Build per deployment personalizzato
```bash
# Esempio: deployment in una sottocartella /app/
BASE_URL=/app/ npm run build
```

## File Importanti

| File | Scopo | Committato in Git |
|------|-------|-------------------|
| `.env.production` | Config per GitHub Pages | ✅ Sì |
| `.env.docker.example` | Template per Docker | ✅ Sì |
| `.env` | Config locale (se creato) | ❌ No (in .gitignore) |
| `vite.config.ts` | Configurazione Vite | ✅ Sì |
| `Dockerfile` | Build Docker | ✅ Sì |

## Modificare il Percorso Base

### Per GitHub Pages

1. Modifica `.env.production`:
   ```env
   BASE_URL=/nuovo-percorso/
   VITE_BASE_PATH=/nuovo-percorso/
   ```

2. Modifica `.github/workflows/deploy.yml`:
   ```yaml
   env:
     BASE_URL: /nuovo-percorso/
     VITE_BASE_PATH: /nuovo-percorso/
   ```

3. Modifica `index.html` (meta tag Open Graph):
   ```html
   <meta property="og:url" content="https://tnt-labs.github.io/nuovo-percorso/" />
   ```

### Per Docker

Non è necessario modificare nulla se si vuole mantenere la root (`/`).

Se si vuole un percorso diverso:
1. Modifica il `Dockerfile`:
   ```dockerfile
   ENV BASE_URL=/nuovo-percorso/
   ENV VITE_BASE_PATH=/nuovo-percorso/
   ```

## Verifica della Configurazione

Dopo la build, puoi verificare quale percorso base è stato usato:

```bash
# Controlla l'output della build
npm run build
# Dovresti vedere: "Building with base path: /sphyrawellness/"
```

Oppure ispeziona i file buildati in `dist/`:
```bash
cat dist/index.html | grep -i "script src"
# Dovresti vedere percorsi come: /sphyrawellness/assets/...
```

## Troubleshooting

### L'app non carica gli asset dopo il deploy

**Problema**: Gli asset (JS, CSS, immagini) non vengono caricati.

**Soluzione**: Verifica che il `base` path sia corretto:
1. Controlla i log di build per vedere quale base path è stato usato
2. Verifica che il file `.env.production` esista per GitHub Pages
3. Per Docker, controlla che le ENV vars siano impostate nel Dockerfile

### Le immagini Open Graph non funzionano

**Problema**: Le preview social non mostrano le immagini.

**Soluzione**: Gli URL Open Graph devono essere assoluti. Modifica `index.html`:
```html
<meta property="og:image" content="https://tuodominio.com/percorso/completo/immagine.svg" />
```

### La build usa il percorso sbagliato

**Problema**: La build usa `/` invece di `/sphyrawellness/` (o viceversa).

**Soluzione**:
1. Verifica che il file `.env.production` esista e contenga i valori corretti
2. Controlla che non ci siano file `.env` locali che sovrascrivano i valori
3. Per Docker, verifica le ENV vars nel Dockerfile

## Best Practices

1. **Non committare file `.env` con segreti**: Usa `.env.example` come template
2. **Testa localmente prima del deploy**: Esegui `npm run build` e `npm run preview` per verificare
3. **Mantieni sincronizzati**: Se cambi il base path, aggiornalo in tutti i file rilevanti
4. **Documenta i cambi**: Aggiungi commenti quando modifichi configurazioni di deploy

## Riferimenti

- [Vite - Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Vite - Public Base Path](https://vitejs.dev/config/shared-options.html#base)
- [GitHub Pages - Deployment](https://docs.github.com/en/pages)
