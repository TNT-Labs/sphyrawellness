import dotenv from 'dotenv';
import app from './app.js';
import { initializeIndexes } from './config/database.js';
import { initializeDailyReminderCron } from './jobs/dailyReminderCron.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

// Initialize database indexes and start server
async function startServer() {
  try {
    logger.info('🚀 Starting Sphyra Wellness Lab Server...\n');

    // Initialize database indexes
    await initializeIndexes();

    // Initialize cron job
    initializeDailyReminderCron();

    // Start Express server
    app.listen(PORT, () => {
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
