/**
 * HTTP Request/Response Logging Middleware
 * Logs all incoming requests and outgoing responses with detailed information
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

/**
 * Sanitize sensitive data from objects before logging
 * Removes passwords, tokens, and other sensitive fields
 */
function sanitizeSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  const sensitiveFields = [
    'password',
    'passwordHash',
    'newPassword',
    'oldPassword',
    'currentPassword',
    'token',
    'accessToken',
    'refreshToken',
    'confirmationToken',
    'confirmationTokenHash',
    'authorization',
    'apiKey',
    'secret',
    'privateKey',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (sanitized[key] && typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeSensitiveData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Middleware to log HTTP requests and responses
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log incoming request with sanitized query params
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    path: req.path,
    query: sanitizeSensitiveData(req.query),
    ip: req.ip,
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type'),
    userId: (req as any).user?.id // If authenticated
  });

  // Store original end function
  const originalEnd = res.end;

  // Override res.end to log response
  res.end = function (this: Response, chunk?: any, encoding?: any, callback?: any): Response {
    const duration = Date.now() - startTime;

    // Log outgoing response
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('Outgoing response', {
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      duration: `${duration}ms`,
      contentType: res.get('content-type'),
      contentLength: res.get('content-length'),
      userId: (req as any).user?.id
    });

    // Call original end function
    return originalEnd.call(this, chunk, encoding, callback);
  } as any;

  next();
};

/**
 * Simplified request logger that only logs basic info
 * (useful for public endpoints where you don't need full details)
 */
export const simpleRequestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (this: Response, chunk?: any, encoding?: any, callback?: any): Response {
    const duration = Date.now() - startTime;

    logger.debug(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);

    return originalEnd.call(this, chunk, encoding, callback);
  } as any;

  next();
};
