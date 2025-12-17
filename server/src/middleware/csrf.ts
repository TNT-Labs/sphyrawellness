import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import type { ApiResponse } from '../types/index.js';

// Store CSRF tokens in memory (for a production app, use Redis or similar)
const csrfTokens = new Map<string, number>();

// Token expiry time (15 minutes)
const TOKEN_EXPIRY = 15 * 60 * 1000;

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of csrfTokens.entries()) {
    if (expiry < now) {
      csrfTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(token, Date.now() + TOKEN_EXPIRY);
  return token;
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(token: string): boolean {
  const expiry = csrfTokens.get(token);
  if (!expiry) {
    return false;
  }

  if (expiry < Date.now()) {
    csrfTokens.delete(token);
    return false;
  }

  return true;
}

/**
 * Middleware to verify CSRF token for state-changing operations
 * Checks for X-CSRF-Token header
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

  // Get token from header
  const token = req.headers['x-csrf-token'] as string;

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
