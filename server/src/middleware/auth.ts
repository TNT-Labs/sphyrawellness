import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { ApiResponse } from '../types/index.js';

// Use environment variable for JWT secret - REQUIRED for security
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
  console.error('   Please add JWT_SECRET to your .env file with a secure random value.');
  console.error('   Example: JWT_SECRET=$(openssl rand -base64 32)');
  process.exit(1);
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
    const user = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
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
