import type { ReminderEmailData } from '../types/index.js';

export function generateConfirmationEmailHTML(data: ReminderEmailData): string {
  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conferma Appuntamento - Sphyra Wellness Lab</title>
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
    .success-badge {
      background-color: #10b981;
      color: white;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      display: inline-block;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
      border-left: 4px solid #10b981;
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
      background-color: #fef3f2;
      border: 3px dashed #f97316;
      border-radius: 12px;
      padding: 30px 20px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      text-decoration: none !important;
      padding: 20px 50px;
      border-radius: 50px;
      font-size: 20px;
      font-weight: 700;
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
      border: 3px solid #ffffff;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      transition: all 0.3s ease;
    }
    .cta-button:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 28px rgba(16, 185, 129, 0.5);
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
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
      <h1>🌸 Sphyra Wellness Lab</h1>
    </div>

    <!-- Content -->
    <div class="content">
      <div style="text-align: center;">
        <span class="success-badge">✓ Appuntamento Registrato</span>
      </div>

      <p class="greeting">Gentile <strong>${data.customerName}</strong>,</p>

      <p>Grazie per aver scelto Sphyra Wellness Lab! La tua prenotazione è stata registrata con successo.</p>

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

      <!-- Confirmation CTA -->
      ${data.confirmationLink ? `
      <div class="cta-container">
        <div style="text-align: center; margin-bottom: 25px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 15px 25px; border-radius: 12px; border: 2px solid #f59e0b; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 16px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 1px;">
              ⚠️ Ultimo Passaggio
            </p>
          </div>
          <h2 style="margin: 0 0 15px 0; font-size: 24px; font-weight: 700; color: #111827;">
            Conferma il Tuo Appuntamento
          </h2>
          <p style="margin: 0 0 25px 0; font-size: 15px; color: #4b5563; line-height: 1.7;">
            Per completare la prenotazione e garantire il tuo posto,<br>
            ti chiediamo di confermare la tua presenza cliccando sul pulsante qui sotto.
          </p>
        </div>

        <a href="${data.confirmationLink}" class="cta-button" style="display: inline-block; margin: 0 auto 25px;">
          ✅ CONFERMA APPUNTAMENTO
        </a>

        <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px 20px; border-radius: 8px; text-align: left;">
          <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
            💡 Cosa succede quando confermi?
          </p>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1e3a8a; line-height: 1.8;">
            <li>Il tuo posto viene <strong>garantito</strong></li>
            <li>Riceverai una <strong>email di conferma</strong> immediata</li>
            <li>Potremo <strong>preparare</strong> tutto per il tuo trattamento</li>
            <li>Eviti <strong>sovrapposizioni</strong> o disguidi</li>
          </ul>
        </div>

        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center; font-style: italic;">
          Non riesci a partecipare? Contattaci il prima possibile per riprogrammare.
        </p>
      </div>
      ` : ''}

      <!-- Calendar Info -->
      <div class="cta-container">
        <div style="background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 20px; text-align: left;">
          <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #166534;">
            📅 File Calendario Allegato
          </p>
          <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.6;">
            Abbiamo allegato un file <strong>appuntamento.ics</strong> a questa email.
            Scaricalo e aprilo per aggiungere l'appuntamento al tuo calendario
            (Google Calendar, Outlook, Apple Calendar, ecc.).
          </p>
        </div>
      </div>

      <p class="info-text">
        Se hai bisogno di modificare o cancellare l'appuntamento, ti preghiamo di contattarci il prima possibile.
      </p>

      <div class="divider"></div>

      <p class="info-text">
        Non vediamo l'ora di accoglierti nel nostro centro per offrirti un'esperienza di benessere indimenticabile.
      </p>

      <p style="margin-top: 30px; font-size: 14px; color: #333333;">
        A presto,<br>
        <strong>Il Team di Sphyra Wellness Lab</strong>
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>Sphyra Wellness Lab</strong></p>
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

export function generateConfirmationEmailText(data: ReminderEmailData): string {
  return `
Gentile ${data.customerName},

Grazie per aver scelto Sphyra Wellness Lab!
La tua prenotazione è stata registrata con successo.

DETTAGLI APPUNTAMENTO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Data: ${data.appointmentDate}
🕐 Orario: ${data.appointmentTime}
✨ Servizio: ${data.serviceName}
👤 Operatore: ${data.staffName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.confirmationLink ? `
✓ CONFERMA IL TUO APPUNTAMENTO
Per completare la prenotazione, clicca sul link seguente:
${data.confirmationLink}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}
📎 FILE CALENDARIO ALLEGATO
Abbiamo allegato un file "appuntamento.ics" a questa email.
Scaricalo e aprilo per aggiungere l'appuntamento al tuo calendario
(Google Calendar, Outlook, Apple Calendar, ecc.).

Se hai bisogno di modificare o cancellare l'appuntamento,
ti preghiamo di contattarci il prima possibile.

Non vediamo l'ora di accoglierti nel nostro centro!

A presto,
Il Team di Sphyra Wellness Lab

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Questa è una email automatica, ti preghiamo di non rispondere.
  `.trim();
}
