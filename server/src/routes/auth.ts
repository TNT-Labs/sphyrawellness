import express from 'express';
import jwt from 'jsonwebtoken';
import { sendSuccess, sendError, handleRouteError } from '../utils/response.js';
import type { ApiResponse } from '../types/index.js';

const router = express.Router();

// Use the same JWT_SECRET as auth middleware
const isDevelopment = process.env.NODE_ENV !== 'production';
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (isDevelopment) {
    JWT_SECRET = 'dev-secret-' + Date.now() + '-' + Math.random().toString(36);
  } else {
    console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
    process.exit(1);
  }
}

/**
 * POST /api/auth/token
 * Generate JWT token for authenticated frontend users
 *
 * This endpoint is for self-hosted deployments where users have already
 * authenticated on the frontend (IndexedDB user system) and need a backend
 * JWT token for API operations like image uploads and syncing.
 *
 * Body: { userId: string, username: string, role: string }
 */
router.post('/token', async (req, res) => {
  try {
    const { userId, username, role } = req.body;

    if (!userId || !username || !role) {
      return sendError(res, 'userId, username, and role are required', 400);
    }

    // Generate JWT token valid for 30 days
    const token = jwt.sign(
      {
        id: userId,
        username,
        role
      },
      JWT_SECRET!,
      { expiresIn: '30d' }
    );

    return sendSuccess(res, { token, expiresIn: '30d' }, 'Token generated successfully');
  } catch (error) {
    console.error('Error generating token:', error);
    return handleRouteError(error, res, 'Failed to generate token');
  }
});

export default router;
