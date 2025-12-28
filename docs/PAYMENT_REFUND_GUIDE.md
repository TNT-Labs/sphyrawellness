# 💰 Guida Storno Pagamenti

Sistema completo per gestire lo storno (refund) dei pagamenti e correggere errori di registrazione.

## 🎯 Casi d'Uso

### 1. Pagamento Registrato con Importo Sbagliato
```
Problema: Registrato €50 invece di €60
Soluzione:
1. Storna il pagamento di €50
2. Registra nuovo pagamento di €60
```

### 2. Pagamento Duplicato
```
Problema: Stesso pagamento registrato due volte
Soluzione:
1. Identifica il pagamento duplicato
2. Storna il pagamento duplicato
```

### 3. Metodo di Pagamento Errato
```
Problema: Registrato come "contanti" ma era "carta"
Soluzione:
1. Storna il pagamento con metodo errato
2. Registra nuovo pagamento con metodo corretto
```

### 4. Cliente Richiede Rimborso
```
Problema: Cliente richiede rimborso per servizio non erogato
Soluzione:
1. Storna il pagamento con motivazione "Rimborso cliente - servizio non erogato"
2. Eventualmente registrare il rimborso come transazione separata
```

## 🔧 Come Stornare un Pagamento

### API Endpoint: POST /api/payments/:id/refund

**Richiesta:**
```http
POST /api/payments/abc-123-def/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Importo errato - registrato 50€ invece di 60€"
}
```

**Risposta di Successo (200):**
```json
{
  "success": true,
  "message": "Payment refunded successfully",
  "payment": {
    "id": "abc-123-def",
    "appointmentId": "xyz-789",
    "amount": "50.00",
    "method": "cash",
    "status": "refunded",
    "date": "2024-01-15",
    "notes": "Pagamento iniziale",
    "refundedAt": "2024-01-15T14:30:00.000Z",
    "refundReason": "Importo errato - registrato 50€ invece di 60€",
    "refundedBy": "user-id-123",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
}
```

**Errori Possibili:**

```json
// Pagamento non trovato (404)
{
  "error": "Payment not found"
}

// Pagamento già stornato (400)
{
  "error": "Payment already refunded",
  "refundedAt": "2024-01-15T14:30:00.000Z",
  "refundReason": "Motivo precedente"
}

// Motivazione mancante o invalida (400)
{
  "error": "Validation error",
  "details": [
    {
      "path": ["reason"],
      "message": "Refund reason is required"
    }
  ]
}
```

## 📝 Esempio Completo: Correzione Importo

### Scenario
- Appuntamento: ID `app-123`
- Pagamento errato: €50 contanti (ID: `pay-wrong`)
- Pagamento corretto: €60 contanti

### Step 1: Storna il Pagamento Errato

```bash
curl -X POST https://sphyrawellnesslab.duckdns.org/api/payments/pay-wrong/refund \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Importo errato - doveva essere 60€ non 50€"
  }'
```

### Step 2: Registra il Pagamento Corretto

```bash
curl -X POST https://sphyrawellnesslab.duckdns.org/api/payments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "app-123",
    "amount": 60.00,
    "method": "cash",
    "date": "2024-01-15",
    "notes": "Pagamento corretto dopo storno"
  }'
```

## 🛡️ Protezioni di Sicurezza

### 1. Doppio Storno NON Consentito
```
Tentativo: Stornare un pagamento già stornato
Risultato: Errore 400 "Payment already refunded"
```

### 2. Cancellazione Diretta Bloccata
```
Tentativo: DELETE /api/payments/:id su pagamento valido
Risultato: Errore 400 "Cannot delete a paid payment. Use refund endpoint instead."
Info: Solo pagamenti già stornati possono essere eliminati
```

### 3. Motivazione Obbligatoria
```
Tentativo: Storno senza motivazione
Risultato: Errore 400 "Refund reason is required"
Info: La motivazione deve essere tra 1 e 500 caratteri
```

### 4. Audit Completo
Ogni storno viene tracciato con:
- ✅ User ID (chi ha effettuato lo storno)
- ✅ IP Address
- ✅ Timestamp preciso
- ✅ Motivazione completa
- ✅ Dettagli pagamento (importo, metodo, appointment)

## 📊 Impatto sulle Statistiche

### Revenue Statistics (GET /api/payments/stats/revenue)

**Prima dello storno:**
```json
{
  "total": 150.00,  // Include tutti i pagamenti
  "byMethod": [
    { "method": "cash", "total": 100.00, "count": 2 },
    { "method": "card", "total": 50.00, "count": 1 }
  ]
}
```

**Dopo lo storno di €50 contanti:**
```json
{
  "total": 100.00,  // Esclude il pagamento stornato
  "byMethod": [
    { "method": "cash", "total": 50.00, "count": 1 },  // Aggiornato
    { "method": "card", "total": 50.00, "count": 1 }
  ]
}
```

**Comportamento:**
- I pagamenti stornati (`status='refunded'`) sono **automaticamente esclusi** dalle statistiche
- Solo i pagamenti validi (`status='paid'`) vengono conteggiati
- Le statistiche si aggiornano in tempo reale dopo ogni storno

## 🔍 Visualizzare Pagamenti Stornati

### GET /api/payments
```bash
# Tutti i pagamenti (inclusi stornati)
curl https://sphyrawellnesslab.duckdns.org/api/payments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Risposta:**
```json
[
  {
    "id": "pay-1",
    "amount": "60.00",
    "status": "paid",
    "method": "cash",
    ...
  },
  {
    "id": "pay-2",
    "amount": "50.00",
    "status": "refunded",
    "method": "cash",
    "refundedAt": "2024-01-15T14:30:00.000Z",
    "refundReason": "Importo errato",
    "refundedBy": "user-123",
    ...
  }
]
```

### Filtrare Solo Pagamenti Validi (Frontend)
```javascript
// JavaScript/TypeScript
const validPayments = payments.filter(p => p.status === 'paid');
const refundedPayments = payments.filter(p => p.status === 'refunded');
```

## ⚙️ Configurazione Database

### Migrazione Automatica

Quando si avvia il server in produzione, la migration viene applicata automaticamente:

```bash
# Applicata automaticamente da docker-compose
npx prisma migrate deploy
```

### Struttura Database

```sql
-- Enum per status
CREATE TYPE "payment_status" AS ENUM ('paid', 'refunded');

-- Nuove colonne nella tabella payments
ALTER TABLE "payments"
ADD COLUMN "status" "payment_status" NOT NULL DEFAULT 'paid',
ADD COLUMN "refunded_at" TIMESTAMP(3),
ADD COLUMN "refund_reason" TEXT,
ADD COLUMN "refunded_by" TEXT;

-- Indice per performance
CREATE INDEX "payments_status_idx" ON "payments"("status");
```

## 📱 Integrazione Frontend

### Esempio React Component

```typescript
// Componente per stornare un pagamento
async function handleRefund(paymentId: string) {
  const reason = window.prompt('Motivo dello storno:');

  if (!reason || reason.trim().length === 0) {
    alert('La motivazione è obbligatoria');
    return;
  }

  try {
    const response = await fetch(`/api/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Errore: ${error.error}`);
      return;
    }

    const result = await response.json();
    alert(`Pagamento stornato con successo!`);

    // Ricarica lista pagamenti
    refreshPayments();
  } catch (error) {
    console.error('Errore storno:', error);
    alert('Errore durante lo storno');
  }
}

// UI Button
<button
  onClick={() => handleRefund(payment.id)}
  disabled={payment.status === 'refunded'}
  className="btn-refund"
>
  {payment.status === 'refunded' ? 'Già Stornato' : 'Storna Pagamento'}
</button>
```

### Badge Status Pagamento

```typescript
function PaymentStatusBadge({ payment }) {
  if (payment.status === 'refunded') {
    return (
      <div className="badge badge-danger" title={payment.refundReason}>
        ❌ Stornato
        <small>{new Date(payment.refundedAt).toLocaleString()}</small>
      </div>
    );
  }

  return <div className="badge badge-success">✅ Valido</div>;
}
```

## 🚨 Troubleshooting

### Problema: "Payment not found"
```
Causa: ID pagamento errato o pagamento già eliminato
Soluzione: Verificare l'ID del pagamento con GET /api/payments
```

### Problema: "Payment already refunded"
```
Causa: Tentativo di stornare un pagamento già stornato
Soluzione: Verificare lo stato del pagamento prima dello storno
Info: Il pagamento mostra refundedAt e refundReason
```

### Problema: "Cannot delete a paid payment"
```
Causa: Tentativo di DELETE su pagamento valido
Soluzione: Usare POST /api/payments/:id/refund invece
Nota: La cancellazione è permessa solo per pagamenti già stornati
```

### Problema: Le statistiche non si aggiornano
```
Causa: Cache frontend o browser
Soluzione:
1. Verificare che l'API ritorni i dati corretti
2. Invalidare cache frontend dopo storno
3. Ricaricare la pagina
```

## ✅ Checklist Pre-Produzione

Prima di utilizzare il sistema di storno in produzione:

- [ ] Applicata migration database (`prisma migrate deploy`)
- [ ] Testato endpoint di storno in staging
- [ ] Verificato audit logging funzionante
- [ ] Testato che statistiche escludano storni
- [ ] Frontend aggiornato per mostrare status pagamenti
- [ ] Team formato sull'uso del sistema di storno
- [ ] Procedure documentate per casi d'uso comuni
- [ ] Backup database configurato

## 📞 Supporto

Per problemi o domande sul sistema di storno:

1. Verifica i log audit: `/var/log/sphyra-audit.log`
2. Controlla database direttamente: `SELECT * FROM payments WHERE status = 'refunded';`
3. Consulta questa documentazione
4. Contatta il supporto tecnico

## 🔐 Conformità GDPR

Il sistema di storno è conforme GDPR:

- ✅ **Tracciabilità**: Ogni storno è tracciato con chi, quando, perché
- ✅ **Audit Trail**: Log immutabili per revisioni
- ✅ **Data Retention**: I pagamenti stornati rimangono nel database per audit
- ✅ **Right to Erasure**: Supporta cancellazione dopo storno se necessario
- ✅ **Accountability**: Ogni azione è attribuibile a un utente specifico
