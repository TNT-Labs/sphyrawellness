# API REST Endpoints

## Base URL
```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

## Autenticazione
Tutti gli endpoints (tranne `/public/*`) richiedono autenticazione JWT.

```http
Authorization: Bearer <token>
```

---

## Customers

### GET /api/customers
Ottieni tutti i clienti

**Query Parameters:**
- `search` (optional): Cerca per nome, email o telefono

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "firstName": "Anna",
    "lastName": "Ferrari",
    "email": "anna@email.com",
    "phone": "+393331111111",
    "dateOfBirth": "1985-05-15",
    "notes": "Cliente abituale",
    "allergies": null,
    "privacyConsent": true,
    "privacyConsentDate": "2024-01-01T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

### GET /api/customers/:id
Ottieni dettagli cliente

**Query Parameters:**
- `include` (optional): `appointments` - Include appuntamenti del cliente

**Response:** `200 OK`

### POST /api/customers
Crea nuovo cliente

**Request Body:**
```json
{
  "firstName": "Anna",
  "lastName": "Ferrari",
  "email": "anna@email.com",
  "phone": "+393331111111",
  "dateOfBirth": "1985-05-15",
  "privacyConsent": true,
  "privacyConsentVersion": "1.0",
  "emailReminderConsent": true,
  "healthDataConsent": true
}
```

**Response:** `201 Created`

**Errors:**
- `409 Conflict`: Email o telefono già esistente

### PUT /api/customers/:id
Aggiorna cliente

**Request Body:** Stesso di POST (tutti i campi optional)

**Response:** `200 OK`

### PATCH /api/customers/:id/consents
Aggiorna consensi GDPR

**Request Body:**
```json
{
  "emailReminderConsent": true,
  "smsReminderConsent": false
}
```

**Response:** `200 OK`

### DELETE /api/customers/:id
Elimina cliente

**Response:** `204 No Content`

**Errors:**
- `409 Conflict`: Cliente ha appuntamenti futuri

---

## Services

### GET /api/services
Ottieni tutti i servizi

**Query Parameters:**
- `categoryId` (optional): Filtra per categoria

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Massaggio Decontratturante",
    "description": "...",
    "duration": 60,
    "price": 55.00,
    "categoryId": "uuid",
    "color": "#10B981",
    "imageUrl": "https://...",
    "category": {
      "id": "uuid",
      "name": "Massaggi",
      "color": "#10B981"
    }
  }
]
```

### POST /api/services
Crea nuovo servizio

**Request Body:**
```json
{
  "name": "Nuovo Servizio",
  "description": "Descrizione",
  "duration": 60,
  "price": 50.00,
  "categoryId": "uuid",
  "color": "#3B82F6"
}
```

### PUT /api/services/:id
Aggiorna servizio

### DELETE /api/services/:id
Elimina servizio

**Errors:**
- `409 Conflict`: Servizio ha appuntamenti futuri

---

## Service Categories

### GET /api/services/categories/all
Ottieni tutte le categorie

**Query Parameters:**
- `active=true`: Solo categorie attive

### POST /api/services/categories
Crea nuova categoria

**Request Body:**
```json
{
  "name": "Fisioterapia",
  "color": "#3B82F6",
  "isActive": true
}
```

### PUT /api/services/categories/:id
Aggiorna categoria

### DELETE /api/services/categories/:id
Elimina categoria

---

## Staff

### GET /api/staff
Ottieni tutto lo staff

**Query Parameters:**
- `active=true`: Solo staff attivo

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "firstName": "Mario",
    "lastName": "Rossi",
    "email": "mario@email.com",
    "phone": "+393331234567",
    "roleId": "uuid",
    "role": {
      "id": "uuid",
      "name": "Fisioterapista"
    },
    "specializations": ["Fisioterapia Sportiva"],
    "color": "#EF4444",
    "isActive": true,
    "profileImageUrl": "https://..."
  }
]
```

### GET /api/staff/:id
Ottieni dettagli staff

**Query Parameters:**
- `include=appointments`: Include appuntamenti

### POST /api/staff
Crea nuovo membro staff

### PUT /api/staff/:id
Aggiorna staff

### DELETE /api/staff/:id
Elimina staff

---

## Staff Roles

### GET /api/staff/roles/all
Ottieni tutti i ruoli

### POST /api/staff/roles
Crea nuovo ruolo

### PUT /api/staff/roles/:id
Aggiorna ruolo

### DELETE /api/staff/roles/:id
Elimina ruolo

---

## Appointments

### GET /api/appointments
Ottieni tutti gli appuntamenti

**Query Parameters:**
- `startDate`: Data inizio (ISO 8601)
- `endDate`: Data fine (ISO 8601)
- `status`: scheduled, confirmed, completed, cancelled, no-show
- `customerId`: Filtra per cliente
- `staffId`: Filtra per staff
- `serviceId`: Filtra per servizio

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "customerId": "uuid",
    "serviceId": "uuid",
    "staffId": "uuid",
    "date": "2024-01-15",
    "startTime": "09:00",
    "endTime": "10:00",
    "status": "scheduled",
    "notes": "Prima seduta",
    "reminderSent": false,
    "customer": { ... },
    "service": { ... },
    "staff": { ... }
  }
]
```

### GET /api/appointments/:id
Ottieni dettagli appuntamento

### POST /api/appointments
Crea nuovo appuntamento

**Request Body:**
```json
{
  "customerId": "uuid",
  "serviceId": "uuid",
  "staffId": "uuid",
  "date": "2024-01-15",
  "startTime": "09:00",
  "endTime": "10:00",
  "notes": "Note opzionali"
}
```

**Errors:**
- `409 Conflict`: Conflitto orario con altro appuntamento

### PUT /api/appointments/:id
Aggiorna appuntamento

### PATCH /api/appointments/:id/status
Cambia status appuntamento

**Request Body:**
```json
{
  "status": "completed"
}
```

### POST /api/appointments/:id/confirm
Conferma appuntamento (pubblico, usa confirmation token)

**No authentication required**

**Request Body:**
```json
{
  "token": "confirmation-token-from-email"
}
```

### DELETE /api/appointments/:id
Elimina appuntamento

---

## Payments

### GET /api/payments
Ottieni tutti i pagamenti

**Query Parameters:**
- `startDate`: Data inizio
- `endDate`: Data fine
- `appointmentId`: Filtra per appuntamento

### GET /api/payments/:id
Ottieni dettagli pagamento

### POST /api/payments
Registra nuovo pagamento

**Request Body:**
```json
{
  "appointmentId": "uuid",
  "amount": 55.00,
  "method": "cash",
  "date": "2024-01-15",
  "notes": "Pagamento in contanti"
}
```

**method values:** `cash`, `card`, `transfer`, `other`

### PUT /api/payments/:id
Aggiorna pagamento

### DELETE /api/payments/:id
Elimina pagamento

### GET /api/payments/stats/revenue
Statistiche fatturato

**Query Parameters:**
- `startDate` (required)
- `endDate` (required)

**Response:**
```json
{
  "total": 1250.00,
  "byMethod": [
    {
      "method": "cash",
      "total": 750.00,
      "count": 15
    },
    {
      "method": "card",
      "total": 500.00,
      "count": 10
    }
  ]
}
```

---

## Reminders

### GET /api/reminders
Ottieni tutti i promemoria

### GET /api/reminders/:id
Ottieni dettagli promemoria

### POST /api/reminders
Crea promemoria

### GET /api/reminders/pending
Ottieni promemoria da inviare

### POST /api/reminders/:id/send
Invia promemoria manualmente

---

## Authentication

### POST /api/auth/login
Login utente

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "RESPONSABILE",
    "firstName": "Admin",
    "lastName": "System"
  }
}
```

**Errors:**
- `401 Unauthorized`: Credenziali invalide

### POST /api/auth/verify
Verifica token JWT

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "valid": true,
  "user": { ... }
}
```

### POST /api/auth/logout
Logout (client-side, invalida token)

---

## Users

### GET /api/users
Ottieni tutti gli utenti

### GET /api/users/:id
Ottieni dettagli utente

### POST /api/users
Crea nuovo utente

**Request Body:**
```json
{
  "username": "newuser",
  "password": "password123",
  "role": "UTENTE",
  "firstName": "Mario",
  "lastName": "Rossi",
  "email": "mario@email.com"
}
```

**role values:** `RESPONSABILE`, `UTENTE`

### PUT /api/users/:id
Aggiorna utente

### PATCH /api/users/:id/password
Cambia password

**Request Body:**
```json
{
  "currentPassword": "oldpass",
  "newPassword": "newpass"
}
```

### DELETE /api/users/:id
Elimina utente

---

## Settings

### GET /api/settings
Ottieni tutte le impostazioni

**Response:**
```json
{
  "reminder_send_hour": 10,
  "reminder_send_minute": 0,
  "enable_auto_reminders": true,
  "reminder_days_before": 1
}
```

### PUT /api/settings
Aggiorna impostazioni (bulk update)

**Request Body:**
```json
{
  "reminder_send_hour": 9,
  "enable_auto_reminders": false
}
```

### GET /api/settings/:key
Ottieni singola impostazione

### PUT /api/settings/:key
Aggiorna singola impostazione

---

## Public Booking API

**No authentication required**

### GET /api/public/services
Ottieni servizi disponibili per prenotazione pubblica

### GET /api/public/staff
Ottieni staff disponibile

**Query Parameters:**
- `serviceId` (optional): Filtra per servizio

### POST /api/public/appointments/availability
Verifica disponibilità slot

**Request Body:**
```json
{
  "serviceId": "uuid",
  "staffId": "uuid",
  "date": "2024-01-15"
}
```

**Response:**
```json
{
  "availableSlots": [
    {
      "startTime": "09:00",
      "endTime": "10:00"
    },
    {
      "startTime": "10:30",
      "endTime": "11:30"
    }
  ]
}
```

### POST /api/public/appointments
Prenota appuntamento (pubblico)

**Request Body:**
```json
{
  "customer": {
    "firstName": "Anna",
    "lastName": "Ferrari",
    "email": "anna@email.com",
    "phone": "+393331111111",
    "privacyConsent": true
  },
  "serviceId": "uuid",
  "staffId": "uuid",
  "date": "2024-01-15",
  "startTime": "09:00"
}
```

**Response:** `201 Created`

---

## Error Responses

Tutti gli endpoints possono restituire:

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": [ ... ]
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or missing token"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "Resource conflict",
  "details": "..."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "..."
}
```
