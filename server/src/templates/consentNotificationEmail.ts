/**
 * Template email per notifica consenso GDPR attivato
 * Conforme al GDPR - Art. 13 e 14 (Informativa al momento della raccolta)
 */

export interface ConsentNotificationData {
  firstName: string;
  lastName: string;
  grantedConsents: Array<{
    type: 'emailReminder' | 'smsReminder' | 'healthData' | 'marketing';
    label: string;
  }>;
  privacyPolicyVersion: string;
  privacyPolicyUrl: string;
}

export function generateConsentNotificationHTML(data: ConsentNotificationData): string {
  const consentsList = data.grantedConsents.map(consent =>
    `<li style="margin-bottom: 8px; color: #059669; font-weight: 500;">✓ ${consent.label}</li>`
  ).join('');

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conferma Consensi - Sphyra Wellness Lab</title>
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
      background: linear-gradient(135deg, #0891b2 0%, #0284c7 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 26px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0 0;
      color: #e0f2fe;
      font-size: 14px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #333333;
    }
    .consent-card {
      background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%);
      border-left: 4px solid #0891b2;
      padding: 25px;
      margin: 30px 0;
      border-radius: 8px;
    }
    .consent-card h2 {
      margin: 0 0 15px 0;
      color: #0e7490;
      font-size: 18px;
      font-weight: 600;
    }
    .consent-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .info-box {
      background-color: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
    }
    .info-box h3 {
      margin: 0 0 12px 0;
      color: #0f766e;
      font-size: 16px;
      font-weight: 600;
    }
    .info-box p {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #134e4a;
      line-height: 1.6;
    }
    .info-box p:last-child {
      margin-bottom: 0;
    }
    .cta-container {
      text-align: center;
      margin: 35px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #0891b2 0%, #0284c7 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(8, 145, 178, 0.4);
    }
    .rights-section {
      margin-top: 30px;
      padding: 20px;
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
    }
    .rights-section h3 {
      margin: 0 0 15px 0;
      color: #92400e;
      font-size: 16px;
      font-weight: 600;
    }
    .rights-section ul {
      margin: 0;
      padding-left: 20px;
      color: #78350f;
      font-size: 14px;
      line-height: 1.8;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer-text {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.6;
      margin: 0 0 10px 0;
    }
    .footer-version {
      font-size: 11px;
      color: #9ca3af;
      margin: 15px 0 0 0;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .header {
        padding: 30px 20px;
      }
      .header h1 {
        font-size: 22px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🛡️ Conferma Consensi GDPR</h1>
      <p>Sphyra Wellness Lab</p>
    </div>

    <!-- Content -->
    <div class="content">
      <p class="greeting">
        Gentile <strong>${data.firstName} ${data.lastName}</strong>,
      </p>

      <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
        Le confermiamo che abbiamo registrato la sua autorizzazione per i seguenti trattamenti dei dati personali:
      </p>

      <!-- Consents Card -->
      <div class="consent-card">
        <h2>Consensi Attivati</h2>
        <ul class="consent-list">
          ${consentsList}
        </ul>
      </div>

      <!-- Information Box -->
      <div class="info-box">
        <h3>📋 Cosa significa?</h3>
        <p>
          I consensi che ha appena autorizzato ci permettono di trattare i suoi dati personali per le finalità specifiche indicate.
          Questi consensi sono <strong>facoltativi</strong> e possono essere revocati in qualsiasi momento senza conseguenze.
        </p>
        <p>
          Il consenso alla privacy e al trattamento dei dati personali base (obbligatorio per la gestione degli appuntamenti)
          rimane valido come da sua precedente autorizzazione.
        </p>
      </div>

      <!-- Privacy Policy CTA -->
      <div class="cta-container">
        <a href="${data.privacyPolicyUrl}" class="cta-button">
          📄 Leggi l'Informativa Privacy Completa
        </a>
      </div>

      <!-- Rights Section -->
      <div class="rights-section">
        <h3>I Suoi Diritti (GDPR)</h3>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #78350f;">
          In qualsiasi momento può esercitare i seguenti diritti:
        </p>
        <ul>
          <li><strong>Diritto di accesso</strong> - Ottenere una copia dei dati che la riguardano</li>
          <li><strong>Diritto di rettifica</strong> - Correggere dati inesatti o incompleti</li>
          <li><strong>Diritto alla cancellazione</strong> - Richiedere la cancellazione dei suoi dati</li>
          <li><strong>Diritto di revoca del consenso</strong> - Revocare i consensi in qualsiasi momento</li>
          <li><strong>Diritto di opposizione</strong> - Opporsi al trattamento dei suoi dati</li>
          <li><strong>Diritto alla portabilità</strong> - Ricevere i dati in formato strutturato</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin-top: 30px; line-height: 1.6;">
        Per esercitare i suoi diritti o per qualsiasi domanda riguardante il trattamento dei suoi dati personali,
        può contattarci in qualsiasi momento.
      </p>

      <p style="font-size: 14px; color: #6b7280; margin-top: 20px; line-height: 1.6;">
        <strong>Importante:</strong> Questa email ha valore di conferma e documentazione ai fini GDPR.
        La preghiamo di conservarla per i suoi archivi.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-text">
        <strong>Sphyra Wellness Lab</strong><br>
        Centro Estetico e Benessere
      </p>
      <p class="footer-text" style="margin-top: 15px;">
        Questa è una comunicazione automatica inviata in conformità al Regolamento UE 2016/679 (GDPR).
      </p>
      <p class="footer-version">
        Privacy Policy versione ${data.privacyPolicyVersion} | Data: ${new Date().toLocaleDateString('it-IT')}
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateConsentNotificationText(data: ConsentNotificationData): string {
  const consentsList = data.grantedConsents
    .map(consent => `  ✓ ${consent.label}`)
    .join('\n');

  return `
CONFERMA CONSENSI GDPR
Sphyra Wellness Lab

Gentile ${data.firstName} ${data.lastName},

Le confermiamo che abbiamo registrato la sua autorizzazione per i seguenti trattamenti dei dati personali:

CONSENSI ATTIVATI:
${consentsList}

COSA SIGNIFICA?
I consensi che ha appena autorizzato ci permettono di trattare i suoi dati personali per le finalità specifiche indicate.
Questi consensi sono facoltativi e possono essere revocati in qualsiasi momento senza conseguenze.

Il consenso alla privacy e al trattamento dei dati personali base (obbligatorio per la gestione degli appuntamenti)
rimane valido come da sua precedente autorizzazione.

INFORMATIVA PRIVACY:
Per consultare l'informativa privacy completa, visiti:
${data.privacyPolicyUrl}

I SUOI DIRITTI (GDPR):
In qualsiasi momento può esercitare i seguenti diritti:
• Diritto di accesso - Ottenere una copia dei dati che la riguardano
• Diritto di rettifica - Correggere dati inesatti o incompleti
• Diritto alla cancellazione - Richiedere la cancellazione dei suoi dati
• Diritto di revoca del consenso - Revocare i consensi in qualsiasi momento
• Diritto di opposizione - Opporsi al trattamento dei suoi dati
• Diritto alla portabilità - Ricevere i dati in formato strutturato

Per esercitare i suoi diritti o per qualsiasi domanda riguardante il trattamento dei suoi dati personali,
può contattarci in qualsiasi momento.

IMPORTANTE: Questa email ha valore di conferma e documentazione ai fini GDPR.
La preghiamo di conservarla per i suoi archivi.

---
Sphyra Wellness Lab
Centro Estetico e Benessere

Questa è una comunicazione automatica inviata in conformità al Regolamento UE 2016/679 (GDPR).
Privacy Policy versione ${data.privacyPolicyVersion} | Data: ${new Date().toLocaleDateString('it-IT')}
  `.trim();
}
