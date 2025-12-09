import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
  console.warn('⚠️  SENDGRID_API_KEY not found in environment variables');
  console.warn('   Email sending will be disabled. Please add SENDGRID_API_KEY to .env file');
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('✅ SendGrid configured successfully');
}

export const sendGridConfig = {
  fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@sphyrawellness.com',
  fromName: process.env.SENDGRID_FROM_NAME || 'Sphyra Wellness',
  isConfigured: !!SENDGRID_API_KEY
};

export default sgMail;
