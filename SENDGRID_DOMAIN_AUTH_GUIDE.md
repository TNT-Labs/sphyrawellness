# Guida: Configurazione Domain Authentication SendGrid

## Problema
Le email vengono marcate come spam perché:
- Mittente: `bel.arancio@gmail.com` (dominio Gmail)
- Server di invio: SendGrid (non Gmail)
- Gmail rileva l'incongruenza e marca come spam

## Soluzione: Domain Authentication

### Passo 1: Accedi a SendGrid
1. Vai su https://app.sendgrid.com/
2. Login con le tue credenziali SendGrid

### Passo 2: Configura Domain Authentication
1. Nel menu laterale, vai su **Settings** → **Sender Authentication**
2. Clicca su **Authenticate Your Domain**
3. Seleziona il tuo DNS provider (se usi DuckDNS, seleziona "Other Host")
4. Inserisci il tuo dominio: `sphyrawellnesslab.duckdns.org`
5. SendGrid ti mostrerà i record DNS da aggiungere

### Passo 3: Record DNS da Aggiungere

SendGrid ti fornirà 3 tipi di record (esempi):

#### Record CNAME per DKIM (2 record)
```
Host: s1._domainkey.sphyrawellnesslab.duckdns.org
Value: s1.domainkey.u123456.wl.sendgrid.net

Host: s2._domainkey.sphyrawellnesslab.duckdns.org
Value: s2.domainkey.u123456.wl.sendgrid.net
```

#### Record TXT per SPF
```
Host: em1234.sphyrawellnesslab.duckdns.org (o mail.sphyrawellnesslab.duckdns.org)
Value: v=spf1 include:sendgrid.net ~all
```

### Passo 4: Configurare DNS

**IMPORTANTE**: DuckDNS ha limitazioni sui record DNS. Non supporta tutti i tipi di record necessari.

#### Opzione A: Usa Cloudflare (CONSIGLIATO)
1. Crea account gratuito su https://www.cloudflare.com/
2. Aggiungi il tuo dominio `sphyrawellnesslab.duckdns.org` (o usa un dominio custom)
3. Aggiungi i record DNS forniti da SendGrid
4. Cloudflare fornisce nameserver, ma se usi DuckDNS puoi:
   - Comprare un dominio economico (es. .it, .com) su Namecheap/Cloudflare
   - Puntare il dominio al tuo IP (già gestito da DuckDNS)
   - Gestire i record email su Cloudflare

#### Opzione B: Usa un sottodominio DuckDNS
Se DuckDNS supporta record CNAME/TXT (controllare):
1. Vai su https://www.duckdns.org/
2. Nella sezione domains, gestisci i record TXT se disponibili
3. Aggiungi i record forniti da SendGrid

#### Opzione C: Single Sender Verification (Temporaneo)
Se non puoi configurare DNS subito:
1. In SendGrid, vai su **Settings** → **Sender Authentication** → **Single Sender Verification**
2. Aggiungi `noreply@sphyrawellnesslab.duckdns.org`
3. SendGrid invia email di verifica (ma questa soluzione è limitata)

### Passo 5: Aggiorna Variabili d'Ambiente

Una volta verificato il dominio, aggiorna il file `.env` del server:

```bash
# Email Settings (SendGrid)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@sphyrawellnesslab.duckdns.org
SENDGRID_FROM_NAME=Sphyra Wellness Lab
```

**NON usare** `bel.arancio@gmail.com` come mittente!

### Passo 6: Riavvia Docker

```bash
# Riavvia il container backend per caricare le nuove variabili
docker-compose -f docker-compose.duckdns.yml restart backend
```

### Passo 7: Test

Invia un reminder di prova e controlla:
1. L'email arriva (non in spam)
2. Gmail mostra il mittente corretto
3. Non ci sono warning "doesn't seem to be real sender"

## Soluzione Alternativa: Usa un dominio custom economico

Se DuckDNS non supporta i record necessari:

1. **Compra un dominio** (.it costa ~10€/anno):
   - Namecheap: https://www.namecheap.com/
   - Cloudflare: https://www.cloudflare.com/products/registrar/
   - Google Domains: https://domains.google/

2. **Configura DNS**:
   ```
   A record: sphyrawellness.it → TUO_IP_PUBBLICO
   CNAME: www → sphyrawellness.it
   + Record CNAME/TXT per SendGrid (dalla guida sopra)
   ```

3. **Aggiorna nginx** per usare il nuovo dominio

4. **Usa email**: `noreply@sphyrawellness.it`

## Perché è importante?

### SPF (Sender Policy Framework)
Indica quali server possono inviare email per il tuo dominio.

### DKIM (DomainKeys Identified Mail)
Firma digitale che autentica l'email.

### DMARC (Domain-based Message Authentication)
Policy che dice ai server come gestire email non autenticate.

Senza questi, le email finiscono in spam al 90%+.

## Risorse

- SendGrid Domain Authentication: https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication
- Cloudflare DNS: https://www.cloudflare.com/learning/dns/what-is-dns/
- DuckDNS Docs: https://www.duckdns.org/spec.jsp

## Supporto

Se hai problemi con la configurazione DNS:
1. Verifica che i record siano propagati: https://dnschecker.org/
2. Controlla i log SendGrid per errori di autenticazione
3. Usa SendGrid's Email Activity per vedere i delivery status

## Checklist

- [ ] Account SendGrid configurato
- [ ] Domain Authentication avviata
- [ ] Record DNS aggiunti (CNAME per DKIM, TXT per SPF)
- [ ] Verifica completata in SendGrid (può richiedere 24-48h)
- [ ] `.env` aggiornato con nuovo email
- [ ] Docker riavviato
- [ ] Test email inviata con successo
- [ ] Email ricevuta (non in spam)
