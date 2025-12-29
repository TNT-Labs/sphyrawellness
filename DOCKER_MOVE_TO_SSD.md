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

## 🔧 Procedura Completa

### Passo 1: Backup configurazione attuale

```bash
# Ferma tutti i container Docker
cd ~/sphyrawellness  # O la directory del tuo progetto
docker compose down

# Verifica che tutti i container siano fermati
docker ps -a
# Non dovrebbero esserci container in running

# Verifica directory corrente di Docker
docker info | grep "Docker Root Dir"
# Output atteso: Docker Root Dir: /var/lib/docker
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
# Torna alla directory del progetto
cd ~/sphyrawellness

# Riavvia i container
docker compose up -d

# Verifica che tutti i container siano attivi
docker ps

# Verifica i log
docker compose logs -f
# CTRL+C per uscire
```

### Passo 9: Test dell'applicazione

```bash
# Testa che l'applicazione funzioni correttamente
# 1. Apri il browser e vai all'indirizzo della tua app
# 2. Fai login
# 3. Verifica che i dati ci siano ancora (clienti, appuntamenti, etc.)

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

3. **Stabilità**:
   - Niente più problemi di spazio
   - SSD più affidabile della SD per scritture intensive

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

---

## 📞 Supporto

Se hai problemi durante la migrazione:

1. **Non eliminare** `/var/lib/docker.old` finché non sei sicuro
2. Usa la procedura di rollback se necessario
3. Verifica i log: `sudo journalctl -u docker -f`
4. Apri un issue su GitHub se serve assistenza

---

**🎉 Buona migrazione! Il tuo Raspberry Pi ti ringrazierà!**
