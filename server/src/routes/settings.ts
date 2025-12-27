import { Router } from 'express';
import { settingRepository } from '../repositories/settingRepository.js';
import { z } from 'zod';

const router = Router();

const updateSettingsSchema = z.record(z.any());

// GET /api/settings - Get all settings as object
router.get('/', async (req, res, next) => {
  try {
    const settings = await settingRepository.getAllAsObject();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings - Bulk update settings
router.put('/', async (req, res, next) => {
  try {
    const data = updateSettingsSchema.parse(req.body);

    const settingsArray = Object.entries(data).map(([key, value]) => ({
      key,
      value,
    }));

    const userId = (req as any).user?.id; // From JWT middleware

    await settingRepository.bulkUpdate(settingsArray, userId);

    const updated = await settingRepository.getAllAsObject();

    res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// GET /api/settings/:key - Get single setting
router.get('/:key', async (req, res, next) => {
  try {
    const { key } = req.params;

    const setting = await settingRepository.findByKey(key);

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(setting);
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/:key - Update single setting
router.put('/:key', async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const userId = (req as any).user?.id;

    const setting = await settingRepository.upsert(key, value, userId);

    res.json(setting);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/settings/:key - Delete setting
router.delete('/:key', async (req, res, next) => {
  try {
    const { key } = req.params;

    const existing = await settingRepository.findByKey(key);
    if (!existing) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    await settingRepository.delete(key);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
