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
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  ...(isDevelopment ? [
    'http://localhost:5173',
    'http://localhost:3000',
  ] : []),
  'https://sphyra.local',
  'https://192.168.1.95',
  'https://sphyrawellnesslab.duckdns.org',
  'https://tnt-labs.github.io', // GitHub Pages
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      logger.debug('CORS request allowed', { origin });
      callback(null, true);
      return;
    }
    logger.warn('CORS request blocked', { origin, allowedOrigins });
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Apply global rate limiting
app.use(globalLimiter);

// Request/Response logging
app.use(requestLogger);

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

// Protected routes (require authentication)
app.use('/api/customers', authenticateToken, customersRouter);
app.use('/api/services', authenticateToken, servicesRouter);
app.use('/api/staff', authenticateToken, staffRouter);
app.use('/api/appointments', authenticateToken, appointmentsRouter);
app.use('/api/payments', authenticateToken, paymentsRouter);
app.use('/api/reminders', authenticateToken, remindersRouter);
app.use('/api/users', authenticateToken, usersRouter);
app.use('/api/settings', authenticateToken, settingsRouter);

// Upload (keep existing - may need auth)
app.use('/api/upload', authenticateToken, uploadRouter);

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
