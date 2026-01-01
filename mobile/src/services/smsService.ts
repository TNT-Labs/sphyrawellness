/**
 * SMS Service - Native SMS sending via Android SIM card
 */
import { Platform, PermissionsAndroid, Linking } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import logger from '@/utils/logger';
import type { PendingReminder, SMSResult } from '@/types';

class SMSService {
  /**
   * Request SMS permission on Android
   */
  async requestSMSPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.warn('SMS permission only required on Android');
      return false;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        {
          title: 'Permesso SMS',
          message: 'Sphyra SMS Reminder ha bisogno del permesso per inviare SMS',
          buttonNeutral: 'Chiedi dopo',
          buttonNegative: 'Nega',
          buttonPositive: 'Consenti',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting SMS permission:', error);
      return false;
    }
  }

  /**
   * Check if SMS permission is granted
   */
  async hasSMSPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.SEND_SMS
      );
      return granted;
    } catch (error) {
      console.error('Error checking SMS permission:', error);
      return false;
    }
  }

  /**
   * Send SMS using native Android API
   */
  async sendSMS(
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.debug('SMS', `Preparing to send SMS to ${phoneNumber}`, {
        phoneNumber,
        messageLength: message.length,
        platform: Platform.OS,
      });

      // Check permission
      const hasPermission = await this.hasSMSPermission();
      logger.debug('SMS', `SMS permission check: ${hasPermission}`);

      if (!hasPermission) {
        logger.warn('SMS', 'SMS permission not granted, requesting...');
        const granted = await this.requestSMSPermission();
        if (!granted) {
          logger.error('SMS', 'SMS permission denied by user');
          return {
            success: false,
            error: 'Permesso SMS non concesso',
          };
        }
        logger.success('SMS', 'SMS permission granted');
      }

      // Normalize phone number (remove spaces and formatting)
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      logger.debug('SMS', `Phone normalized: ${phoneNumber} → ${normalizedPhone}`);

      logger.info('SMS', `📱 Sending SMS to ${normalizedPhone}`, {
        originalPhone: phoneNumber,
        normalizedPhone,
        messagePreview: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        messageLength: message.length,
      });

      // Send SMS using react-native-get-sms-android
      return new Promise((resolve) => {
        SmsAndroid.autoSend(
          normalizedPhone,
          message,
          (fail: string) => {
            logger.error('SMS', `❌ SMS send failed: ${fail}`, {
              phoneNumber: normalizedPhone,
              failureReason: fail,
              message,
            });
            resolve({
              success: false,
              error: fail || 'Errore durante invio SMS',
            });
          },
          (success: string) => {
            logger.success('SMS', `✅ SMS sent successfully to ${normalizedPhone}`, {
              phoneNumber: normalizedPhone,
              successMessage: success,
            });
            resolve({ success: true });
          }
        );
      });
    } catch (error: any) {
      logger.error('SMS', `Exception during SMS send: ${error.message}`, {
        phoneNumber,
        error: error.message,
        stack: error.stack,
      });
      return {
        success: false,
        error: error.message || 'Errore sconosciuto',
      };
    }
  }

  /**
   * Normalize phone number for sending
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove spaces, dashes, parentheses
    let normalized = phone.replace(/[\s\-()]/g, '');

    // If starts with +39 (Italy), keep it
    // If starts with 3 (Italian mobile), add +39
    if (normalized.startsWith('3') && normalized.length === 10) {
      normalized = '+39' + normalized;
    }

    return normalized;
  }

  /**
   * Send reminder SMS for an appointment
   */
  async sendReminderSMS(reminder: PendingReminder): Promise<SMSResult> {
    const { appointment, message } = reminder;
    const { customer } = appointment;

    logger.debug('SMS', `Processing reminder for appointment ${appointment.id}`, {
      appointmentId: appointment.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      hasPhone: !!customer.phone,
      hasConsent: customer.smsReminderConsent,
    });

    // Validation: Check phone number
    if (!customer.phone) {
      logger.error('SMS', `Missing phone number for customer ${customer.name}`, {
        appointmentId: appointment.id,
        customerId: customer.id,
        customerName: customer.name,
      });
      return {
        success: false,
        appointmentId: appointment.id,
        error: 'Numero telefono mancante',
      };
    }

    // Validation: Check GDPR consent
    if (!customer.smsReminderConsent) {
      logger.warn('SMS', `No SMS consent for customer ${customer.name}`, {
        appointmentId: appointment.id,
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
      });
      return {
        success: false,
        appointmentId: appointment.id,
        error: 'Cliente non ha dato consenso SMS (GDPR)',
      };
    }

    // All validations passed, send SMS
    logger.info('SMS', `Validations passed, sending SMS to ${customer.name}`, {
      appointmentId: appointment.id,
      phone: customer.phone,
    });

    const result = await this.sendSMS(customer.phone, message);

    return {
      success: result.success,
      appointmentId: appointment.id,
      error: result.error,
    };
  }

  /**
   * Send multiple reminder SMS
   */
  async sendBulkReminders(reminders: PendingReminder[]): Promise<SMSResult[]> {
    const results: SMSResult[] = [];

    for (const reminder of reminders) {
      const result = await this.sendReminderSMS(reminder);
      results.push(result);

      // Small delay between SMS to avoid carrier limits
      await this.delay(1000);
    }

    return results;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Open SMS app settings (if user needs to grant permission manually)
   */
  async openSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  }
}

export const smsService = new SMSService();
export default smsService;
