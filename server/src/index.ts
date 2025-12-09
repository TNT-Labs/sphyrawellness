import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeIndexes } from './config/database.js';
import { initializeDailyReminderCron, triggerReminderJobManually } from './jobs/dailyReminderCron.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import remindersRouter from './routes/reminders.js';
import appointmentsRouter from './routes/appointments.js';
import settingsRouter from './routes/settings.js';
import type { ApiResponse } from './types/index.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  };
  res.json(response);
});

// API Routes
app.use('/api/reminders', remindersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/settings', settingsRouter);

// Manual trigger for testing (protected endpoint - add authentication in production!)
app.post('/api/trigger-reminders', async (req, res) => {
  try {
    console.log('🔧 Manual reminder trigger requested');
    const result = await triggerReminderJobManually();

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Manual reminder trigger completed'
    };

    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to trigger reminders'
    };
    res.status(500).json(response);
  }
});

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database indexes and start server
async function startServer() {
  try {
    console.log('🚀 Starting Sphyra Wellness Server...\n');

    // Initialize database indexes
    await initializeIndexes();

    // Initialize cron job
    initializeDailyReminderCron();

    // Start Express server
    app.listen(PORT, () => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Sphyra Wellness Server is running!');
      console.log(`📍 Server URL: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`📧 Reminders API: http://localhost:${PORT}/api/reminders`);
      console.log(`📅 Appointments API: http://localhost:${PORT}/api/appointments`);
      console.log(`⚙️  Settings API: http://localhost:${PORT}/api/settings`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log('📝 Configuration:');
      console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   - Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(`   - SendGrid configured: ${process.env.SENDGRID_API_KEY ? '✅ Yes' : '❌ No'}`);
      console.log(`   - Reminder time: ${process.env.REMINDER_SEND_HOUR || '10'}:${String(process.env.REMINDER_SEND_MINUTE || '0').padStart(2, '0')}\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});
