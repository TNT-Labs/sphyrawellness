# Spostare Docker su SSD esterno (Raspberry Pi)

**Data**: 2025-12-29
**Situazione**: Docker gira su `/dev/mmcblk0p2` (SD card 85% piena), vogliamo spostarlo su `/dev/sda1` (SSD 234GB con 187GB liberi)

---

## 🎯 Perché farlo?

**Vantaggi:**
- ✅ **Più spazio**: 187GB disponibili vs 8.6GB sulla SD
- ✅ **Performance migliori**: SSD è 5-10x più veloce della SD
- ✅ **Durabilità**: SSD dura molto più a lungo della SD con carichi di lavoro Docker
- ✅ **Meno manutenzione**: Non dovrai più preoccuparti dello spazio

**Rischi:**
- ⚠️ Minimo rischio se segui la procedura
- ⚠️ Downtime di ~10-15 minuti durante la migrazione
- ⚠️ Se qualcosa va storto, puoi tornare alla configurazione precedente

---

## 📋 Prerequisiti

Prima di iniziare, verifica:

```bash
# 1. Controlla che l'SSD sia montato correttamente
df -h | grep /mnt/usbssd
# Dovresti vedere: /dev/sda1  234G  36G  187G  16% /mnt/usbssd

# 2. Verifica che l'SSD si monti automaticamente al boot
cat /etc/fstab | grep sda1
# Se NON vedi una riga, l'SSD non è configurato per montarsi al boot!
```

⚠️ **IMPORTANTE**: Se l'SSD non è in `/etc/fstab`, devi configurarlo prima (vedi sezione "Setup SSD automount").

---

## 📸 Considerazioni Speciali per Immich

Se hai **Immich** (gestione foto/video) installato oltre a Sphyra, lo spostamento su SSD è **ANCORA PIÙ CRITICO**!

### Perché Immich beneficia enormemente dall'SSD

**Immich è estremamente intensivo in I/O:**
- 🖼️ **Elaborazione foto/video**: thumbnails, preview, conversioni
- 🤖 **Machine Learning**: face detection, object recognition
- 💾 **Metadata database**: PostgreSQL scrive continuamente
- 🔍 **Indicizzazione**: ricerca rapida tra migliaia di foto

**Performance attese su SSD vs SD:**
| Operazione | SD Card | SSD | Miglioramento |
|------------|---------|-----|---------------|
| Upload 100 foto | 5-10 min | 1-2 min | **5x più veloce** ⚡ |
| Generazione thumbnails | 10-15 min | 2-3 min | **5x più veloce** ⚡ |
| Ricerca foto | 3-5 sec | <1 sec | **3-5x più veloce** ⚡ |
| Face detection | 20-30 min | 5-8 min | **4x più veloce** ⚡ |

### Prima di migrare: Verifica volumi Immich

```bash
# Controlla i volumi Immich
docker volume ls | grep immich
# Output esempio:
# immich_model-cache
# immich_pgdata
# immich_upload

# Verifica spazio occupato da Immich
docker volume inspect immich_upload | grep Mountpoint
# Poi controlla dimensione:
sudo du -sh /var/lib/docker/volumes/immich_upload/_data
# Esempio: 25GB  (dipende da quante foto hai!)

# Verifica dimensione totale Docker (Immich + Sphyra)
sudo du -sh /var/lib/docker
# Questo è quanto spazio occuperà sull'SSD
```

### Backup foto Immich (RACCOMANDATO)

```bash
# PRIMA di migrare, fai backup delle foto Immich su un disco esterno

# Opzione 1: Backup del volume Docker
docker run --rm \
  -v immich_upload:/source:ro \
  -v /media/rasp/0E90-75881/backup-immich:/backup \
  alpine tar czf /backup/immich-photos-$(date +%Y%m%d).tar.gz /source

# Opzione 2: Copia diretta (se hai accesso al volume)
sudo rsync -aP /var/lib/docker/volumes/immich_upload/_data/ \
  /media/rasp/0E90-75881/backup-immich-photos/

# Verifica backup
ls -lh /media/rasp/0E90-75881/backup-immich*
```

### Durante la migrazione

**⏱️ Tempo stimato con Immich:**
- Immich piccolo (< 20GB foto): 10-15 minuti
- Immich medio (20-50GB foto): 15-25 minuti
- Immich grande (> 50GB foto): 25-45 minuti

**La procedura standard funziona per TUTTI i container**, quindi:
- ✅ Sphyra verrà migrato
- ✅ Immich verrà migrato (container + database + foto)
- ✅ Tutti i volumi preservati

### Post-migrazione: Verifica Immich

```bash
# 1. Verifica che i container Immich siano attivi
docker ps | grep immich
# Dovresti vedere: immich_server, immich_microservices, immich_postgres, etc.

# 2. Verifica volumi Immich
docker volume ls | grep immich
# Dovrebbero esserci tutti i volumi

# 3. Accedi a Immich via browser
# http://IP-RASPBERRY:2283
# Verifica che:
# - Le foto ci siano tutte
# - I thumbnails si carichino velocemente
# - La ricerca funzioni
# - Il face detection sia attivo

# 4. Verifica log Immich
docker logs immich_server
docker logs immich_microservices
# Non dovrebbero esserci errori relativi a storage/database

# 5. Testa upload nuova foto
# Carica una foto via app e verifica che:
# - Upload sia molto più veloce
# - Thumbnail si generi rapidamente
# - Face detection processi la foto
```

### Ottimizzazioni Post-Migrazione per Immich

Una volta migrato su SSD, puoi abilitare funzionalità più intensive:

```bash
# Nel docker-compose.yml di Immich, puoi aumentare:
# - Concurrent thumbnail generation
# - Face detection workers
# - Machine learning batch size

# Esempio modifiche in Immich settings (via UI):
# Settings > Jobs:
# - Thumbnail Generation: "All" (invece di "Essential")
# - Face Detection: Abilitato
# - Object Recognition: Abilitato (se hai RAM sufficiente)
```

### ⚠️ Attenzione: Requisiti Immich

**RAM necessaria con Immich:**
- Raspberry Pi 5 4GB: ⚠️ Limitato (Immich + Sphyra possono saturare)
- Raspberry Pi 5 8GB: ✅ Ideale

**Se hai Pi 5 4GB**, considera di:
1. Disabilitare machine learning in Immich
2. Limitare concurrent jobs
3. Monitorare RAM: `free -h`

---

## 🔧 Procedura Completa

### Passo 1: Backup configurazione attuale

```bash
# Ferma tutti i container Docker (Sphyra)
cd ~/sphyrawellness  # O la directory del tuo progetto
docker compose down

# Se hai Immich, fermalo anche
cd ~/immich-app  # O la directory dove hai installato Immich
docker compose down

# Verifica che TUTTI i container siano fermati
docker ps
# Non dovrebbe esserci NESSUN container in running

# Verifica directory corrente di Docker
docker info | grep "Docker Root Dir"
# Output atteso: Docker Root Dir: /var/lib/docker

# Verifica quanto spazio occupa Docker attualmente
sudo du -sh /var/lib/docker
# Questo ti dice quanto spazio servirà sull'SSD
```

### Passo 2: Setup SSD automount (SE NON È GIÀ CONFIGURATO)

```bash
# Trova UUID dell'SSD
sudo blkid /dev/sda1
# Output esempio: /dev/sda1: UUID="1234-5678" TYPE="ext4"

# Aggiungi a /etc/fstab (SOSTITUISCI L'UUID CON IL TUO!)
echo "UUID=1234-5678 /mnt/usbssd ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab

# Verifica che il mount funzioni
sudo umount /mnt/usbssd
sudo mount -a
df -h | grep /mnt/usbssd
# Dovrebbe essere montato di nuovo
```

### Passo 3: Crea directory Docker sull'SSD

```bash
# Crea directory per Docker sull'SSD
sudo mkdir -p /mnt/usbssd/docker

# Imposta permessi corretti
sudo chown root:root /mnt/usbssd/docker
sudo chmod 755 /mnt/usbssd/docker
```

### Passo 4: Ferma Docker e copia i dati

```bash
# Ferma Docker daemon
sudo systemctl stop docker
sudo systemctl stop docker.socket

# Verifica che sia fermato
sudo systemctl status docker
# Dovrebbe dire "inactive (dead)"

# Copia TUTTI i dati Docker sull'SSD (ATTENZIONE: può richiedere 5-15 minuti!)
sudo rsync -aP /var/lib/docker/ /mnt/usbssd/docker/

# Verifica che la copia sia completa
sudo du -sh /var/lib/docker
sudo du -sh /mnt/usbssd/docker
# Le dimensioni dovrebbero essere identiche o molto simili
```

### Passo 5: Configura Docker per usare la nuova directory

```bash
# Crea directory di configurazione se non esiste
sudo mkdir -p /etc/docker

# Crea/modifica daemon.json
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "data-root": "/mnt/usbssd/docker",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

# Verifica il file
cat /etc/docker/daemon.json
```

### Passo 6: Backup vecchia directory (PER SICUREZZA)

```bash
# Rinomina la vecchia directory invece di eliminarla
sudo mv /var/lib/docker /var/lib/docker.old

# Crea nuovo symlink (opzionale, ma utile)
sudo ln -s /mnt/usbssd/docker /var/lib/docker
```

### Passo 7: Riavvia Docker

```bash
# Riavvia Docker daemon
sudo systemctl start docker

# Verifica che Docker sia ripartito correttamente
sudo systemctl status docker
# Dovrebbe dire "active (running)"

# VERIFICA CHE LA NUOVA DIRECTORY SIA IN USO
docker info | grep "Docker Root Dir"
# Output atteso: Docker Root Dir: /mnt/usbssd/docker
```

### Passo 8: Riavvia i container

```bash
# Riavvia Sphyra
cd ~/sphyrawellness
docker compose up -d

# Se hai Immich, riavvialo
cd ~/immich-app  # O la directory dove hai installato Immich
docker compose up -d

# Verifica che TUTTI i container siano attivi
docker ps
# Dovresti vedere tutti i container di Sphyra e Immich

# Verifica i log Sphyra
cd ~/sphyrawellness
docker compose logs -f
# CTRL+C per uscire

# Verifica i log Immich (se installato)
cd ~/immich-app
docker compose logs -f
# CTRL+C per uscire
```

### Passo 9: Test dell'applicazione

```bash
# Test Sphyra
# 1. Apri browser: https://IP-RASPBERRY (o tuo dominio)
# 2. Fai login
# 3. Verifica che i dati ci siano ancora (clienti, appuntamenti, etc.)

# Test Immich (se installato)
# 1. Apri browser: http://IP-RASPBERRY:2283
# 2. Fai login
# 3. Verifica che le foto ci siano tutte
# 4. Prova a caricare una nuova foto (dovrebbe essere MOLTO più veloce!)

# Verifica spazio su disco
df -h
# Dovresti vedere:
# - /dev/mmcblk0p2 con PIÙ spazio libero (la vecchia /var/lib/docker è rinominata)
# - /dev/sda1 con lo spazio occupato da Docker

# Verifica dimensioni Docker
docker system df
```

### Passo 10: Pulizia (DOPO ALCUNI GIORNI DI TEST!)

```bash
# ⚠️ ASPETTA ALMENO 3-7 GIORNI PRIMA DI FARE QUESTO!
# Se tutto funziona correttamente, puoi rimuovere il backup

# Controlla dimensione backup
sudo du -sh /var/lib/docker.old
# Esempio: 15GB  /var/lib/docker.old

# Rimuovi backup (SOLO SE SEI SICURO CHE TUTTO FUNZIONI!)
sudo rm -rf /var/lib/docker.old

# Verifica spazio recuperato
df -h
# Dovresti vedere molto più spazio libero su /dev/mmcblk0p2
```

---

## 🔄 Rollback (Se qualcosa va storto)

Se dopo la migrazione qualcosa non funziona:

```bash
# 1. Ferma Docker
sudo systemctl stop docker

# 2. Rimuovi symlink
sudo rm /var/lib/docker

# 3. Ripristina vecchia directory
sudo mv /var/lib/docker.old /var/lib/docker

# 4. Rimuovi configurazione custom
sudo rm /etc/docker/daemon.json

# 5. Riavvia Docker
sudo systemctl start docker

# 6. Riavvia container
cd ~/sphyrawellness
docker compose up -d
```

---

## 📊 Verifica Post-Migrazione

Dopo la migrazione, verifica che tutto funzioni:

```bash
# 1. Docker usa la nuova directory
docker info | grep "Docker Root Dir"
# Output: Docker Root Dir: /mnt/usbssd/docker

# 2. Spazio su SD recuperato
df -h | grep mmcblk0p2
# Dovrebbe avere più spazio libero

# 3. Spazio su SSD utilizzato
df -h | grep sda1
# Dovrebbe mostrare lo spazio usato da Docker

# 4. Container in esecuzione
docker ps
# Tutti i container dovrebbero essere "Up"

# 5. Verifica volumi Docker
docker volume ls
# Dovresti vedere i tuoi volumi

# 6. Test performance (opzionale)
# Prova a fare build di un'immagine e nota la differenza di velocità!
```

---

## 🎯 Vantaggi Attesi

Dopo la migrazione dovresti notare:

1. **Spazio su SD**:
   - Prima: 8.6GB liberi (85% uso)
   - Dopo: ~25-30GB liberi (60% uso) ✅

2. **Performance Docker**:
   - Build immagini: 2-3x più veloce ⚡
   - Pull/push immagini: molto più veloce ⚡
   - I/O container: nettamente migliore ⚡

3. **Performance Sphyra**:
   - Caricamento pagine più rapido
   - Database CouchDB più reattivo
   - Backup/restore più veloci

4. **Performance Immich** (se installato):
   - Upload foto: **5x più veloce** ⚡⚡⚡
   - Generazione thumbnails: **5x più veloce** ⚡⚡⚡
   - Ricerca foto: **3-5x più veloce** ⚡⚡⚡
   - Face detection: **4x più veloce** ⚡⚡⚡
   - Esperienza utente molto più fluida!

5. **Stabilità**:
   - Niente più problemi di spazio
   - SSD più affidabile della SD per scritture intensive
   - Maggiore durata dell'hardware

---

## ⚠️ Note Importanti

1. **Automount**: Assicurati che l'SSD sia in `/etc/fstab` con opzione `nofail` per evitare problemi di boot
2. **Backup**: Mantieni `/var/lib/docker.old` per almeno una settimana prima di eliminarlo
3. **Monitoring**: Nei primi giorni, controlla regolarmente `docker ps` e i log
4. **SSD Health**: L'SSD durerà molto di più della SD, ma monitora comunque il suo stato

---

## 🐛 Troubleshooting

### Problema: Docker non si avvia dopo la migrazione

```bash
# Controlla log Docker
sudo journalctl -u docker -n 50

# Verifica permessi
ls -la /mnt/usbssd/docker

# Verifica che l'SSD sia montato
df -h | grep /mnt/usbssd
```

### Problema: Container non trovano i volumi

```bash
# Verifica che i volumi siano nella nuova directory
sudo ls -la /mnt/usbssd/docker/volumes/

# Riavvia container
docker compose down
docker compose up -d
```

### Problema: SSD non si monta al boot

```bash
# Verifica /etc/fstab
cat /etc/fstab | grep sda1

# Test mount
sudo mount -a

# Verifica errori
sudo journalctl -b | grep sda1
```

### Problema: Immich non trova le foto dopo la migrazione

```bash
# Verifica che il volume upload esista
docker volume inspect immich_upload

# Controlla i permessi
docker exec immich_server ls -la /usr/src/app/upload

# Riavvia i container Immich
cd ~/immich-app
docker compose restart

# Verifica log per errori
docker logs immich_server | grep -i error
docker logs immich_microservices | grep -i error

# Se necessario, ricostruisci la libreria
# (dalle impostazioni Immich > Jobs > Library > Scan Library)
```

### Problema: Immich lento dopo la migrazione (inaspettato)

```bash
# Verifica che Docker stia davvero usando l'SSD
docker info | grep "Docker Root Dir"
# DEVE essere: /mnt/usbssd/docker

# Verifica I/O SSD
sudo iotop
# Dovrebbe mostrare attività sull'SSD, non sulla SD

# Verifica temperatura Pi (throttling?)
vcgencmd measure_temp
# Se > 80°C, potresti avere throttling

# Controlla se l'SSD è montato correttamente
mount | grep /mnt/usbssd
# Dovrebbe mostrare opzioni corrette (rw, senza noatime che peggiora performance)
```

---

## 📞 Supporto

Se hai problemi durante la migrazione:

1. **Non eliminare** `/var/lib/docker.old` finché non sei sicuro
2. Usa la procedura di rollback se necessario
3. Verifica i log: `sudo journalctl -u docker -f`
4. Apri un issue su GitHub se serve assistenza

---

**🎉 Buona migrazione! Il tuo Raspberry Pi ti ringrazierà!**
