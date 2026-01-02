1. Log in Tempo Reale (Console) - Modo più semplice
Quando avvii l'applicazione con Docker, Winston scrive automaticamente sulla console:

# Vedere tutti i log
docker compose -f docker-compose.duckdns.yml logs -f

# Vedere solo i log del backend
docker compose -f docker-compose.duckdns.yml logs -f backend

# Ultimi 100 log del backend
docker compose -f docker-compose.duckdns.yml logs --tail=100 -f backend

I log appariranno così:

sphyra-backend | 2026-01-02 20:15:23 [info]: Starting Sphyra Wellness Lab Server
sphyra-backend | 2026-01-02 20:15:24 [info]: SendGrid configured successfully
sphyra-backend | 2026-01-02 20:15:25 [info]: Daily reminder cron job initialized {"checkInterval":"every minute"}
sphyra-backend | 2026-01-02 20:15:26 [info]: Sphyra Wellness Lab Server started successfully {"port":3001,"environment":"production"}
sphyra-backend | 2026-01-02 20:15:30 [info]: Incoming request {"method":"GET","path":"/health","ip":"172.18.0.1"}
sphyra-backend | 2026-01-02 20:15:30 [info]: Outgoing response {"statusCode":200,"duration":"12ms"}

2. File di Log (Solo in Produzione)
In produzione (NODE_ENV=production), Winston scrive anche su file dentro il container:

# Accedere al container
docker exec -it sphyra-backend sh

# Vedere i log combinati
cat logs/combined.log

# Vedere solo gli errori
cat logs/error.log

# Seguire i log in tempo reale
tail -f logs/combined.log

# Ultimi 50 log
tail -n 50 logs/combined.log

I file di log hanno:

Rotazione automatica: Max 5MB per file, mantiene 5 file
Formato JSON strutturato per analisi facile
3. Log Strutturati - Cercare Informazioni Specifiche
Filtrare i log per livello o contenuto:

# Solo errori
docker compose -f docker-compose.duckdns.yml logs backend | grep "\[error\]"

# Solo warning
docker compose -f docker-compose.duckdns.yml logs backend | grep "\[warn\]"

# Tracciare richieste a un endpoint specifico
docker compose -f docker-compose.duckdns.yml logs backend | grep "/api/appointments"

# Vedere log di un utente specifico (se autenticato)
docker compose -f docker-compose.duckdns.yml logs backend | grep "userId"

4. Log di Audit e Sicurezza
I log di audit (login, accessi, modifiche) sono prefissati con [AUDIT]:

# Vedere tutti i log di audit
docker compose -f docker-compose.duckdns.yml logs backend | grep "\[AUDIT"

# Login falliti
docker compose -f docker-compose.duckdns.yml logs backend | grep "LOGIN_FAILURE"

# Accessi non autorizzati
docker compose -f docker-compose.duckdns.yml logs backend | grep "UNAUTHORIZED_ACCESS"

5. Livelli di Log
Winston usa questi livelli (in ordine di importanza):

error: Errori critici (sempre mostrati)
warn: Warning/avvisi (sempre mostrati)
info: Informazioni generali (produzione e sviluppo)
debug: Debug dettagliato (solo sviluppo)
6. Esportare i Log
Per salvare i log localmente per analisi:

# Salvare gli ultimi 1000 log del backend
docker compose -f docker-compose.duckdns.yml logs --tail=1000 backend > backend-logs.txt

# Salvare tutti i log dal container (file di log)
docker cp sphyra-backend:/app/logs ./logs-backup

7. Monitoraggio in Tempo Reale con Filtri
# Vedere solo richieste HTTP
docker compose -f docker-compose.duckdns.yml logs -f backend | grep -E "(Incoming request|Outgoing response)"

# Vedere errori e warning in tempo reale
docker compose -f docker-compose.duckdns.yml logs -f backend | grep -E "\[(error|warn)\]"

# Performance: richieste lente (più di 1 secondo)
docker compose -f docker-compose.duckdns.yml logs -f backend | grep -E "[0-9]{4,}ms"
