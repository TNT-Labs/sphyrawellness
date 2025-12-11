# Dockerfile per il Frontend Sphyra Wellness PWA
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

# Set BASE_URL for Docker deployment (root path)
ENV BASE_URL=/
ENV VITE_BASE_PATH=/

# Build dell'applicazione per produzione
RUN npm run build

# Stage 2: Serve con Nginx
FROM nginx:alpine

# Copia i file buildati dallo stage precedente
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configurazione nginx personalizzata per SPA
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://backend:3001; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Espone la porta 80
EXPOSE 80

# Avvia nginx
CMD ["nginx", "-g", "daemon off;"]
