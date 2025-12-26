import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Middleware
import { globalLimiter, strictLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';
import { prismaErrorHandler } from './middleware/prismaErrorHandler.js';

// New PostgreSQL routes
import authRouter from './routes/auth.new.js';
import customersRouter from './routes/customers.new.js';
import servicesRouter from './routes/services.new.js';
import staffRouter from './routes/staff.new.js';
import appointmentsRouter from './routes/appointments.new.js';
import paymentsRouter from './routes/payments.new.js';
import remindersRouter from './routes/reminders.new.js';
import usersRouter from './routes/users.new.js';
import settingsRouter from './routes/settings.new.js';
import publicRouter from './routes/public.new.js';

// Existing routes (keep for now - upload, etc.)
import uploadRouter from './routes/upload.js';

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
      logger.info(`✅ CORS allowed: ${origin}`);
      callback(null, true);
      return;
    }
    logger.warn(`❌ CORS blocked: ${origin}`);
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

// Request logging
app.use((req, res, next) => {
  logger.debug(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

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

// Protected routes (require authentication)
app.use('/api/customers', authenticate, customersRouter);
app.use('/api/services', authenticate, servicesRouter);
app.use('/api/staff', authenticate, staffRouter);
app.use('/api/appointments', authenticate, appointmentsRouter);
app.use('/api/payments', authenticate, paymentsRouter);
app.use('/api/reminders', authenticate, remindersRouter);
app.use('/api/users', authenticate, usersRouter);
app.use('/api/settings', authenticate, settingsRouter);

// Upload (keep existing - may need auth)
app.use('/api/upload', authenticate, uploadRouter);

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
