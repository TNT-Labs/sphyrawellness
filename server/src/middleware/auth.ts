import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { ApiResponse } from '../types/index.js';
import { JWT_SECRET } from '../config/jwt.js';

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

  // Explicit check for JWT_SECRET (defense in depth - should never happen due to startup validation)
  if (!JWT_SECRET) {
    const response: ApiResponse = {
      success: false,
      error: 'Server configuration error'
    };
    return res.status(500).json(response);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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

/**
 * Middleware to check if user has required role(s)
 * Use after authenticateToken middleware
 * @param allowedRoles - Array of roles that are allowed to access the route
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required'
      };
      return res.status(401).json(response);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        error: 'Insufficient permissions'
      };
      return res.status(403).json(response);
    }

    next();
  };
}
