import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { globalLimiter, strictLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { triggerReminderJobManually } from './jobs/dailyReminderCron.js';
import remindersRouter from './routes/reminders.js';
import appointmentsRouter from './routes/appointments.js';
import settingsRouter from './routes/settings.js';
import publicRouter from './routes/public.js';
import uploadRouter from './routes/upload.js';
import authRouter from './routes/auth.js';
import customersRouter from './routes/customers.js';
import logger from './utils/logger.js';
import type { ApiResponse } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy - Required when behind reverse proxy (nginx)
// This allows Express to trust X-Forwarded-* headers from nginx
// We trust only the first proxy (nginx) in the chain
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
  'https://sphyrawellnesslab.duckdns.org',  // Public DuckDNS domain
];

// NOTE: In production, this backend accepts HTTPS connections from:
// 1. Origins in ALLOWED_ORIGINS env var (if set)
// 2. Private network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) over HTTPS
// To restrict to specific IPs only, set ALLOWED_PRIVATE_IPS env var with comma-separated IP addresses
// Example: ALLOWED_PRIVATE_IPS=192.168.1.95,192.168.1.100

// Whitelist specific private IPs if configured
const allowedPrivateIPs = process.env.ALLOWED_PRIVATE_IPS?.split(',').map(ip => ip.trim()) || [];

/**
 * Helper function to check if an origin is from a private network
 * Returns true for origins with private IP addresses
 */
const isPrivateNetworkOrigin = (origin: string): boolean => {
  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // Allow sphyra.local domain
    if (hostname === 'sphyra.local') return true;

    // Check if hostname is an IP address
    const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!ipMatch) return false;

    const [, first, second] = ipMatch.map(Number);

    // Private network ranges:
    // 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
    if (first === 10) return true;

    // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255) - Docker default
    if (first === 172 && second >= 16 && second <= 31) return true;

    // 192.168.0.0/16 (192.168.0.0 - 192.168.255.255) - Most common private network
    if (first === 192 && second === 168) return true;

    // Localhost
    if (first === 127) return true;

    return false;
  } catch (error) {
    return false;
  }
};

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is in the explicit whitelist
    if (allowedOrigins.indexOf(origin) !== -1) {
      logger.info(`✅ CORS allowed (whitelist): ${origin}`);
      callback(null, true);
      return;
    }

    // In production, check if origin is from private network with HTTPS
    if (!isDevelopment) {
      const url = new URL(origin);
      if (url.protocol === 'https:' && isPrivateNetworkOrigin(origin)) {
        // If ALLOWED_PRIVATE_IPS is set, check if hostname is in the whitelist
        if (allowedPrivateIPs.length > 0) {
          const hostname = url.hostname;
          if (allowedPrivateIPs.includes(hostname)) {
            logger.info(`✅ CORS allowed (whitelisted private IP): ${origin}`);
            callback(null, true);
            return;
          } else {
            logger.warn(`❌ CORS blocked (private IP not in whitelist): ${origin}`);
            logger.warn(`   Whitelisted IPs: ${allowedPrivateIPs.join(', ')}`);
            callback(new Error('Private IP not in whitelist'));
            return;
          }
        }

        // If no whitelist is set, allow all private network IPs over HTTPS
        logger.info(`✅ CORS allowed (private network HTTPS): ${origin}`);
        logger.warn(`⚠️  No ALLOWED_PRIVATE_IPS whitelist configured - accepting all private IPs`);
        callback(null, true);
        return;
      }
    }

    // Reject all other origins
    logger.warn(`❌ CORS blocked request from origin: ${origin}`);
    logger.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
    logger.warn(`   Private network HTTPS origins are also allowed in production`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 10 minutes
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Apply global rate limiting to all routes
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
      uptime: process.uptime()
    }
  };
  res.json(response);
});

// API Routes
// Auth endpoint for JWT token generation (public, no authentication required)
app.use('/api/auth', authRouter);
// Note: Appointments router handles its own authentication selectively
// to keep confirmation endpoints public
app.use('/api/reminders', remindersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/public', publicRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/customers', customersRouter);

// Manual trigger for testing (now with strict rate limiting)
app.post('/api/trigger-reminders', strictLimiter, async (req, res) => {
  try {
    logger.info(`🔧 Manual reminder trigger requested`);
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
        auth: '/api/auth',
        reminders: '/api/reminders',
        appointments: '/api/appointments',
        settings: '/api/settings',
        public: '/api/public',
        upload: '/api/upload',
        customers: '/api/customers'
      }
    },
    message: 'Welcome to Sphyra Wellness Lab API'
  };
  res.json(response);
});

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
