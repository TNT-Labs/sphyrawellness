import sgMail from '../config/sendgrid.js';
import { sendGridConfig } from '../config/sendgrid.js';
import { generateReminderEmailHTML, generateReminderEmailText } from '../templates/reminderEmail.js';
import type { ReminderEmailData } from '../types/index.js';

export class EmailService {
  /**
   * Send reminder email to customer
   */
  async sendReminderEmail(
    recipientEmail: string,
    data: ReminderEmailData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!sendGridConfig.isConfigured) {
      console.error('❌ SendGrid is not configured. Cannot send email.');
      return {
        success: false,
        error: 'SendGrid API key not configured'
      };
    }

    try {
      const msg: any = {
        to: recipientEmail,
        from: {
          email: sendGridConfig.fromEmail,
          name: sendGridConfig.fromName
        },
        subject: `Promemoria Appuntamento - ${data.appointmentDate}`,
        text: generateReminderEmailText(data),
        html: generateReminderEmailHTML(data)
      };

      // Add .ics file as attachment if provided
      if (data.icsContent) {
        const icsBase64 = Buffer.from(data.icsContent, 'utf-8').toString('base64');
        msg.attachments = [
          {
            content: icsBase64,
            filename: 'appuntamento.ics',
            type: 'text/calendar',
            disposition: 'attachment'
          }
        ];
      }

      const response = await sgMail.send(msg);

      console.log(`✅ Email sent successfully to ${recipientEmail}`);

      return {
        success: true,
        messageId: response[0].headers['x-message-id'] as string
      };
    } catch (error: any) {
      console.error('❌ Error sending email:', error);

      // SendGrid specific error handling
      let errorMessage = error.message || 'Unknown error occurred';

      if (error.response) {
        console.error('SendGrid Error Response:', error.response.body);

        // Extract detailed error information from SendGrid response
        const responseBody = error.response.body;
        if (responseBody && responseBody.errors && Array.isArray(responseBody.errors)) {
          const errorMessages = responseBody.errors.map((err: any) => err.message || err).join(', ');
          errorMessage = `SendGrid error: ${errorMessages}`;

          // Add helpful context for common errors
          if (errorMessages.toLowerCase().includes('from') || errorMessages.toLowerCase().includes('missing')) {
            errorMessage += '. Check that the from email is verified in SendGrid and all required fields are configured.';
          }
        } else if (typeof responseBody === 'object') {
          errorMessage = `SendGrid error: ${JSON.stringify(responseBody)}`;
        }
      }

      console.error('Final error message:', errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Test email configuration by sending a test email
   */
  async sendTestEmail(recipientEmail: string): Promise<{ success: boolean; error?: string }> {
    if (!sendGridConfig.isConfigured) {
      return {
        success: false,
        error: 'SendGrid API key not configured'
      };
    }

    try {
      const msg = {
        to: recipientEmail,
        from: {
          email: sendGridConfig.fromEmail,
          name: sendGridConfig.fromName
        },
        subject: 'Test Email - Sphyra Wellness Lab',
        text: 'This is a test email from Sphyra Wellness Lab reminder system.',
        html: '<p>This is a test email from <strong>Sphyra Wellness Lab</strong> reminder system.</p>'
      };

      await sgMail.send(msg);
      console.log(`✅ Test email sent successfully to ${recipientEmail}`);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error sending test email:', error);

      let errorMessage = error.message || 'Unknown error occurred';

      if (error.response) {
        console.error('SendGrid Error Response:', error.response.body);

        const responseBody = error.response.body;
        if (responseBody && responseBody.errors && Array.isArray(responseBody.errors)) {
          const errorMessages = responseBody.errors.map((err: any) => err.message || err).join(', ');
          errorMessage = `SendGrid error: ${errorMessages}`;

          if (errorMessages.toLowerCase().includes('from') || errorMessages.toLowerCase().includes('missing')) {
            errorMessage += '. Check that the from email is verified in SendGrid and all required fields are configured.';
          }
        } else if (typeof responseBody === 'object') {
          errorMessage = `SendGrid error: ${JSON.stringify(responseBody)}`;
        }
      }

      console.error('Final error message:', errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

export default new EmailService();
