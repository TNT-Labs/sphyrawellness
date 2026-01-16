import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Middleware
import { globalLimiter, strictLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authenticateToken } from './middleware/auth.js';
import { prismaErrorHandler } from './middleware/prismaErrorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { csrfProtection, attachCsrfToken } from './middleware/csrf.js';

// PostgreSQL REST API routes
import authRouter from './routes/auth.js';
import customersRouter from './routes/customers.js';
import servicesRouter from './routes/services.js';
import staffRouter from './routes/staff.js';
import appointmentsRouter from './routes/appointments.js';
import paymentsRouter from './routes/payments.js';
import remindersRouter from './routes/reminders.js';
import usersRouter from './routes/users.js';
import settingsRouter from './routes/settings.js';
import publicRouter from './routes/public.js';

// Upload route
import uploadRouter from './routes/upload.js';

// Repositories for public endpoints
import { settingsRepository } from './repositories/settingsRepository.js';

import logger from './utils/logger.js';
import type { ApiResponse } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Early request logging - BEFORE any middleware that might reject requests
// This ensures we see ALL requests, even those blocked by CORS or other middleware
app.use((req, res, next) => {
  logger.debug('Request received', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin || 'no-origin',
    userAgent: req.headers['user-agent']?.substring(0, 50)
  });
  next();
});

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
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));

// CORS configuration
const isDevelopment = process.env.NODE_ENV !== 'production';

// Parse ALLOWED_ORIGINS from environment
let allowedOrigins: string[] = [];

if (process.env.ALLOWED_ORIGINS) {
  // Production/configured: Use only env var origins
  allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  logger.info(`CORS: Using ${allowedOrigins.length} allowed origins from ALLOWED_ORIGINS env var`);
} else if (isDevelopment) {
  // Development fallback: Common localhost ports only
  allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  logger.warn('⚠️  CORS: Using development fallback origins (localhost only)');
  logger.warn('⚠️  Set ALLOWED_ORIGINS in .env to configure origins');
} else {
  // Production without ALLOWED_ORIGINS: Empty list (only mobile apps will work)
  allowedOrigins = [];
  logger.error('❌ CORS: ALLOWED_ORIGINS not set in production!');
  logger.error('   Web clients will be blocked. Set ALLOWED_ORIGINS in .env');
  logger.error('   Example: ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com');
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) {
      logger.debug('CORS: Request without origin header (mobile app/native client)', { allowed: true });
      return callback(null, true);
    }

    // Allow mobile app origins (Capacitor, Ionic, React Native)
    if (origin === 'null' ||
        origin.startsWith('capacitor://') ||
        origin.startsWith('ionic://') ||
        origin.startsWith('file://')) {
      logger.debug('CORS: Mobile app origin detected', { origin, allowed: true });
      return callback(null, true);
    }

    // Check allowed origins list
    if (allowedOrigins.indexOf(origin) !== -1) {
      logger.debug('CORS: Allowed origin', { origin });
      callback(null, true);
      return;
    }

    // Block unknown origins
    logger.warn('CORS: Request blocked - unknown origin', {
      origin,
      allowedOrigins,
      hint: 'Add origin to ALLOWED_ORIGINS env var or check if mobile app is sending correct headers'
    });
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-CSRF-Token'],
  maxAge: 600
}));

// CORS error handler - catch and log CORS errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && err.message && err.message.includes('Not allowed by CORS')) {
    logger.error('CORS error - request rejected', err, {
      method: req.method,
      path: req.path,
      origin: req.headers.origin || 'no-origin',
      userAgent: req.headers['user-agent'],
      headers: {
        origin: req.headers.origin,
        referer: req.headers.referer,
        host: req.headers.host
      }
    });
    return res.status(403).json({
      success: false,
      error: 'CORS policy: Origin not allowed',
      hint: 'This request was blocked by CORS. Check server logs for details.'
    });
  }
  next(err);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Apply global rate limiting
app.use(globalLimiter);

// Request/Response logging
app.use(requestLogger);

// Attach CSRF token to all responses
// ALWAYS enabled in production (security requirement)
// Can be disabled in development with ENABLE_CSRF=false
const isProduction = process.env.NODE_ENV === 'production';
const enableCSRF = isProduction
  ? true  // Production: ALWAYS enabled (no override allowed)
  : process.env.ENABLE_CSRF === 'true';  // Development: disabled by default, explicit opt-in

if (enableCSRF) {
  app.use(attachCsrfToken);
  logger.info('✅ CSRF protection enabled');
} else {
  // Only possible in development
  logger.warn('⚠️  CSRF protection disabled - Development mode only!');
}

// Health check
app.get('/health', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'PostgreSQL'
    }
  };
  res.json(response);
});

// ============================================================================
// API ROUTES - PostgreSQL + REST
// ============================================================================

// Public routes (no authentication)
app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);

// Public business hours endpoint (must be before protected /api/settings)
app.get('/api/settings/business-hours', async (req, res, next) => {
  try {
    const businessHours = await settingsRepository.getBusinessHours();
    res.json({
      success: true,
      data: { businessHours },
    });
  } catch (error) {
    next(error);
  }
});

// Protected routes (require authentication + optional CSRF)
// CSRF protection is applied conditionally based on ENABLE_CSRF env variable
const protectedMiddleware = enableCSRF
  ? [authenticateToken, csrfProtection]
  : [authenticateToken];

app.use('/api/customers', ...protectedMiddleware, customersRouter);
app.use('/api/services', ...protectedMiddleware, servicesRouter);
app.use('/api/staff', ...protectedMiddleware, staffRouter);
app.use('/api/appointments', ...protectedMiddleware, appointmentsRouter);
app.use('/api/payments', ...protectedMiddleware, paymentsRouter);
app.use('/api/reminders', ...protectedMiddleware, remindersRouter);
app.use('/api/users', ...protectedMiddleware, usersRouter);
app.use('/api/settings', ...protectedMiddleware, settingsRouter);

// Upload (keep existing - may need auth)
app.use('/api/upload', ...protectedMiddleware, uploadRouter);

// Root route
app.get('/', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      name: 'Sphyra Wellness Lab API',
      version: '2.0.0',
      database: 'PostgreSQL',
      endpoints: {
        health: '/health',
        auth: '/api/auth (login, verify)',
        customers: '/api/customers',
        services: '/api/services',
        staff: '/api/staff',
        appointments: '/api/appointments',
        payments: '/api/payments',
        reminders: '/api/reminders',
        users: '/api/users',
        settings: '/api/settings',
        public: '/api/public (public booking)',
        upload: '/api/upload'
      }
    },
    message: 'Welcome to Sphyra Wellness Lab API - PostgreSQL Edition'
  };
  res.json(response);
});

// Error handlers (must be last)
app.use(prismaErrorHandler); // Handle Prisma errors first
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
