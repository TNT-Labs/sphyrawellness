import dotenv from 'dotenv';
import app from './app.js';
import { initializeDailyReminderCron } from './jobs/dailyReminderCronPrisma.js';
import { settingsRepository } from './repositories/settingsRepository.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

// Initialize and start server
async function startServer() {
  try {
    console.log('[DEBUG] startServer() called');
    logger.info('🚀 Starting Sphyra Wellness Lab Server...\n');

    console.log('[DEBUG] Before initializeBusinessHours');
    // Initialize business hours with defaults if not present
    await settingsRepository.initializeBusinessHours();
    console.log('[DEBUG] After initializeBusinessHours');

    // Initialize daily reminder cron job
    initializeDailyReminderCron();
    console.log('[DEBUG] After initializeDailyReminderCron');

    console.log('[DEBUG] Before app.listen');
    // Start Express server
    app.listen(PORT, () => {
      console.log('[DEBUG] app.listen callback fired');
      logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info('✅ Sphyra Wellness Lab Server is running!');
      logger.info(`📍 Server URL: http://localhost:${PORT}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
      logger.info(`📧 Reminders API: http://localhost:${PORT}/api/reminders`);
      logger.info(`📅 Appointments API: http://localhost:${PORT}/api/appointments`);
      logger.info(`⚙️  Settings API: http://localhost:${PORT}/api/settings`);
      logger.info(`🌐 Public Booking API: http://localhost:${PORT}/api/public`);
      logger.info(`📤 Upload API: http://localhost:${PORT}/api/upload`);
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      logger.info('📝 Configuration:');
      logger.info(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`   - Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      logger.info(`   - SendGrid configured: ${process.env.SENDGRID_API_KEY ? '✅ Yes' : '❌ No'}`);
      logger.info(`   - Reminder time: ${process.env.REMINDER_SEND_HOUR || '10'}:${String(process.env.REMINDER_SEND_MINUTE || '0').padStart(2, '0')}\n`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('\n👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});
