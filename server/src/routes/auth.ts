import { Router } from 'express';
import { userRepository } from '../repositories/userRepository.js';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authLimiter, verifyLimiter } from '../middleware/rateLimiter.js';
import { logLoginSuccess, logLoginFailure } from '../utils/auditLog.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';
import type { UserJwtPayload } from '../types/jwt.js';
import { isUserJwtPayload } from '../types/jwt.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await userRepository.authenticate(username, password);

    if (!user) {
      // Log failed login attempt
      logLoginFailure(req, username, 'Invalid credentials');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Log successful login
    logLoginSuccess(req, user.id, user.username);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    // Return token and user info (without password)
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// POST /api/auth/verify (with rate limiting to prevent timing attacks and abuse)
router.post('/verify', verifyLimiter, async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Validate JWT payload structure
      if (!isUserJwtPayload(decoded)) {
        return res.status(401).json({ error: 'Invalid token payload' });
      }

      // Get fresh user data
      const user = await userRepository.findById(decoded.id);

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      const { passwordHash, ...userWithoutPassword } = user;

      res.json({
        valid: true,
        user: userWithoutPassword,
      });
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout (Client-side only, just invalidate token)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
