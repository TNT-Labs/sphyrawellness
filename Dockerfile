# Frontend Dockerfile - React + Vite
# Multi-stage build per ottimizzare dimensioni immagine

# Stage 1: Build
FROM node:20-alpine AS builder

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file di configurazione delle dipendenze
COPY package*.json ./

# Installa le dipendenze
RUN npm ci

# Copia tutto il codice sorgente
COPY . .

# Build dell'applicazione
# VITE_API_URL viene passato come build argument
ARG VITE_API_URL=http://localhost:3001/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Production con Nginx
FROM nginx:alpine

# Copia la configurazione Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia i file buildati dallo stage precedente
COPY --from=builder /app/dist /usr/share/nginx/html

# Espone la porta 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Avvia Nginx
CMD ["nginx", "-g", "daemon off;"]
