import type { ReminderEmailData } from '../types/index.js';

export function generateReminderEmailHTML(data: ReminderEmailData): string {
  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Promemoria Appuntamento - Sphyra Wellness</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f4f4f7;
      color: #333333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #db2777 0%, #9333ea 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #333333;
    }
    .appointment-card {
      background-color: #f9fafb;
      border-left: 4px solid #db2777;
      padding: 25px;
      margin: 30px 0;
      border-radius: 8px;
    }
    .appointment-row {
      display: flex;
      margin-bottom: 15px;
      align-items: center;
    }
    .appointment-row:last-child {
      margin-bottom: 0;
    }
    .appointment-label {
      font-weight: 600;
      color: #6b7280;
      min-width: 120px;
      font-size: 14px;
    }
    .appointment-value {
      color: #111827;
      font-size: 16px;
      font-weight: 500;
    }
    .cta-container {
      text-align: center;
      margin: 40px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #db2777 0%, #9333ea 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(219, 39, 119, 0.3);
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(219, 39, 119, 0.4);
    }
    .info-text {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.6;
      margin-top: 30px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 5px 0;
      font-size: 13px;
      color: #9ca3af;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 30px 0;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .header {
        padding: 30px 20px;
      }
      .header h1 {
        font-size: 24px;
      }
      .appointment-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .appointment-label {
        margin-bottom: 5px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🌸 Sphyra Wellness</h1>
    </div>

    <!-- Content -->
    <div class="content">
      <p class="greeting">Gentile <strong>${data.customerName}</strong>,</p>

      <p>Ti ricordiamo che hai un appuntamento presso il nostro centro domani.</p>

      <!-- Appointment Details Card -->
      <div class="appointment-card">
        <div class="appointment-row">
          <span class="appointment-label">📅 Data:</span>
          <span class="appointment-value">${data.appointmentDate}</span>
        </div>
        <div class="appointment-row">
          <span class="appointment-label">🕐 Orario:</span>
          <span class="appointment-value">${data.appointmentTime}</span>
        </div>
        <div class="appointment-row">
          <span class="appointment-label">✨ Servizio:</span>
          <span class="appointment-value">${data.serviceName}</span>
        </div>
        <div class="appointment-row">
          <span class="appointment-label">👤 Operatore:</span>
          <span class="appointment-value">${data.staffName}</span>
        </div>
      </div>

      <!-- CTA Button -->
      <div class="cta-container">
        <a href="${data.confirmationUrl}" class="cta-button">
          ✓ Conferma Appuntamento
        </a>
      </div>

      <p class="info-text">
        Cliccando sul pulsante qui sopra confermerai la tua presenza all'appuntamento.
        Se non puoi presentarti, ti preghiamo di contattarci il prima possibile.
      </p>

      <div class="divider"></div>

      <p class="info-text">
        Non vediamo l'ora di accoglierti nel nostro centro per offrirti un'esperienza di benessere indimenticabile.
      </p>

      <p style="margin-top: 30px; font-size: 14px; color: #333333;">
        A presto,<br>
        <strong>Il Team di Sphyra Wellness</strong>
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>Sphyra Wellness</strong></p>
      <p>Centro Estetico & Benessere</p>
      <p style="margin-top: 15px;">
        Questa è una email automatica, ti preghiamo di non rispondere.<br>
        Per qualsiasi informazione contattaci direttamente.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateReminderEmailText(data: ReminderEmailData): string {
  return `
Gentile ${data.customerName},

Ti ricordiamo che hai un appuntamento presso Sphyra Wellness domani.

DETTAGLI APPUNTAMENTO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Data: ${data.appointmentDate}
🕐 Orario: ${data.appointmentTime}
✨ Servizio: ${data.serviceName}
👤 Operatore: ${data.staffName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Per confermare la tua presenza, clicca sul link seguente:
${data.confirmationUrl}

Se non puoi presentarti, ti preghiamo di contattarci il prima possibile.

Non vediamo l'ora di accoglierti nel nostro centro!

A presto,
Il Team di Sphyra Wellness

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Questa è una email automatica, ti preghiamo di non rispondere.
  `.trim();
}
