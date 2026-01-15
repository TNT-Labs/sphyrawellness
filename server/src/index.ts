import dotenv from 'dotenv';
import app from './app.js';
import { initializeDailyReminderCron } from './jobs/dailyReminderCronPrisma.js';
import { settingsRepository } from './repositories/settingsRepository.js';
import logger from './utils/logger.js';
import { validateSecurityConfig } from './config/security.js';

// Load environment variables
dotenv.config();

// Validate security configuration (fails fast if issues in production)
validateSecurityConfig();

const PORT = process.env.PORT || 3001;

// Initialize and start server
async function startServer() {
  try {
    logger.info('Starting Sphyra Wellness Lab Server');

    // Initialize business hours with defaults if not present
    await settingsRepository.initializeBusinessHours();

    // Initialize daily reminder cron job
    initializeDailyReminderCron();

    // Start Express server
    app.listen(PORT, () => {
      logger.info('Sphyra Wellness Lab Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
          health: `/health`,
          reminders: `/api/reminders`,
          appointments: `/api/appointments`,
          settings: `/api/settings`,
          public: `/api/public`,
          upload: `/api/upload`
        }
      });

      logger.info('Server configuration', {
        environment: process.env.NODE_ENV || 'development',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
        sendgridConfigured: !!process.env.SENDGRID_API_KEY,
        reminderTime: `${process.env.REMINDER_SEND_HOUR || '10'}:${String(process.env.REMINDER_SEND_MINUTE || '0').padStart(2, '0')}`
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
