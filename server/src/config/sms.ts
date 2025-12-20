import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

/**
 * SMS Gateway Configuration (Smartphone-based)
 *
 * Use an Android smartphone as SMS gateway using apps like:
 * - SMS Gateway API (https://smsgateway.me/)
 * - SMS Forwarder
 * - Similar HTTP-based SMS gateway apps
 *
 * The smartphone must be on the same network or accessible via public URL/VPN
 */

// SMS Gateway Configuration from environment variables
const SMS_GATEWAY_URL = process.env.SMS_GATEWAY_URL; // e.g., http://192.168.1.100:9090
const SMS_GATEWAY_TOKEN = process.env.SMS_GATEWAY_TOKEN; // Authentication token
const SMS_GATEWAY_PHONE = process.env.SMS_GATEWAY_PHONE; // Optional: phone number of the gateway

// Check if SMS gateway is configured
const isConfigured = !!(SMS_GATEWAY_URL && SMS_GATEWAY_TOKEN);

if (isConfigured) {
  logger.info(`✅ SMS Gateway configured at ${SMS_GATEWAY_URL}`);
  if (SMS_GATEWAY_PHONE) {
    logger.info(`   Gateway Phone: ${SMS_GATEWAY_PHONE}`);
  }
} else {
  logger.warn('⚠️ SMS Gateway not configured. Set SMS_GATEWAY_URL and SMS_GATEWAY_TOKEN in .env to enable SMS reminders.');
  logger.warn('   Example: SMS_GATEWAY_URL=http://192.168.1.100:9090');
  logger.warn('   See documentation for smartphone gateway setup instructions.');
}

export const smsConfig = {
  isConfigured,
  gatewayUrl: SMS_GATEWAY_URL || '',
  gatewayToken: SMS_GATEWAY_TOKEN || '',
  gatewayPhone: SMS_GATEWAY_PHONE || '',
  // Timeout for SMS sending (in milliseconds)
  timeout: 10000 // 10 seconds
};

export default smsConfig;
