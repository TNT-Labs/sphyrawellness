import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import type { ApiResponse } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * CSRF Protection using HMAC-signed tokens
 *
 * This implementation is stateless and scalable - no in-memory storage required.
 * Tokens are signed with HMAC and contain timestamp, making them self-validating.
 * Works in distributed environments (clusters, multiple servers).
 */

// Token expiry time (15 minutes)
const TOKEN_EXPIRY = 15 * 60 * 1000;

// CSRF secret - should be set via environment variable in production
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');

if (!process.env.CSRF_SECRET && process.env.NODE_ENV === 'production') {
  logger.warn('⚠️  WARNING: CSRF_SECRET not set in production. Using random secret.');
  logger.warn('⚠️  This will invalidate tokens on server restart.');
  logger.warn('⚠️  Set CSRF_SECRET in .env for persistent token validation.');
}

/**
 * Generate HMAC signature for token
 */
function signToken(token: string, timestamp: number): string {
  const hmac = crypto.createHmac('sha256', CSRF_SECRET);
  hmac.update(`${token}:${timestamp}`);
  return hmac.digest('hex');
}

/**
 * Verify HMAC signature
 */
function verifyToken(token: string, timestamp: number, signature: string): boolean {
  const expectedSignature = signToken(token, timestamp);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Generate a new CSRF token
 * Format: randomToken:timestamp:signature
 */
export function generateCsrfToken(): string {
  const randomToken = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now();
  const signature = signToken(randomToken, timestamp);

  return `${randomToken}:${timestamp}:${signature}`;
}

/**
 * Validate a CSRF token
 * Checks signature and expiry without needing storage
 */
export function validateCsrfToken(token: string): boolean {
  try {
    const parts = token.split(':');

    if (parts.length !== 3) {
      logger.debug('Invalid CSRF token format');
      return false;
    }

    const [randomToken, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) {
      logger.debug('Invalid timestamp in CSRF token');
      return false;
    }

    // Check expiry
    if (Date.now() - timestamp > TOKEN_EXPIRY) {
      logger.debug('CSRF token expired');
      return false;
    }

    // Verify signature
    if (!verifyToken(randomToken, timestamp, signature)) {
      logger.debug('Invalid CSRF token signature');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error validating CSRF token:', error);
    return false;
  }
}

/**
 * Middleware to verify CSRF token for state-changing operations
 * Checks for X-CSRF-Token header or _csrf field in body/form
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Allow GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get token from header or body/form field
  // Header takes precedence (for JSON requests)
  // Body field is used for multipart/form-data uploads
  const token = (req.headers['x-csrf-token'] as string) || req.body?._csrf;

  if (!token) {
    const response: ApiResponse = {
      success: false,
      error: 'CSRF token missing'
    };
    res.status(403).json(response);
    return;
  }

  if (!validateCsrfToken(token)) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid or expired CSRF token'
    };
    res.status(403).json(response);
    return;
  }

  next();
}

/**
 * Middleware to attach CSRF token to response headers
 * Frontend should read this and include it in subsequent requests
 */
export function attachCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = generateCsrfToken();
  res.setHeader('X-CSRF-Token', token);
  next();
}
