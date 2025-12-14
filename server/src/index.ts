import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { globalLimiter, strictLimiter } from './middleware/rateLimiter.js';
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

// Trust proxy - Required when behind reverse proxy (nginx)
// This allows Express to trust X-Forwarded-* headers from nginx
app.set('trust proxy', true);

// Security Headers - Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true
}));

// Middleware
// CORS configuration with whitelist
const isDevelopment = process.env.NODE_ENV !== 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  // Development origins (only in development mode)
  ...(isDevelopment ? [
    'http://localhost:5173',  // Development frontend
    'http://localhost:3000',  // Alternative dev port
  ] : []),
  // Production HTTPS-only origins (private network)
  'https://sphyra.local',   // Local domain HTTPS
  'https://192.168.1.95',   // Local IP address HTTPS
];

// NOTE: In production, this backend only accepts HTTPS connections from private network
// To add more IPs, set ALLOWED_ORIGINS env var: ALLOWED_ORIGINS=https://sphyra.local,https://192.168.1.100

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked request from origin: ${origin}`);
      console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 10 minutes
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply global rate limiting to all routes
app.use(globalLimiter);

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
// Note: Appointments router handles its own authentication selectively
// to keep confirmation endpoints public
// Reminders and Settings routes are protected by frontend authentication
// For full security, implement JWT authentication in the future
app.use('/api/reminders', remindersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/settings', settingsRouter);

// Manual trigger for testing (now with strict rate limiting)
app.post('/api/trigger-reminders', strictLimiter, async (req, res) => {
  try {
    console.log(`🔧 Manual reminder trigger requested`);
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

// Root route
app.get('/', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      name: 'Sphyra Wellness Lab API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        reminders: '/api/reminders',
        appointments: '/api/appointments',
        settings: '/api/settings'
      }
    },
    message: 'Welcome to Sphyra Wellness Lab API'
  };
  res.json(response);
});

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database indexes and start server
async function startServer() {
  try {
    console.log('🚀 Starting Sphyra Wellness Lab Server...\n');

    // Initialize database indexes
    await initializeIndexes();

    // Initialize cron job
    initializeDailyReminderCron();

    // Start Express server
    app.listen(PORT, () => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Sphyra Wellness Lab Server is running!');
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
