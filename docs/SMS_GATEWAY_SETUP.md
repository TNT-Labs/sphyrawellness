# 📱 Setup Gateway SMS tramite Smartphone Android

Questa guida spiega come configurare uno smartphone Android come centro di smistamento SMS per Sphyra Wellness.

## Perché usare lo smartphone come gateway?

✅ **Vantaggi:**
- **Costo zero** (solo costi SIM per SMS)
- **Pieno controllo** dei dati
- **Nessun servizio cloud** esterno richiesto
- **Facile da configurare** (15-30 minuti)

⚠️ **Svantaggi:**
- Smartphone deve rimanere acceso e connesso alla rete
- Dipendenza dalla batteria e connessione dati/WiFi
- Limiti operatore (numero massimo SMS/giorno)

---

## Requisiti

### Hardware
- ✅ Smartphone Android (Android 5.0+)
- ✅ SIM card attiva con piano SMS
- ✅ Caricabatterie sempre collegato
- ✅ Connessione WiFi o dati stabili

### Software
- ✅ App "SMS Gateway API" o "SMS Forwarder"
- ✅ Server Sphyra sulla stessa rete o accessibile via VPN/port forwarding

---

## Opzioni App Android

### 🟢 OPZIONE 1: SMS Gateway by capcom6 (✅ CONSIGLIATA)

**Link:** https://github.com/capcom6/android-sms-gateway

**Caratteristiche:**
- ✅ **Attivamente mantenuto** (ultimo aggiornamento: 2024)
- ✅ Open source e gratuito
- ✅ API REST semplice e ben documentata
- ✅ Autenticazione Basic Auth (username/password)
- ✅ Supporto multiple SIM
- ✅ Statistiche e logging completi
- ✅ **CONFIGURATO IN SPHYRA WELLNESS**

**Installazione:**
1. Scarica l'APK dal repository GitHub: https://github.com/capcom6/android-sms-gateway/releases
2. Installa l'APK sullo smartphone Android
3. Apri l'app e permetti i permessi richiesti (SMS, notifiche)
4. Vai su "Settings" e configura:
   - Port: `8080`
   - Username: `admin` (o personalizzato)
   - Password: scegli una password sicura
   - Enable Authentication: ✅ ON
5. Annota IP address dello smartphone (visibile nell'app o nelle impostazioni WiFi)
6. Avvia il server dall'app

**Endpoint API:**
```bash
POST http://[IP_SMARTPHONE]:8080/message
Content-Type: application/json
Authorization: Basic [base64(username:password)]

{
  "phoneNumbers": ["+393331234567"],
  "message": "Testo del messaggio"
}
```

**Esempio curl:**
```bash
curl -X POST http://192.168.1.100:8080/message \
  -u admin:password \
  -H "Content-Type: application/json" \
  -d '{"phoneNumbers": ["+393331234567"], "message": "Test"}'
```

---

### 🟡 OPZIONE 2: SMS Gateway API by bogkonstantin

**Link:** https://github.com/bogkonstantin/android_income_sms_gateway_webhook

**Caratteristiche:**
- Open source
- API HTTP semplice
- Supporto autenticazione Bearer token

**Nota:** Richiede modifiche al codice Sphyra per supportare Bearer token invece di Basic Auth.

---

### 🟡 OPZIONE 3: SMS Forwarder

**Link:** https://github.com/pppscn/SmsForwarder

**Caratteristiche:**
- Molto configurabile
- Supporto regole complesse
- Forwarding automatico

**Nota:** Richiede adattamento del codice per il formato API specifico.

---

## Configurazione Passo-Passo

### STEP 1: Installare l'App capcom6 SMS Gateway sullo Smartphone

1. **Scarica** l'APK più recente da: https://github.com/capcom6/android-sms-gateway/releases
2. **Trasferisci** l'APK sullo smartphone (via USB, email, cloud, ecc.)
3. **Installa** l'APK (attiva "Installa da fonti sconosciute" se richiesto)
4. **Apri** l'app SMS Gateway
5. **Permetti** i permessi richiesti:
   - ✅ SMS (invio/ricezione)
   - ✅ Telefono
   - ✅ Notifiche
   - ✅ Esecuzione in background

### STEP 2: Configurare HTTP Server (capcom6)

1. Apri l'app **SMS Gateway** sullo smartphone
2. Vai su **⚙️ Settings** (Impostazioni)
3. Configura i seguenti parametri:
   ```
   Port: 8080
   Username: admin
   Password: SphyraGW2024! (scegli una password sicura)
   Enable Authentication: ✅ ON
   ```
4. **Annota** username e password (serviranno per configurare il backend)
5. Verifica **IP Address** dello smartphone sulla rete locale (es: `192.168.1.100`)
   - Puoi trovarlo nelle impostazioni WiFi dello smartphone
6. Attiva **"Start Server"** nell'app per avviare il gateway

### STEP 3: Configurare Sphyra Wellness Backend

1. **Apri** il file `.env` nel server Sphyra
2. **Aggiungi** le seguenti righe:

```env
# SMS Gateway Configuration (capcom6 SMS Gateway)
SMS_GATEWAY_URL=http://192.168.1.100:8080
SMS_GATEWAY_TOKEN=admin:SphyraGW2024!
SMS_GATEWAY_PHONE=+393331234567  # Opzionale: numero dello smartphone gateway
```

**Importante:**
- `SMS_GATEWAY_TOKEN` deve essere nel formato `username:password` (Basic Auth)
- La porta di default per capcom6 è `8080` (non 9090)
- Username e password sono quelli configurati nell'app Android

3. **Salva** e **riavvia** il server

```bash
cd /home/user/sphyrawellness/server
npm run dev  # oppure pm2 restart sphyra-server
```

### STEP 4: Verificare la Connessione

#### Test 1: Ping manuale al gateway

```bash
curl -X GET http://192.168.1.100:8080/ \
  -u admin:your-password
```

**Risposta attesa:** Status 200 o informazioni sul gateway

#### Test 2: Invio SMS di test (formato capcom6)

```bash
curl -X POST http://192.168.1.100:8080/message \
  -u admin:your-password \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumbers": ["+393331234567"],
    "message": "Test SMS da Sphyra Wellness"
  }'
```

**Nota:** L'opzione `-u admin:your-password` aggiunge automaticamente l'header `Authorization: Basic` con credenziali codificate in base64.

**Risposta attesa:**
```json
{
  "success": true,
  "id": "msg-12345"
}
```

#### Test 3: Da interfaccia Sphyra

1. Accedi a **Sphyra Wellness** → **Reminders**
2. Seleziona un appuntamento con cliente che ha:
   - ✅ Numero telefono valido
   - ✅ Consenso SMS attivo
3. Clicca **"Invia SMS"**
4. Verifica che l'SMS arrivi al cliente

---

## Configurazioni Avanzate

### A) Accesso da Internet (Port Forwarding)

Se il server Sphyra è su cloud e lo smartphone è sulla rete locale:

1. **Router:** Configura port forwarding
   ```
   External Port: 9090
   Internal IP: 192.168.1.100
   Internal Port: 9090
   Protocol: TCP
   ```

2. **DynDNS:** Usa servizio come No-IP o DuckDNS
   ```
   URL Dinamico: smsgateway.tuodominio.duckdns.org
   ```

3. **Aggiorna .env:**
   ```env
   SMS_GATEWAY_URL=http://smsgateway.tuodominio.duckdns.org:9090
   ```

### B) VPN (Più Sicuro)

**Opzione consigliata per produzione:**

1. Installa **WireGuard** o **OpenVPN** su smartphone e server
2. Crea tunnel VPN tra server e smartphone
3. Usa IP VPN privato nel `.env`:
   ```env
   SMS_GATEWAY_URL=http://10.8.0.2:9090
   ```

### C) Reverse Proxy con HTTPS

Per maggiore sicurezza, usa nginx come reverse proxy:

1. **Nginx config:**
   ```nginx
   server {
       listen 443 ssl;
       server_name smsgateway.tuodominio.it;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       location / {
           proxy_pass http://192.168.1.100:9090;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

2. **Aggiorna .env:**
   ```env
   SMS_GATEWAY_URL=https://smsgateway.tuodominio.it
   ```

---

## Troubleshooting

### Problema: "Cannot connect to SMS gateway"

**Cause possibili:**
- ❌ Smartphone spento o senza batteria
- ❌ App SMS Gateway chiusa o crashata
- ❌ WiFi dello smartphone disconnesso
- ❌ IP address cambiato (DHCP dinamico)

**Soluzioni:**
1. Verifica che smartphone sia acceso e connesso
2. Apri l'app SMS Gateway e verifica che HTTP server sia attivo
3. Controlla IP attuale dello smartphone (potrebbe essere cambiato)
4. **Fisssa IP statico** nel router per lo smartphone gateway

### Problema: "Gateway timeout"

**Cause:**
- ❌ Smartphone in modalità risparmio energetico
- ❌ Rete WiFi debole o instabile
- ❌ Firewall blocca la porta 9090

**Soluzioni:**
1. Disabilita risparmio energetico per l'app SMS Gateway
2. Avvicina smartphone al router WiFi
3. Verifica firewall: `sudo ufw allow 9090/tcp` (se applicabile)

### Problema: "Invalid phone number"

**Cause:**
- ❌ Formato numero non E.164 (+39...)
- ❌ Numero con caratteri non validi

**Soluzioni:**
1. Assicurati che numeri inizino con `+39` o `00393`
2. Verifica che non ci siano lettere o caratteri speciali

### Problema: "SMS non arriva"

**Cause:**
- ❌ Credito SIM esaurito
- ❌ Operatore blocca SMS automatici
- ❌ Numero destinatario non valido

**Soluzioni:**
1. Verifica credito SIM
2. Invia SMS di test manualmente dallo smartphone
3. Contatta operatore telefonico

---

## Best Practices

### ✅ Affidabilità

1. **Smartphone dedicato:** Usa uno smartphone vecchio solo per SMS gateway
2. **Sempre collegato:** Caricabatterie sempre attivo
3. **Auto-start:** Configura app per avviarsi all'accensione
4. **IP statico:** Configura DHCP reservation nel router
5. **Monitoring:** Imposta notifiche se gateway va offline

### ✅ Sicurezza

1. **Token forte:** Usa token autenticazione lungo e casuale
2. **HTTPS:** Usa reverse proxy con SSL in produzione
3. **Firewall:** Limita accesso solo da IP server Sphyra
4. **VPN:** Preferisci VPN a port forwarding pubblico

### ✅ Manutenzione

1. **Riavvia settimanalmente:** Riavvia smartphone per pulizia memoria
2. **Aggiorna app:** Mantieni SMS Gateway API aggiornato
3. **Monitora log:** Controlla log periodicamente per errori
4. **Backup SIM:** Tieni SIM di backup pronta

---

## Costi Stimati

### Setup Iniziale: €0 - €50
- Smartphone Android usato: €0 (riutilizzo) o €30-50
- SIM card: €0-10 (ricaricabile)
- Cavi e supporto: €5-10

### Costi Mensili: €5 - €20
- Ricarica SIM: €5-20/mese (basato su ~300 SMS/mese)
- Energia elettrica: ~€0.50/mese (2W costanti)

**Totale annuo:** ~€60 - €240/anno

**Confronto con Twilio:** ~€150 - €600/anno per stesso volume SMS

**Risparmio:** 30-60% rispetto a servizi cloud

---

## Alternative Senza Smartphone

Se non vuoi usare smartphone, considera:

1. **Modem USB GSM** + Raspberry Pi
   - Esempio: Huawei E3372 (€30-40)
   - Software: Gammu SMSD
   - Pro: Più affidabile, senza batteria
   - Contro: Setup più complesso

2. **Twilio** (servizio cloud)
   - Pro: Massima affidabilità, zero manutenzione
   - Contro: Costi mensili più alti
   - Vedi documentazione Twilio per setup

---

## Supporto

Per problemi o domande:
1. Controlla i log del server: `/home/user/sphyrawellness/server/logs`
2. Verifica log app SMS Gateway sullo smartphone
3. Consulta issues GitHub di SMS Gateway API
4. Contatta supporto Sphyra Wellness

---

## Checklist Finale

Prima di andare in produzione:

- [ ] Smartphone sempre collegato alla corrente
- [ ] App SMS Gateway avviata e HTTP server attivo
- [ ] IP statico configurato o DynDNS attivo
- [ ] Token autenticazione configurato in `.env`
- [ ] Test invio SMS riuscito
- [ ] Monitoring/alerting configurato (opzionale)
- [ ] SIM con credito sufficiente
- [ ] Privacy Policy aggiornata con menzione gateway SMS

---

**Configurazione completata!** 🎉

Il tuo gateway SMS tramite smartphone è pronto per inviare reminder ai clienti di Sphyra Wellness.
