/**
 * SMS Service - Native SMS sending via Android SIM card
 */
import { Platform, PermissionsAndroid, Linking } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
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
      // Check permission
      const hasPermission = await this.hasSMSPermission();
      if (!hasPermission) {
        const granted = await this.requestSMSPermission();
        if (!granted) {
          return {
            success: false,
            error: 'Permesso SMS non concesso',
          };
        }
      }

      // Normalize phone number (remove spaces and formatting)
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      console.log(`Sending SMS to ${normalizedPhone}: ${message}`);

      // Send SMS using react-native-sms
      return new Promise((resolve) => {
        SmsAndroid.autoSend(
          normalizedPhone,
          message,
          (fail: string) => {
            console.error('SMS send failed:', fail);
            resolve({
              success: false,
              error: fail || 'Errore durante invio SMS',
            });
          },
          (success: string) => {
            console.log('SMS sent successfully:', success);
            resolve({ success: true });
          }
        );
      });
    } catch (error: any) {
      console.error('Error sending SMS:', error);
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

    if (!customer.phone) {
      return {
        success: false,
        appointmentId: appointment.id,
        error: 'Numero telefono mancante',
      };
    }

    if (!customer.smsReminderConsent) {
      return {
        success: false,
        appointmentId: appointment.id,
        error: 'Cliente non ha dato consenso SMS (GDPR)',
      };
    }

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
