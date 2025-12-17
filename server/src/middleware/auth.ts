import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { ApiResponse } from '../types/index.js';

// Use environment variable for JWT secret - REQUIRED for security
// In development, allow auto-generated secret for convenience
// In production, MUST be set via environment variable
const isDevelopment = process.env.NODE_ENV !== 'production';

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (isDevelopment) {
    // Generate a temporary JWT secret for development
    // This changes on each server restart, which is acceptable for dev
    JWT_SECRET = 'dev-secret-' + Date.now() + '-' + Math.random().toString(36);
    console.warn('⚠️  WARNING: Using auto-generated JWT_SECRET for development');
    console.warn('⚠️  This secret will change on server restart!');
    console.warn('⚠️  For production, set JWT_SECRET in .env file');
    console.warn('⚠️  Example: JWT_SECRET=$(openssl rand -base64 32)');
  } else {
    // In production, JWT_SECRET is REQUIRED
    console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
    console.error('   Please add JWT_SECRET to your .env file with a secure random value.');
    console.error('   Example: JWT_SECRET=$(openssl rand -base64 32)');
    process.exit(1);
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Middleware to verify JWT token
 */
export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    const response: ApiResponse = {
      success: false,
      error: 'Authentication required'
    };
    return res.status(401).json(response);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET!);
    const user = decoded as unknown as { id: string; role: string };
    req.user = user;
    next();
  } catch {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid or expired token'
    };
    return res.status(403).json(response);
  }
}
