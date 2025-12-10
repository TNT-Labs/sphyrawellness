# Dockerfile per il Backend Sphyra Wellness API
# Multi-stage build per ottimizzare dimensioni immagine

# Stage 1: Build
FROM node:20-alpine AS builder

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file di configurazione delle dipendenze
COPY package*.json ./

# Installa tutte le dipendenze (incluse devDependencies per il build)
RUN npm ci

# Copia tutto il codice sorgente
COPY . .

# Build dell'applicazione TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

# Installa dumb-init per gestione corretta dei segnali
RUN apk add --no-cache dumb-init

# Crea utente non-root per sicurezza
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file di configurazione delle dipendenze
COPY package*.json ./

# Installa solo le dipendenze di produzione
RUN npm ci --only=production

# Copia i file buildati dallo stage precedente
COPY --from=builder /app/dist ./dist

# Cambia ownership dei file all'utente nodejs
RUN chown -R nodejs:nodejs /app

# Passa all'utente non-root
USER nodejs

# Espone la porta 3001
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Usa dumb-init per gestione corretta dei segnali
ENTRYPOINT ["dumb-init", "--"]

# Avvia l'applicazione
CMD ["node", "dist/index.js"]
