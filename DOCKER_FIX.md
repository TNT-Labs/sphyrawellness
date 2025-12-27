# Fix Docker Sphyra - Istruzioni

## Problemi Identificati e Risolti

### 1. **Nginx in continuo restart**
**Cause**:
- L'healthcheck tentava di fare richiesta HTTPS a `localhost/health`, ma i certificati SSL sono validi solo per il dominio DuckDNS
- Il file di configurazione nginx era bind-mounted e non poteva essere modificato per sostituire `${DOMAIN}`
- Se i certificati non esistevano, nginx non poteva partire

**Soluzioni applicate**:
- Healthcheck modificato per verificare solo che il processo nginx sia attivo e la porta 443 in ascolto
- Nginx config montato come template in `/etc/nginx/templates/` invece di bind mount diretto
- `envsubst` sostituisce `${DOMAIN}` all'avvio e scrive in `/etc/nginx/conf.d/default.conf`
- Aggiunto wait loop: nginx aspetta che i certificati esistano prima di partire
- Disabilitato OCSP stapling (non supportato da Let's Encrypt per DuckDNS)

### 2. **Frontend unhealthy**
**Cause**:
- L'healthcheck cercava l'endpoint `/health` che non esiste nel frontend
- L'healthcheck usava `localhost` che si risolveva in IPv6, ma nginx ascolta solo su IPv4

**Soluzioni applicate**:
- Healthcheck modificato per controllare `/` invece di `/health`
- Usato indirizzo IPv4 esplicito (`127.0.0.1`) invece di `localhost`

## Passi per Sistemare l'Applicazione

### Step 1: Ferma i container attuali
```bash
cd /mnt/usbssd/sphyrawellness
docker compose -f docker-compose.duckdns.yml down
```

### Step 2: Verifica se i certificati esistono
```bash
ls -la certbot/conf/live/sphyrawellnesslab.duckdns.org/
```

**Se i certificati NON esistono**, procedi con lo Step 3.
**Se i certificati esistono**, vai direttamente allo Step 4.

### Step 3: Genera i certificati SSL (solo se non esistono)
```bash
# Rendi eseguibile lo script
chmod +x scripts/get-cert-duckdns.sh

# Esegui lo script per ottenere i certificati
./scripts/get-cert-duckdns.sh
```

Lo script:
1. Verifica che il file `.env` sia configurato correttamente
2. Costruisce l'immagine Docker per certbot con supporto DuckDNS
3. Richiede il certificato SSL utilizzando il metodo DNS-01 Challenge
4. Salva i certificati in `certbot/conf/live/sphyrawellnesslab.duckdns.org/`

**Nota**: Il processo può richiedere alcuni minuti perché deve attendere la propagazione DNS.

### Step 4: Avvia i container con la configurazione corretta
```bash
docker compose -f docker-compose.duckdns.yml up -d
```

### Step 5: Verifica lo stato dei container
```bash
# Verifica che tutti i container siano in esecuzione
docker ps

# Controlla i log di nginx per verificare che sia partito correttamente
docker logs sphyra-nginx

# Controlla i log del frontend
docker logs sphyra-frontend

# Verifica lo stato di salute
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Dovresti vedere:
- `sphyra-nginx`: Up X minutes (healthy)
- `sphyra-frontend`: Up X minutes (healthy)
- `sphyra-backend`: Up X minutes (healthy)
- `sphyra-postgres`: Up X minutes (healthy)
- `sphyra-certbot`: Up X minutes

### Step 6: Testa l'applicazione
```bash
# Test da locale (Raspberry Pi)
curl -k https://localhost

# Test dal browser
# Apri: https://sphyrawellnesslab.duckdns.org
```

## Modifiche Applicate ai File

### `docker-compose.duckdns.yml`

1. **Nginx volumes** (riga 26):
   ```yaml
   # Prima (NON funzionava - bind mount non modificabile):
   - ./nginx/conf.d/sphyra-duckdns.conf:/etc/nginx/conf.d/default.conf:ro

   # Dopo (funziona - template):
   - ./nginx/conf.d/sphyra-duckdns.conf:/etc/nginx/templates/default.conf.template:ro
   ```

2. **Nginx healthcheck** (riga 37-41):
   ```yaml
   healthcheck:
     test: ["CMD-SHELL", "pgrep nginx && nc -z localhost 443 || exit 1"]
     interval: 30s
     timeout: 10s
     retries: 3
     start_period: 40s  # Aumentato a 40s per dare tempo ai certificati
   ```

3. **Nginx command** (riga 44-57):
   - Aggiunto wait loop che aspetta l'esistenza dei certificati
   - `envsubst` legge da `/etc/nginx/templates/` e scrive in `/etc/nginx/conf.d/`
   - Aggiunto test della configurazione con `nginx -t`

4. **Frontend healthcheck** (riga 181):
   ```yaml
   healthcheck:
     test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1/"]
     # Cambiato da localhost a 127.0.0.1 per forzare IPv4
     interval: 30s
     timeout: 10s
     retries: 3
     start_period: 10s
   ```

### `nginx/conf.d/sphyra-duckdns.conf`

1. **HTTP/2 configuration** (riga 21-23):
   ```nginx
   # Prima (sintassi deprecata):
   listen 443 ssl http2;

   # Dopo (sintassi moderna):
   listen 443 ssl;
   http2 on;
   ```

2. **OCSP Stapling** (riga 40-45):
   ```nginx
   # Disabilitato perché non supportato da Let's Encrypt per DuckDNS
   # ssl_stapling on;
   # ssl_stapling_verify on;
   ```

## Troubleshooting

### Se nginx continua a fare restart:
```bash
# Controlla i log dettagliati
docker logs sphyra-nginx --tail 100

# Verifica che i certificati esistano
docker exec sphyra-nginx ls -la /etc/letsencrypt/live/sphyrawellnesslab.duckdns.org/

# Verifica la configurazione nginx
docker exec sphyra-nginx nginx -t
```

### Se frontend è unhealthy:
```bash
# Controlla i log
docker logs sphyra-frontend --tail 50

# Testa manualmente l'healthcheck
docker exec sphyra-frontend wget --no-verbose --tries=1 --spider http://localhost/
```

### Se i certificati non vengono generati:
```bash
# Verifica che il token DuckDNS sia corretto
cat .env | grep DUCKDNS_TOKEN

# Verifica che il dominio sia raggiungibile
ping sphyrawellnesslab.duckdns.org

# Controlla i log del container certbot
docker logs sphyra-certbot
```

## Rinnovo Automatico Certificati

Il container `sphyra-certbot` è configurato per rinnovare automaticamente i certificati ogni 12 ore.
I certificati Let's Encrypt scadono dopo 90 giorni, ma il rinnovo automatico garantisce che vengano rinnovati in tempo.

## Note Importanti

1. **Porta 443**: Assicurati che la porta 443 sia instradata correttamente verso il Raspberry Pi
2. **DuckDNS**: Il dominio deve essere configurato su DuckDNS e puntare all'IP pubblico
3. **Token DuckDNS**: Mantieni il token segreto e non condividerlo
4. **Firewall**: Verifica che il firewall permetta il traffico sulla porta 443

## Verifica Finale

Dopo aver completato tutti gli step, l'applicazione dovrebbe essere accessibile tramite:
- **HTTPS**: https://sphyrawellnesslab.duckdns.org
- **API**: https://sphyrawellnesslab.duckdns.org/api/health

Tutti i container dovrebbero essere in stato `healthy` e non dovrebbero esserci restart continui.
