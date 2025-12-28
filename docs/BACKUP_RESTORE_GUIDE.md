# 📦 Database Backup & Restore Guide

Guida completa per il backup e il ripristino del database PostgreSQL.

## 🔄 Backup Automatico

### Setup Crontab (Raccomandato)

Per eseguire backup giornalieri automatici alle 2:00 AM:

```bash
# Apri il crontab
crontab -e

# Aggiungi questa riga (sostituisci il path)
0 2 * * * cd /path/to/sphyrawellness && ./scripts/backup-database.sh >> /var/log/sphyra-backup.log 2>&1
```

### Backup Manuale

```bash
# Esegui backup manuale
./scripts/backup-database.sh

# Il backup sarà salvato in: ./backups/sphyra_wellness_YYYYMMDD_HHMMSS.sql.gz
```

### Configurazione

Puoi personalizzare il comportamento tramite variabili d'ambiente:

```bash
# Directory backup personalizzata
BACKUP_DIR=/mnt/backup/sphyra ./scripts/backup-database.sh

# Giorni di retention (default: 30)
BACKUP_RETENTION_DAYS=60 ./scripts/backup-database.sh

# Database e utente personalizzati
POSTGRES_DB=my_db POSTGRES_USER=my_user ./scripts/backup-database.sh
```

## ♻️ Ripristino Database

### ⚠️ ATTENZIONE

Il ripristino **SOVRASCRIVE** completamente il database esistente. Tutti i dati attuali saranno persi!

### Procedura di Ripristino

1. **Verifica i backup disponibili:**

```bash
ls -lh backups/
```

2. **Esegui il ripristino:**

```bash
./scripts/restore-database.sh backups/sphyra_wellness_20240115_020000.sql.gz
```

3. **Conferma l'operazione** digitando `yes` quando richiesto

4. **Verifica** che i dati siano corretti:

```bash
# Controlla il database
docker exec -it sphyra-postgres psql -U sphyra_user -d sphyra_wellness -c "SELECT COUNT(*) FROM customers;"
```

### Safety Backup Automatico

Lo script di restore crea automaticamente un backup di sicurezza prima di sovrascrivere il database:

```bash
# Backup di sicurezza salvato in:
./backups/pre_restore_YYYYMMDD_HHMMSS.sql.gz
```

## 📊 Monitoraggio Backup

### Verifica ultimo backup

```bash
ls -lth backups/ | head -n 5
```

### Controlla dimensione totale backup

```bash
du -sh backups/
```

### Test integrità backup

```bash
# Testa che il file gzip non sia corrotto
gunzip -t backups/sphyra_wellness_20240115_020000.sql.gz

# Se restituisce nessun output, il file è OK
echo $?  # Deve restituire 0
```

## 🔐 Backup Offsite (Raccomandato)

Per maggiore sicurezza, salva i backup anche in location remote:

### Opzione 1: Rsync su server remoto

```bash
# Aggiungi al crontab dopo il backup
5 2 * * * rsync -avz /path/to/sphyrawellness/backups/ user@remote:/backups/sphyra/
```

### Opzione 2: Cloud Storage (AWS S3, Google Cloud, etc.)

```bash
# Esempio con rclone (dopo aver configurato rclone)
10 2 * * * rclone sync /path/to/sphyrawellness/backups/ remote:sphyra-backups/
```

### Opzione 3: Backup locale su disco esterno

```bash
# Monta disco esterno e copia
15 2 * * * cp -r /path/to/sphyrawellness/backups/* /mnt/external-drive/sphyra-backups/
```

## 📅 Strategia di Retention Consigliata

- **Backup giornalieri**: Ultimi 7 giorni (7 backup)
- **Backup settimanali**: Ultime 4 settimane (4 backup)
- **Backup mensili**: Ultimi 12 mesi (12 backup)

Script esempio per retention avanzata:

```bash
#!/bin/bash
# Advanced retention: daily (7 days), weekly (4 weeks), monthly (12 months)

BACKUP_DIR="./backups"
TODAY=$(date +%Y%m%d)

# Daily backups (keep last 7 days)
find "$BACKUP_DIR" -name "sphyra_wellness_*.sql.gz" -type f -mtime +7 -not -name "*_weekly_*" -not -name "*_monthly_*" -delete

# Weekly backups (every Sunday)
if [ $(date +%u) -eq 7 ]; then
    cp "$BACKUP_DIR/sphyra_wellness_${TODAY}_*.sql.gz" "$BACKUP_DIR/sphyra_wellness_${TODAY}_weekly.sql.gz" 2>/dev/null || true
    # Keep last 4 weekly
    find "$BACKUP_DIR" -name "*_weekly_*.sql.gz" -type f -mtime +28 -delete
fi

# Monthly backups (first day of month)
if [ $(date +%d) -eq 01 ]; then
    cp "$BACKUP_DIR/sphyra_wellness_${TODAY}_*.sql.gz" "$BACKUP_DIR/sphyra_wellness_${TODAY}_monthly.sql.gz" 2>/dev/null || true
    # Keep last 12 monthly
    find "$BACKUP_DIR" -name "*_monthly_*.sql.gz" -type f -mtime +365 -delete
fi
```

## 🆘 Disaster Recovery

### Scenario 1: Corruzione Database

```bash
# 1. Stop applicazione
docker compose -f docker-compose.duckdns.yml down

# 2. Ripristina ultimo backup funzionante
./scripts/restore-database.sh backups/sphyra_wellness_LAST_GOOD.sql.gz

# 3. Riavvia applicazione
docker compose -f docker-compose.duckdns.yml up -d
```

### Scenario 2: Server compromesso

```bash
# 1. Setup nuovo server
# 2. Installa Docker e clona repository
# 3. Copia backup dal storage offsite
scp user@backup-server:/backups/sphyra/latest.sql.gz ./backups/

# 4. Setup .env con nuovi secrets
openssl rand -base64 32  # Nuovo JWT_SECRET
openssl rand -base64 24  # Nuova DB password

# 5. Avvia stack
docker compose -f docker-compose.duckdns.yml up -d

# 6. Ripristina dati
./scripts/restore-database.sh backups/latest.sql.gz
```

## ✅ Checklist Backup Produzione

Prima di andare in produzione, verifica:

- [ ] Script di backup configurato e testato
- [ ] Crontab configurato per backup automatici
- [ ] Directory backup creata con permessi corretti
- [ ] Almeno un backup di test eseguito con successo
- [ ] Script di restore testato in ambiente di sviluppo
- [ ] Backup offsite configurato (cloud/server remoto)
- [ ] Documentazione recovery procedures condivisa con team
- [ ] Alert configurati per fallimenti backup (opzionale)
- [ ] Backup encryption configurato per dati sensibili (opzionale)

## 📞 Supporto

Per problemi con backup/restore:

1. Verifica log: `/var/log/sphyra-backup.log`
2. Controlla container: `docker ps | grep sphyra-postgres`
3. Test connessione: `docker exec sphyra-postgres pg_isready`
4. Consulta documentazione PostgreSQL: https://www.postgresql.org/docs/current/backup.html
