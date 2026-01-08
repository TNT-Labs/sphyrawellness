import smsConfig from '../config/sms.js';
import logger from '../utils/logger.js';
import { getErrorMessage } from '../utils/response.js';
import { withRetry, RetryPresets, isRetryableSMSError } from '../utils/retry.js';
import type { ReminderSMSData } from '../templates/smsTemplate.js';
import { generateReminderSMSText, generateConfirmationSMSText, generateCancellationSMSText } from '../templates/smsTemplate.js';

/**
 * SMS Service for sending SMS via Smartphone Gateway
 * Uses HTTP POST requests to an Android smartphone running SMS gateway app
 * Compatible with: SMS Gateway API, SMS Forwarder, and similar apps
 */
export class SMSService {
  /**
   * Validate and normalize phone number to E.164 format
   * E.164: +[country code][number] (e.g., +393331234567)
   */
  private normalizePhoneNumber(phone: string): { valid: boolean; normalized?: string; error?: string } {
    // Remove all spaces, dashes, parentheses
    let normalized = phone.replace(/[\s\-()]/g, '');

    // If starts with 00, replace with +
    if (normalized.startsWith('00')) {
      normalized = '+' + normalized.slice(2);
    }

    // If starts with 3 (Italian mobile), add +39
    if (normalized.startsWith('3') && normalized.length === 10) {
      normalized = '+39' + normalized;
    }

    // If starts with 0039, replace with +39
    if (normalized.startsWith('0039')) {
      normalized = '+39' + normalized.slice(4);
    }

    // Validate E.164 format: starts with + and has 7-15 digits
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    if (!e164Regex.test(normalized)) {
      return {
        valid: false,
        error: `Invalid phone number format: ${phone}. Expected E.164 format (e.g., +393331234567)`
      };
    }

    return { valid: true, normalized };
  }

  /**
   * Send SMS via HTTP gateway (smartphone)
   * Compatible with capcom6/android-sms-gateway API format
   */
  private async sendSMSViaGateway(
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!smsConfig.isConfigured) {
        logger.warn('⚠️ SMS gateway not configured. Skipping SMS send.');
        return {
          success: false,
          error: 'SMS gateway not configured. Please set SMS_GATEWAY_URL and SMS_GATEWAY_TOKEN in environment variables.'
        };
      }

      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      if (!normalizedPhone.valid) {
        logger.error(`❌ Invalid phone number: ${normalizedPhone.error}`);
        return {
          success: false,
          error: normalizedPhone.error
        };
      }

      logger.info(`📱 Sending SMS to ${normalizedPhone.normalized} via gateway ${smsConfig.gatewayUrl}...`);

      // Prepare request payload (capcom6 SMS Gateway format)
      const payload = {
        phoneNumbers: [normalizedPhone.normalized], // capcom6 uses array of phone numbers
        message: message
      };

      // Generate Basic Auth header from username:password format
      // SMS_GATEWAY_TOKEN should be in format "username:password"
      const basicAuth = Buffer.from(smsConfig.gatewayToken).toString('base64');

      // Send HTTP POST request to SMS gateway with retry logic
      try {
        const responseData = await withRetry(
          async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), smsConfig.timeout);

            try {
              const response = await fetch(`${smsConfig.gatewayUrl}/message`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Basic ${basicAuth}`
                },
                body: JSON.stringify(payload),
                signal: controller.signal
              });

              clearTimeout(timeoutId);

              // Check response status
              if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                const error: any = new Error(`Gateway error: ${response.status} ${response.statusText}`);
                error.response = { status: response.status };
                error.statusText = response.statusText;
                throw error;
              }

              // Parse response (most gateways return JSON)
              let responseData: any;
              try {
                responseData = await response.json();
              } catch (e) {
                // Some gateways might return plain text success message
                responseData = { success: true, message: await response.text() };
              }

              return responseData;
            } catch (fetchError: any) {
              clearTimeout(timeoutId);
              throw fetchError;
            }
          },
          {
            ...RetryPresets.standardAPI,
            isRetryableError: isRetryableSMSError,
            onRetry: (error, attempt, delay) => {
              logger.warn(`📱 Retrying SMS send to ${normalizedPhone.normalized} (attempt ${attempt}) after ${delay}ms`, {
                error: getErrorMessage(error)
              });
            }
          }
        );

        logger.info(`✅ SMS sent successfully via gateway. Response:`, responseData);

        return {
          success: true,
          messageId: responseData.id || responseData.messageId || `gateway-${Date.now()}`
        };
      } catch (error: any) {
        if (error.name === 'AbortError') {
          logger.error(`❌ SMS gateway request timed out after ${smsConfig.timeout}ms`);
          return {
            success: false,
            error: `Gateway timeout - smartphone might be offline or unreachable`
          };
        }

        throw error;
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      logger.error(`❌ Failed to send SMS to ${phoneNumber}:`, error);

      // Provide user-friendly error messages
      let userFriendlyError = errorMessage;
      if (errorMessage.includes('ECONNREFUSED')) {
        userFriendlyError = 'Cannot connect to SMS gateway - check if smartphone app is running and URL is correct';
      } else if (errorMessage.includes('ENETUNREACH') || errorMessage.includes('EHOSTUNREACH')) {
        userFriendlyError = 'SMS gateway unreachable - check network connection and smartphone';
      } else if (errorMessage.includes('ENOTFOUND')) {
        userFriendlyError = 'SMS gateway URL not found - check SMS_GATEWAY_URL configuration';
      }

      return {
        success: false,
        error: userFriendlyError
      };
    }
  }

  /**
   * Send reminder SMS for an appointment
   */
  async sendReminderSMS(
    phoneNumber: string,
    data: ReminderSMSData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const messageBody = generateReminderSMSText(data);
    return this.sendSMSViaGateway(phoneNumber, messageBody);
  }

  /**
   * Send confirmation SMS
   */
  async sendConfirmationSMS(
    phoneNumber: string,
    data: Omit<ReminderSMSData, 'confirmationLink'>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const messageBody = generateConfirmationSMSText(data);
    return this.sendSMSViaGateway(phoneNumber, messageBody);
  }

  /**
   * Send cancellation SMS
   */
  async sendCancellationSMS(
    phoneNumber: string,
    data: Omit<ReminderSMSData, 'confirmationLink' | 'staffName'>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const messageBody = generateCancellationSMSText(data);
    return this.sendSMSViaGateway(phoneNumber, messageBody);
  }

  /**
   * Test SMS gateway connection
   * Useful for verifying configuration
   */
  async testGateway(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!smsConfig.isConfigured) {
        return {
          success: false,
          error: 'SMS gateway not configured'
        };
      }

      logger.info(`🔍 Testing SMS gateway connection to ${smsConfig.gatewayUrl}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        // Try to ping the gateway (some gateways have a /health or /status endpoint)
        const response = await fetch(`${smsConfig.gatewayUrl}/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${smsConfig.gatewayToken}`
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          logger.info('✅ SMS gateway is reachable and responding');
          return { success: true };
        } else {
          logger.warn(`⚠️ SMS gateway responded with status ${response.status}`);
          return { success: true }; // Gateway is reachable even if status is not 200
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          logger.error('❌ SMS gateway connection timeout');
          return {
            success: false,
            error: 'Gateway timeout'
          };
        }

        throw fetchError;
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('❌ SMS gateway test failed:', error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

// Export singleton instance
const smsService = new SMSService();
export default smsService;
