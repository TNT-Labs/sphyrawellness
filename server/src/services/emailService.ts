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
      const msg = {
        to: recipientEmail,
        from: {
          email: sendGridConfig.fromEmail,
          name: sendGridConfig.fromName
        },
        subject: `Promemoria Appuntamento - ${data.appointmentDate}`,
        text: generateReminderEmailText(data),
        html: generateReminderEmailHTML(data)
      };

      const response = await sgMail.send(msg);

      console.log(`✅ Email sent successfully to ${recipientEmail}`);

      return {
        success: true,
        messageId: response[0].headers['x-message-id'] as string
      };
    } catch (error: any) {
      console.error('❌ Error sending email:', error);

      // SendGrid specific error handling
      if (error.response) {
        console.error('SendGrid Error Response:', error.response.body);
      }

      return {
        success: false,
        error: error.message || 'Unknown error occurred'
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
        subject: 'Test Email - Sphyra Wellness',
        text: 'This is a test email from Sphyra Wellness reminder system.',
        html: '<p>This is a test email from <strong>Sphyra Wellness</strong> reminder system.</p>'
      };

      await sgMail.send(msg);
      console.log(`✅ Test email sent successfully to ${recipientEmail}`);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error sending test email:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }
}

export default new EmailService();
