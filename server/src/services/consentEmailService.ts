/**
 * Servizio per l'invio di email di notifica consensi GDPR
 * Conforme al GDPR Art. 13 - Informativa al momento della raccolta
 */

import sgMail from '../config/sendgrid.js';
import { sendGridConfig } from '../config/sendgrid.js';
import { generateConsentNotificationHTML, generateConsentNotificationText } from '../templates/consentNotificationEmail.js';
import { getErrorMessage } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * Invia email di notifica consenso attivato con link all'informativa privacy
 *
 * @param recipientEmail Email del cliente
 * @param firstName Nome del cliente
 * @param lastName Cognome del cliente
 * @param grantedConsents Lista dei consensi appena concessi
 * @param privacyPolicyVersion Versione della privacy policy
 * @returns Promise con il risultato dell'invio
 */
export async function sendConsentNotificationEmail(
  recipientEmail: string,
  firstName: string,
  lastName: string,
  grantedConsents: Array<{
    type: 'emailReminder' | 'smsReminder' | 'healthData' | 'marketing';
    label: string;
  }>,
  privacyPolicyVersion: string = '1.0'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!sendGridConfig.isConfigured) {
    logger.error('❌ SendGrid is not configured. Cannot send consent notification email.');
    return {
      success: false,
      error: 'SendGrid API key not configured'
    };
  }

  try {
    // Determina l'URL della privacy policy
    // In produzione, questo dovrebbe puntare alla pagina privacy policy del sito
    const privacyPolicyUrl = process.env.PRIVACY_POLICY_URL ||
      `${process.env.FRONTEND_URL || 'https://sphyrawellnesslab.duckdns.org'}/privacy-policy`;

    const emailData = {
      firstName,
      lastName,
      grantedConsents,
      privacyPolicyVersion,
      privacyPolicyUrl,
    };

    const msg = {
      to: recipientEmail,
      from: {
        email: sendGridConfig.fromEmail,
        name: sendGridConfig.fromName
      },
      subject: `🛡️ Conferma Consensi GDPR - Sphyra Wellness Lab`,
      text: generateConsentNotificationText(emailData),
      html: generateConsentNotificationHTML(emailData),
      // Categorie SendGrid per tracking
      categories: ['gdpr-consent', 'consent-notification'],
      // Custom args per tracking interno
      customArgs: {
        type: 'consent_notification',
        privacy_policy_version: privacyPolicyVersion,
      },
    };

    const response = await sgMail.send(msg);

    logger.info(`✅ Consent notification email sent successfully to ${recipientEmail}`);
    logger.info(`   Granted consents: ${grantedConsents.map(c => c.label).join(', ')}`);

    return {
      success: true,
      messageId: response[0].headers['x-message-id'] as string
    };
  } catch (error) {
    logger.error('❌ Error sending consent notification email:', error);

    // SendGrid specific error handling
    let errorMessage = getErrorMessage(error);

    // Extract more specific error from SendGrid response
    if (typeof error === 'object' && error !== null) {
      const sgError = error as any;
      if (sgError.response?.body?.errors && Array.isArray(sgError.response.body.errors)) {
        const errors = sgError.response.body.errors.map((e: any) => e.message).join(', ');
        errorMessage = `SendGrid error: ${errors}`;
      }
    }

    logger.error(`   Error details: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Invia email di test per verificare la configurazione SendGrid
 *
 * @param recipientEmail Email di destinazione per il test
 * @returns Promise con il risultato dell'invio
 */
export async function sendTestConsentNotificationEmail(
  recipientEmail: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const testConsents = [
    { type: 'emailReminder' as const, label: 'Promemoria via Email' },
    { type: 'smsReminder' as const, label: 'Promemoria via SMS' },
  ];

  return sendConsentNotificationEmail(
    recipientEmail,
    'Mario',
    'Rossi',
    testConsents,
    '1.0'
  );
}
