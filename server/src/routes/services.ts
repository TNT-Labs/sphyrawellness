import { Router } from 'express';
import {
  serviceRepository,
  serviceCategoryRepository,
} from '../repositories/serviceRepository.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createServiceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  duration: z.number().int().positive(),
  price: z.number().positive(),
  categoryId: z.string().uuid().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  imageUrl: z.string().url().optional(),
});

const updateServiceSchema = createServiceSchema.partial();

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  isActive: z.boolean().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

// ============================================================================
// SERVICES
// ============================================================================

// GET /api/services - Get all services
router.get('/', async (req, res, next) => {
  try {
    const { categoryId } = req.query;

    let services;
    if (categoryId && typeof categoryId === 'string') {
      services = await serviceRepository.findByCategory(categoryId);
    } else {
      services = await serviceRepository.findAll();
    }

    res.json(services);
  } catch (error) {
    next(error);
  }
});

// GET /api/services/:id - Get service by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const service = await serviceRepository.findById(id);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    next(error);
  }
});

// POST /api/services - Create new service
router.post('/', async (req, res, next) => {
  try {
    const data = createServiceSchema.parse(req.body);

    // Exclude categoryId from data spread (Prisma doesn't accept it)
    const { categoryId, ...restData } = data;

    const service = await serviceRepository.create({
      ...restData,
      category: categoryId ? { connect: { id: categoryId } } : undefined,
    });

    res.status(201).json(service);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// PUT /api/services/:id - Update service
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateServiceSchema.parse(req.body);

    const existing = await serviceRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Exclude categoryId from data spread (Prisma doesn't accept it)
    const { categoryId, ...restData } = data;

    const service = await serviceRepository.update(id, {
      ...restData,
      category: categoryId
        ? { connect: { id: categoryId } }
        : categoryId === null
          ? { disconnect: true }
          : undefined,
    });

    res.json(service);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// DELETE /api/services/:id - Delete service
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await serviceRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const canDelete = await serviceRepository.canDelete(id);
    if (!canDelete) {
      return res.status(409).json({
        error: 'Cannot delete service with future appointments',
      });
    }

    await serviceRepository.delete(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SERVICE CATEGORIES
// ============================================================================

// GET /api/services/categories - Get all categories
router.get('/categories/all', async (req, res, next) => {
  try {
    const { active } = req.query;

    let categories;
    if (active === 'true') {
      categories = await serviceCategoryRepository.findActive();
    } else {
      categories = await serviceCategoryRepository.findAll();
    }

    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// GET /api/services/categories/:id - Get category by ID
router.get('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await serviceCategoryRepository.findById(id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    next(error);
  }
});

// POST /api/services/categories - Create new category
router.post('/categories', async (req, res, next) => {
  try {
    const data = createCategorySchema.parse(req.body);

    const category = await serviceCategoryRepository.create(data);

    res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// PUT /api/services/categories/:id - Update category
router.put('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateCategorySchema.parse(req.body);

    const existing = await serviceCategoryRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = await serviceCategoryRepository.update(id, data);

    res.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// DELETE /api/services/categories/:id - Delete category
router.delete('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await serviceCategoryRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await serviceCategoryRepository.delete(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
