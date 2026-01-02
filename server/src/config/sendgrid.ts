import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
  logger.warn('SENDGRID_API_KEY not found in environment variables', {
    status: 'Email sending disabled',
    action: 'Add SENDGRID_API_KEY to .env file'
  });
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
  logger.info('SendGrid configured successfully');
}

export const sendGridConfig = {
  fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@sphyrawellness.com',
  fromName: process.env.SENDGRID_FROM_NAME || 'Sphyra Wellness Lab',
  isConfigured: !!SENDGRID_API_KEY
};

export default sgMail;
