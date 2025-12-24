# Guida alla Pagina Admin Debug

## 📱 Accesso da Smartphone Android

La pagina Admin Debug è stata creata specificamente per gestire l'utente admin da dispositivi mobili, quando non si ha accesso ai DevTools del browser.

### URL di Accesso

```
https://tuo-dominio.com/admin-debug-panel
```

Oppure in locale:
```
http://localhost:5173/admin-debug-panel
```

### Caratteristiche

✅ **Accessibile senza login** - Non serve essere autenticati
✅ **Design responsive** - Ottimizzato per smartphone
✅ **Interface mobile-friendly** - Grandi pulsanti touch
✅ **Nessun PC richiesto** - Tutto dal tuo smartphone Android

---

## 🎯 Funzionalità Disponibili

### 1. Visualizzazione Configurazione
- Mostra il valore di `VITE_ADMIN_INITIAL_PASSWORD` dal file `.env`
- Opzione per mostrare/nascondere la password
- Avviso se si sta usando la password di default `admin123`

### 2. Visualizzazione Utenti
- Lista completa degli utenti nel database locale (PouchDB)
- Informazioni dettagliate per ogni utente:
  - Username
  - Ruolo (RESPONSABILE, DIPENDENTE, etc.)
  - Nome e cognome
  - Stato attivo/inattivo
  - Hash della password (bcrypt)
  - ID univoco

### 3. Ricarica Utenti
- Pulsante per ricaricare la lista dal database
- Mostra il numero totale di utenti trovati

### 4. Reset Database Completo
- Elimina **TUTTI** gli utenti dal database locale
- Richiede doppia conferma per sicurezza
- Dopo il reset, ricaricando l'app principale viene ricreato l'admin

### 5. Eliminazione Utente Singolo
- Ogni utente ha un pulsante "Elimina"
- Richiede conferma prima dell'eliminazione
- Utile per rimuovere utenti specifici senza reset completo

---

## 🔧 Come Usare

### Scenario 1: Password Dimenticata

1. **Apri l'URL** `/admin-debug-panel` sul tuo smartphone
2. Clicca su **"Reset Database"**
3. Clicca di nuovo per **confermare** (il pulsante diventa rosso e lampeggia)
4. Vedrai il messaggio: *"Database resettato!"*
5. **Torna alla pagina di login** (pulsante in fondo alla pagina)
6. **Ricarica la pagina** (pull-to-refresh o F5)
7. L'app creerà automaticamente un nuovo admin con la password da `.env`

### Scenario 2: Vedere la Password Configurata

1. Apri `/admin-debug-panel`
2. Nella sezione **"Configurazione Ambiente"**
3. Clicca su **"Mostra"** per vedere `VITE_ADMIN_INITIAL_PASSWORD`
4. Questa è la password che dovrebbe funzionare per l'admin

### Scenario 3: Controllare gli Utenti Esistenti

1. Apri `/admin-debug-panel`
2. Guarda la sezione **"Utenti nel Database"**
3. Vedi tutti gli utenti salvati localmente
4. Verifica ruoli, username e stato

### Scenario 4: Eliminare un Utente Specifico

1. Apri `/admin-debug-panel`
2. Trova l'utente nella lista
3. Clicca **"Elimina"** accanto all'utente
4. Conferma l'eliminazione

---

## ⚠️ Avvisi Importanti

### Sicurezza
- ⚠️ Questa pagina è accessibile **senza autenticazione**
- ⚠️ Non lasciare l'URL condiviso pubblicamente
- ⚠️ In produzione, considera di proteggere questa route

### Reset Database
- ⚠️ Il reset elimina **TUTTI** gli utenti in modo permanente
- ⚠️ Questo interessa solo il database **locale** del dispositivo
- ⚠️ Se usi CouchDB remoto, gli utenti sul server non vengono toccati
- ⚠️ La sincronizzazione potrebbe riportare gli utenti dal remoto

### Password
- ⚠️ Le password sono sempre hashate (bcrypt)
- ⚠️ Non è possibile recuperare la password originale dall'hash
- ⚠️ L'unico modo è resettare e usare quella configurata in `.env`

---

## 🔐 Configurazione Password nel File .env

Per evitare la password casuale, configura il file `.env`:

```env
VITE_ADMIN_INITIAL_PASSWORD=TuaPasswordSicura123!
```

**Requisiti consigliati:**
- Minimo 8 caratteri
- Lettere maiuscole e minuscole
- Almeno un numero
- Caratteri speciali

**Password di default `admin123`:**
- Se lasci `admin123` o non imposti la variabile
- L'app genera automaticamente una password casuale
- La password viene mostrata nella console del browser al primo avvio
- Questo previene l'uso di password deboli in produzione

---

## 🐛 Risoluzione Problemi

### "Nessun utente trovato nel database"

**Cause possibili:**
- Database locale vuoto o corrotto
- Prima installazione dell'app

**Soluzione:**
1. Torna alla pagina principale e ricarica
2. L'app creerà automaticamente l'admin

### "Errore caricamento utenti"

**Cause possibili:**
- Problema con PouchDB
- Database corrotto

**Soluzione:**
1. Usa il pulsante "Reset Database"
2. Ricarica l'app principale

### "Password non funziona dopo il reset"

**Cause possibili:**
- File `.env` non configurato correttamente
- Variabile d'ambiente non caricata

**Soluzione:**
1. Verifica il file `.env` nella root del progetto
2. Assicurati che `VITE_ADMIN_INITIAL_PASSWORD` sia impostata
3. Riavvia il server di sviluppo (se in dev)
4. In produzione, rebuilda l'app per applicare le variabili d'ambiente

---

## 💡 Tips e Trucchi

### Accesso Rapido
Aggiungi `/admin-debug-panel` ai preferiti del browser mobile per accesso rapido

### Prima Configurazione
1. Imposta `VITE_ADMIN_INITIAL_PASSWORD` nel `.env`
2. Fai il build/deploy
3. Se il database è vuoto, l'app usa automaticamente questa password

### Testing
Puoi testare la pagina in locale:
```bash
npm run dev
# Poi apri http://localhost:5173/admin-debug-panel
```

### Sicurezza in Produzione
Considera di:
- Proteggere la route con password
- Disabilitare la route in produzione
- Usare un URL più complesso (es. `/secret-admin-panel-x7k2j`)

---

## 📞 Supporto

Se hai problemi con la pagina Admin Debug:
1. Controlla i messaggi di errore visualizzati nella pagina
2. Verifica la configurazione del file `.env`
3. Prova a resettare completamente il database

---

**Creato per:** Gestione admin su dispositivi mobili Android
**Ultima modifica:** 2025-12-24
