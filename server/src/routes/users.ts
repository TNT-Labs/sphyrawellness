import { Router } from 'express';
import { userRepository } from '../repositories/userRepository.js';
import { z } from 'zod';

const router = Router();

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  role: z.enum(['RESPONSABILE', 'UTENTE']),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

const updateUserSchema = z.object({
  role: z.enum(['RESPONSABILE', 'UTENTE']).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(), // Optional for admin password reset
  newPassword: z.string().min(6),
});

// GET /api/users - Get all users
router.get('/', async (req, res, next) => {
  try {
    const { active } = req.query;

    let users;
    if (active === 'true') {
      users = await userRepository.findActive();
    } else {
      users = await userRepository.findAll();
    }

    // Remove password hashes
    const usersWithoutPassword = users.map(({ passwordHash, ...user }) => user);

    res.json(usersWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userRepository.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// POST /api/users - Create new user
router.post('/', async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);

    // Check if username already exists
    const existingUser = await userRepository.findByUsername(data.username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const user = await userRepository.create(data);

    const { passwordHash, ...userWithoutPassword } = user;

    res.status(201).json(userWithoutPassword);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const existing = await userRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await userRepository.update(id, data);

    const { passwordHash, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// PATCH /api/users/:id/password - Change password
router.patch('/:id/password', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await userRepository.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password only if provided (admin reset doesn't require it)
    if (currentPassword) {
      const isValid = await userRepository.verifyPassword(user, currentPassword);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    await userRepository.updatePassword(id, newPassword);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await userRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting yourself (optional - require user from JWT)
    // const currentUserId = (req as any).user?.id;
    // if (id === currentUserId) {
    //   return res.status(409).json({ error: 'Cannot delete yourself' });
    // }

    await userRepository.delete(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
