import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '../types/index.js';

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
  console.error('❌ Unhandled error:', error);

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
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  };

  res.status(404).json(response);
}
