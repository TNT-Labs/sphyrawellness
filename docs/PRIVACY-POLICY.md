# INFORMATIVA SULLA PRIVACY
## ai sensi dell'art. 13 del Regolamento UE 2016/679 (GDPR)

**Versione:** 1.0
**Data di pubblicazione:** 18 Dicembre 2025
**Ultima modifica:** 18 Dicembre 2025

---

## 1. TITOLARE DEL TRATTAMENTO

Il Titolare del trattamento dei dati personali raccolti attraverso il sistema di prenotazione online è:

**[NOME AZIENDA/CENTRO WELLNESS]**
Sede legale: [INDIRIZZO COMPLETO]
Partita IVA/Codice Fiscale: [P.IVA/CF]
Email: [EMAIL CONTATTO]
Telefono: [NUMERO TELEFONO]
PEC: [INDIRIZZO PEC]

---

## 2. FINALITÀ E BASE GIURIDICA DEL TRATTAMENTO

I Suoi dati personali saranno trattati per le seguenti finalità:

### 2.1 Gestione delle prenotazioni (Base giuridica: Esecuzione del contratto - art. 6, par. 1, lett. b GDPR)

- Gestione e conferma della prenotazione dei servizi richiesti
- Invio di comunicazioni relative all'appuntamento prenotato
- Gestione del calendario appuntamenti e organizzazione del personale
- Archiviazione dello storico delle prenotazioni

### 2.2 Promemoria e comunicazioni di servizio (Base giuridica: Consenso - art. 6, par. 1, lett. a GDPR)

- Invio di email di promemoria automatiche prima dell'appuntamento
- Comunicazioni relative a modifiche o cancellazioni degli appuntamenti
- Notifiche relative ai servizi prenotati

### 2.3 Obblighi di legge (Base giuridica: Obbligo di legge - art. 6, par. 1, lett. c GDPR)

- Adempimento di obblighi previsti da leggi, regolamenti e normative nazionali ed europee
- Adempimenti contabili e fiscali
- Risposta a richieste delle autorità giudiziarie o amministrative

### 2.4 Gestione delle allergie e condizioni di salute (Base giuridica: Consenso esplicito - art. 9, par. 2, lett. a GDPR)

**DATI PARTICOLARI:** Le informazioni relative ad allergie e condizioni di salute costituiscono dati particolari ai sensi dell'art. 9 GDPR. Il trattamento di tali dati avviene esclusivamente previa acquisizione del Suo consenso esplicito e per garantire la Sua sicurezza durante l'erogazione dei servizi.

Il conferimento di questi dati è facoltativo ma fortemente consigliato per permetterci di erogare i servizi in modo sicuro e personalizzato.

---

## 3. TIPOLOGIE DI DATI RACCOLTI

Durante il processo di prenotazione online raccogliamo le seguenti categorie di dati personali:

### 3.1 Dati Identificativi e di Contatto (Obbligatori)

- **Nome e Cognome:** per identificare il cliente e personalizzare il servizio
- **Indirizzo Email:** per l'invio di conferme, promemoria e comunicazioni relative agli appuntamenti
- **Numero di Telefono:** per eventuali comunicazioni urgenti relative all'appuntamento

### 3.2 Dati Relativi al Servizio (Obbligatori)

- **Data e ora dell'appuntamento**
- **Servizio/trattamento prenotato**
- **Durata del servizio**
- **Operatore assegnato**

### 3.3 Dati Facoltativi

- **Data di nascita:** per personalizzare meglio i servizi offerti
- **Allergie e condizioni di salute:** per garantire la Sua sicurezza durante i trattamenti (dati particolari ex art. 9 GDPR)
- **Note e richieste speciali:** per personalizzare l'esperienza e rispondere a esigenze specifiche

### 3.4 Dati Tecnici e di Navigazione

- **Timestamp di creazione e modifica:** per tracciare le operazioni sul sistema
- **Dati di sessione:** cookie tecnici necessari al funzionamento del sistema di prenotazione
- **Indirizzo IP** (in forma anonimizzata): per finalità di sicurezza e prevenzione frodi

---

## 4. MODALITÀ DEL TRATTAMENTO

I dati personali sono trattati con strumenti informatici e telematici, con logiche strettamente correlate alle finalità indicate, e comunque in modo da garantire la sicurezza e la riservatezza dei dati stessi.

### 4.1 Misure di Sicurezza Implementate

- **Crittografia:** Utilizzo del protocollo HTTPS con certificati SSL/TLS per proteggere i dati in transito
- **Autenticazione:** Sistema di autenticazione sicura per il personale con hash delle password (PBKDF2-SHA256, 210.000 iterazioni)
- **Protezione CSRF:** Token CSRF per prevenire attacchi di tipo Cross-Site Request Forgery
- **Validazione input:** Validazione rigorosa di tutti i dati inseriti tramite schema Zod per prevenire injection
- **Rate Limiting:** Limitazione delle richieste per prevenire abusi del sistema
- **Backup automatici:** Backup giornalieri cifrati con conservazione di 7 giorni
- **Timeout di sessione:** Disconnessione automatica dopo periodo di inattività (default: 5 minuti)
- **Controllo accessi:** Accesso ai dati riservato esclusivamente al personale autorizzato con diversi livelli di permessi

### 4.2 Architettura Dati

I dati sono conservati in:
- **Database primario:** CouchDB (database documentale NoSQL)
- **Sincronizzazione locale:** IndexedDB per accesso offline del personale autorizzato
- **Backup:** Sistema automatico di backup giornaliero con conservazione di 7 giorni

---

## 5. DESTINATARI DEI DATI

I Suoi dati personali potranno essere comunicati a:

### 5.1 Personale Interno

- Personale del centro wellness autorizzato al trattamento (operatori, receptionist, responsabili) con accesso limitato ai soli dati necessari per l'espletamento delle proprie funzioni

### 5.2 Fornitori di Servizi (Responsabili del Trattamento ex art. 28 GDPR)

I dati possono essere comunicati a soggetti terzi che svolgono servizi in qualità di Responsabili del Trattamento, nominati dal Titolare ai sensi dell'art. 28 GDPR:

- **SendGrid (Twilio Inc.):** Servizio di invio email per conferme e promemoria
  - Sede: Stati Uniti d'America
  - Base di trasferimento: Standard Contractual Clauses (SCC) approvate dalla Commissione Europea
  - Privacy Policy: https://www.twilio.com/legal/privacy

- **Fornitori di servizi di hosting/cloud:** per l'archiviazione dei dati
  - [SPECIFICARE PROVIDER SE APPLICABILE]

- **Fornitori di servizi IT:** per manutenzione e supporto tecnico del sistema
  - [SPECIFICARE PROVIDER SE APPLICABILE]

### 5.3 Soggetti Autorizzati per Legge

I dati potranno essere comunicati a:
- Autorità giudiziarie o amministrative, in adempimento a obblighi di legge
- Consulenti fiscali e commercialisti per adempimenti contabili e fiscali
- Altri soggetti pubblici, quando richiesto dalla legge

I dati non saranno oggetto di diffusione né di trasferimento a paesi terzi al di fuori dell'Unione Europea, salvo quanto specificato per i servizi di cui al punto 5.2.

---

## 6. PERIODO DI CONSERVAZIONE

I dati personali saranno conservati per i seguenti periodi:

### 6.1 Dati per Gestione Prenotazioni

- **Durante il rapporto:** Per tutta la durata necessaria alla gestione dell'appuntamento e dell'erogazione del servizio
- **Dopo l'appuntamento:** 24 mesi dalla data dell'ultimo appuntamento, per permettere la gestione di eventuali reclami o contestazioni e per mantenere lo storico cliente

### 6.2 Dati per Obblighi Fiscali e Contabili

- **10 anni:** I dati necessari per adempimenti fiscali e contabili saranno conservati per 10 anni dalla data dell'ultima transazione, in conformità alle normative fiscali vigenti

### 6.3 Dati Relativi ad Allergie e Condizioni di Salute

- **24 mesi:** dalla data dell'ultimo appuntamento o fino a revoca del consenso, se antecedente

### 6.4 Backup

- **7 giorni:** I backup automatici del sistema sono conservati per 7 giorni e poi eliminati automaticamente

Al termine dei periodi di conservazione, i dati saranno cancellati o resi anonimi in modo irreversibile.

---

## 7. DIRITTI DELL'INTERESSATO

In qualità di interessato, Lei ha il diritto di:

### 7.1 Diritto di Accesso (art. 15 GDPR)

Ottenere conferma dell'esistenza di dati personali che La riguardano e riceverne copia in formato leggibile

### 7.2 Diritto di Rettifica (art. 16 GDPR)

Ottenere la rettifica dei dati personali inesatti o l'integrazione di dati incompleti

### 7.3 Diritto alla Cancellazione / "Diritto all'Oblio" (art. 17 GDPR)

Ottenere la cancellazione dei dati personali, salvo i casi in cui la conservazione sia necessaria per:
- Adempiere un obbligo legale (es. conservazione per 10 anni dei dati fiscali)
- Accertare, esercitare o difendere un diritto in sede giudiziaria

### 7.4 Diritto di Limitazione (art. 18 GDPR)

Ottenere la limitazione del trattamento in caso di:
- Contestazione dell'esattezza dei dati
- Trattamento illecito con opposizione alla cancellazione
- Necessità di conservare i dati per difesa in giudizio

### 7.5 Diritto alla Portabilità (art. 20 GDPR)

Ricevere i dati personali in formato strutturato, di uso comune e leggibile da dispositivo automatico (JSON), e trasmetterli ad altro titolare senza impedimenti

### 7.6 Diritto di Opposizione (art. 21 GDPR)

Opporsi in qualsiasi momento al trattamento dei dati personali per motivi connessi alla Sua situazione particolare

### 7.7 Diritto di Revoca del Consenso (art. 7, par. 3 GDPR)

Revocare in qualsiasi momento il consenso prestato per:
- Invio di email di promemoria
- Trattamento di dati relativi ad allergie e condizioni di salute

La revoca del consenso non pregiudica la liceità del trattamento basata sul consenso prestato prima della revoca.

### 7.8 Diritto di Proporre Reclamo (art. 77 GDPR)

Proporre reclamo all'autorità di controllo competente:

**Garante per la Protezione dei Dati Personali**
Piazza Venezia, 11 - 00187 Roma
Tel: +39 06.696771
Fax: +39 06.69677.3785
Email: garante@gpdp.it
PEC: protocollo@pec.gpdp.it
Web: https://www.garanteprivacy.it

---

## 8. MODALITÀ DI ESERCIZIO DEI DIRITTI

Per esercitare i diritti sopra elencati, può contattare il Titolare del Trattamento mediante:

- **Email:** [EMAIL PRIVACY/CONTATTO]
- **PEC:** [INDIRIZZO PEC]
- **Posta ordinaria:** [INDIRIZZO COMPLETO]
- **Telefono:** [NUMERO TELEFONO]

Il Titolare risponderà alla richiesta **senza ingiustificato ritardo e, comunque, entro un mese** dal ricevimento della stessa. Tale termine può essere prorogato di due mesi, se necessario, tenuto conto della complessità e del numero delle richieste.

Per garantire la sicurezza dei dati, potrebbe essere richiesto di fornire un documento di identità valido per verificare la Sua identità prima di evadere la richiesta.

---

## 9. COOKIE E TECNOLOGIE SIMILI

### 9.1 Cookie Tecnici

Il sistema di prenotazione utilizza esclusivamente **cookie tecnici strettamente necessari** per:
- Garantire il funzionamento del sistema di prenotazione
- Gestire la sessione di prenotazione
- Implementare misure di sicurezza (token CSRF)
- Memorizzare temporaneamente i dati del form durante la compilazione

Questi cookie sono essenziali per il funzionamento del servizio e **non richiedono il consenso** dell'utente ai sensi delle Linee Guida del Garante Privacy (provvedimento n. 231 del 10 giugno 2021).

### 9.2 Dati di Navigazione

I sistemi informatici e le procedure software preposte al funzionamento del sito acquisiscono, nel corso del loro normale esercizio, alcuni dati la cui trasmissione è implicita nell'uso dei protocolli di comunicazione Internet (es. indirizzi IP in forma anonimizzata). Questi dati vengono utilizzati al solo fine di:
- Ricavare informazioni statistiche anonime sull'uso del servizio
- Controllare il corretto funzionamento del sistema
- Rilevare e prevenire frodi o abusi

I dati di navigazione sono conservati per un periodo massimo di **7 giorni**.

### 9.3 Cookie di Terze Parti

Il sistema di prenotazione **non utilizza** cookie di profilazione, cookie di terze parti per marketing o strumenti di tracciamento a fini pubblicitari.

---

## 10. NATURA DEL CONFERIMENTO

Il conferimento dei dati contrassegnati come obbligatori (nome, cognome, email, telefono) è **necessario** per:
- Dar corso alla prenotazione richiesta
- Adempiere agli obblighi contrattuali
- Ottemperare ad obblighi di legge

**L'eventuale rifiuto di fornire tali dati comporterà l'impossibilità di procedere con la prenotazione.**

Il conferimento di dati facoltativi (data di nascita, allergie, note) è rimesso alla Sua libera scelta e **non è obbligatorio**. L'eventuale rifiuto di fornire tali dati non pregiudica la possibilità di effettuare la prenotazione, ma potrebbe limitare la personalizzazione del servizio.

---

## 11. PROCESSO DECISIONALE AUTOMATIZZATO

Il Titolare **non effettua** alcun processo decisionale automatizzato, compresa la profilazione, di cui all'art. 22, paragrafi 1 e 4, del GDPR.

---

## 12. MODIFICHE ALLA PRIVACY POLICY

La presente Informativa sulla Privacy può essere modificata nel tempo, anche in conseguenza di eventuali modifiche normative. La invitiamo pertanto a consultare periodicamente questa pagina.

**In caso di modifiche sostanziali, provvederemo a informarLa mediante:**
- Pubblicazione della nuova versione sul sito di prenotazione
- Invio di comunicazione via email all'indirizzo fornito al momento della prenotazione (per i clienti che hanno effettuato prenotazioni nei 24 mesi precedenti)

La versione aggiornata sarà efficace dalla data di pubblicazione indicata in testa al documento.

Tutte le versioni precedenti della Privacy Policy saranno archiviate e rese disponibili su richiesta.

---

## 13. INFORMAZIONI DI CONTATTO PER LA PRIVACY

Per qualsiasi domanda o richiesta relativa al trattamento dei Suoi dati personali, può contattarci:

**Responsabile della Privacy / Data Protection Officer (DPO)**
[NOME RESPONSABILE/DPO SE NOMINATO]
Email: [EMAIL PRIVACY]
Telefono: [NUMERO TELEFONO]
PEC: [INDIRIZZO PEC]

**Orari di contatto:**
[SPECIFICARE ORARI SE APPLICABILE]

Ci impegniamo a rispondere a tutte le richieste nel minor tempo possibile e comunque nei termini previsti dal GDPR.

---

## 14. CONSENSO AL TRATTAMENTO

### Per la gestione della prenotazione (base giuridica: esecuzione del contratto)

Procedendo con la prenotazione, accetto che i miei dati personali vengano trattati per le finalità indicate al punto 2.1 della presente informativa.

### Per l'invio di promemoria via email (base giuridica: consenso)

□ **Acconsento** all'invio di email di promemoria automatiche relative agli appuntamenti prenotati

### Per il trattamento di dati relativi ad allergie/condizioni di salute (base giuridica: consenso esplicito)

□ **Acconsento** al trattamento dei dati relativi ad allergie e condizioni di salute comunicati nelle note di prenotazione, necessari per garantire la mia sicurezza durante i trattamenti

---

**Dichiaro di aver letto e compreso l'Informativa sulla Privacy e di acconsentire al trattamento dei miei dati personali per le finalità indicate.**

---

*Documento generato in conformità al Regolamento (UE) 2016/679 (GDPR) e alle Linee Guida del Garante per la Protezione dei Dati Personali.*

*Versione 1.0 - 18 Dicembre 2025*
