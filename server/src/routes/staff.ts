import { Router } from 'express';
import { staffRepository, staffRoleRepository } from '../repositories/staffRepository.js';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const createStaffSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  roleId: z.string().uuid().optional(),
  specializations: z.array(z.string().uuid()).optional(), // Must be UUIDs (category IDs)
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  isActive: z.boolean().optional(),
  profileImageUrl: z.string().min(1).optional().nullable(),
});

const updateStaffSchema = createStaffSchema.partial();

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  isActive: z.boolean().optional(),
});

const updateRoleSchema = createRoleSchema.partial();

// ============================================================================
// STAFF
// ============================================================================

// GET /api/staff - Get all staff
router.get('/', async (req, res, next) => {
  try {
    const { active } = req.query;

    let staff;
    if (active === 'true') {
      staff = await staffRepository.findActive();
    } else {
      staff = await staffRepository.findAll();
    }

    res.json(staff);
  } catch (error) {
    next(error);
  }
});

// GET /api/staff/:id - Get staff by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { include } = req.query;

    let staff;
    if (include === 'appointments') {
      staff = await staffRepository.findByIdWithAppointments(id);
    } else {
      staff = await staffRepository.findById(id);
    }

    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    res.json(staff);
  } catch (error) {
    next(error);
  }
});

// POST /api/staff - Create new staff
router.post('/', async (req, res, next) => {
  try {
    const data = createStaffSchema.parse(req.body);

    // Check if email already exists
    const existingByEmail = await staffRepository.findByEmail(data.email);
    if (existingByEmail) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Exclude roleId from data spread (Prisma doesn't accept it)
    const { roleId, ...restData } = data;

    const staff = await staffRepository.create({
      ...restData,
      role: roleId ? { connect: { id: roleId } } : undefined,
    });

    res.status(201).json(staff);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// PUT /api/staff/:id - Update staff
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateStaffSchema.parse(req.body);

    const existing = await staffRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    // Check email uniqueness
    if (data.email && data.email !== existing.email) {
      const existingByEmail = await staffRepository.findByEmail(data.email);
      if (existingByEmail) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    // Exclude roleId from data spread (Prisma doesn't accept it)
    const { roleId, ...restData } = data;

    const staff = await staffRepository.update(id, {
      ...restData,
      role: roleId
        ? { connect: { id: roleId } }
        : roleId === null
          ? { disconnect: true }
          : undefined,
    });

    res.json(staff);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// DELETE /api/staff/:id - Delete staff (RESPONSABILE only)
router.delete('/:id', requireRole('RESPONSABILE'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await staffRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const canDelete = await staffRepository.canDelete(id);
    if (!canDelete) {
      return res.status(409).json({
        error: 'Cannot delete staff with future appointments',
      });
    }

    await staffRepository.delete(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// STAFF ROLES
// ============================================================================

// GET /api/staff/roles/all - Get all roles
router.get('/roles/all', async (req, res, next) => {
  try {
    const { active } = req.query;

    let roles;
    if (active === 'true') {
      roles = await staffRoleRepository.findActive();
    } else {
      roles = await staffRoleRepository.findAll();
    }

    res.json(roles);
  } catch (error) {
    next(error);
  }
});

// GET /api/staff/roles/:id - Get role by ID
router.get('/roles/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const role = await staffRoleRepository.findById(id);

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(role);
  } catch (error) {
    next(error);
  }
});

// POST /api/staff/roles - Create new role
router.post('/roles', async (req, res, next) => {
  try {
    const data = createRoleSchema.parse(req.body);
    const role = await staffRoleRepository.create(data);

    res.status(201).json(role);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// PUT /api/staff/roles/:id - Update role
router.put('/roles/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateRoleSchema.parse(req.body);

    const existing = await staffRoleRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = await staffRoleRepository.update(id, data);

    res.json(role);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// DELETE /api/staff/roles/:id - Delete role (RESPONSABILE only)
router.delete('/roles/:id', requireRole('RESPONSABILE'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await staffRoleRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Role not found' });
    }

    await staffRoleRepository.delete(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
