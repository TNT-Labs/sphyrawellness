import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '../types/index.js';
import logger from '../utils/logger.js';

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log full error details for debugging (server-side only)
  logger.error('Unhandled error', error, {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    body: req.body,
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
