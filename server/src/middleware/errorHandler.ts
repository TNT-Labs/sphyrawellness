import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '../types/index.js';
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
    'creditCard',
    'cvv',
    'ssn',
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
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log error details with sanitized request data (prevent sensitive data leakage)
  logger.error('Unhandled error', error, {
    method: req.method,
    url: req.url,
    path: req.path,
    query: sanitizeSensitiveData(req.query),
    body: sanitizeSensitiveData(req.body),
    userId: (req as any).user?.id
  });

  // In production, hide internal error details from clients
  // In development, show full error message for debugging
  const isProduction = process.env.NODE_ENV === 'production';

  const response: ApiResponse = {
    success: false,
    error: isProduction
      ? 'Internal server error'
      : (error.message || 'Internal server error')
  };

  res.status(500).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    url: req.url,
    ip: req.ip
  });

  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  };

  res.status(404).json(response);
}
