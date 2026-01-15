import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Global rate limiter
 * Applies to all routes
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs (increased from 100 for normal app usage)
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip rate limiting for successful responses (optional)
  skip: (req: Request, _res: Response) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health';
  },
  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response) => {
    logger.warn(`⚠️ Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() ?? Date.now()) / 1000)
    });
  }
});

/**
 * Strict rate limiter for sensitive operations
 * Use for endpoints that send emails, modify settings, etc.
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per hour
  message: {
    success: false,
    error: 'Too many requests for this operation, please try again after 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`🚨 Strict rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded for this operation. Please try again later.',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() ?? Date.now()) / 1000)
    });
  }
});

/**
 * Very strict rate limiter for email sending
 * Prevents email spam abuse
 */
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 email sends per hour
  message: {
    success: false,
    error: 'Email rate limit exceeded. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.error(`🚨 Email rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'You have exceeded the email sending limit. Please try again in 1 hour.',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() ?? Date.now()) / 1000)
    });
  }
});

/**
 * Auth rate limiter for login attempts
 * Prevent brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many login attempts, please try again after 15 minutes.'
});
