import { Router } from 'express';
import { settingRepository } from '../repositories/settingRepository.js';
import { settingsRepository } from '../repositories/settingsRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import logger from '../utils/logger.js';
import { refreshSettingsCache } from '../jobs/dailyReminderCronPrisma.js';

const router = Router();

const updateSettingsSchema = z.record(z.any());

const resetDatabaseSchema = z.object({
  confirmation: z.string(),
});

// ============================================================================
// SPECIALIZED SETTINGS ENDPOINTS (must be before parametric routes)
// ============================================================================
// Note: GET /api/settings/business-hours is public and registered in app.ts

/**
 * GET /api/settings/vacation-periods
 * Public endpoint - get vacation/holiday periods
 */
router.get('/vacation-periods', async (req, res, next) => {
  try {
    const vacationPeriods = await settingRepository.getValue('vacation_periods', []);

    res.json({
      success: true,
      data: { vacationPeriods },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/settings/vacation-periods
 * Protected endpoint - update vacation/holiday periods (admin only)
 */
router.put('/vacation-periods', async (req, res, next) => {
  try {
    const { vacationPeriods } = req.body;

    if (!Array.isArray(vacationPeriods)) {
      return res.status(400).json({
        success: false,
        error: 'Vacation periods must be an array',
      });
    }

    // Validate each period
    for (const period of vacationPeriods) {
      if (!period.id || !period.startDate || !period.endDate) {
        return res.status(400).json({
          success: false,
          error: 'Each vacation period must have id, startDate, and endDate',
        });
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(period.startDate) || !dateRegex.test(period.endDate)) {
        return res.status(400).json({
          success: false,
          error: 'Dates must be in YYYY-MM-DD format',
        });
      }

      // Validate date range
      if (new Date(period.endDate) < new Date(period.startDate)) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after start date',
        });
      }
    }

    const userId = (req as any).user?.id;

    await settingRepository.upsert('vacation_periods', vacationPeriods, userId);

    res.json({
      success: true,
      message: 'Vacation periods updated successfully',
      data: { vacationPeriods },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/settings/booking-window-days
 * Public endpoint - get number of days available for booking
 */
router.get('/booking-window-days', async (req, res, next) => {
  try {
    const bookingWindowDays = await settingRepository.getValue('booking_window_days', 90);

    res.json({
      success: true,
      data: { bookingWindowDays },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/settings/booking-window-days
 * Protected endpoint - update booking window days (admin only)
 */
router.put('/booking-window-days', async (req, res, next) => {
  try {
    const { bookingWindowDays } = req.body;

    if (typeof bookingWindowDays !== 'number' || bookingWindowDays < 1 || bookingWindowDays > 365) {
      return res.status(400).json({
        success: false,
        error: 'Booking window days must be a number between 1 and 365',
      });
    }

    const userId = (req as any).user?.id;

    await settingRepository.upsert('booking_window_days', bookingWindowDays, userId);

    res.json({
      success: true,
      message: 'Booking window days updated successfully',
      data: { bookingWindowDays },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/settings/business-hours
 * Protected endpoint - update business hours (admin only)
 */
router.put('/business-hours', async (req, res, next) => {
  try {
    const { businessHours } = req.body;

    if (!businessHours) {
      return res.status(400).json({
        success: false,
        error: 'Business hours data is required',
      });
    }

    // Validate structure
    const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of requiredDays) {
      if (!businessHours[day]) {
        return res.status(400).json({
          success: false,
          error: `Missing configuration for ${day}`,
        });
      }

      const daySchedule = businessHours[day];
      if (typeof daySchedule.enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: `Invalid enabled value for ${day}`,
        });
      }

      if (daySchedule.type !== 'continuous' && daySchedule.type !== 'split') {
        return res.status(400).json({
          success: false,
          error: `Invalid type for ${day}. Must be 'continuous' or 'split'`,
        });
      }

      if (!daySchedule.morning || !daySchedule.morning.start || !daySchedule.morning.end) {
        return res.status(400).json({
          success: false,
          error: `Missing morning hours for ${day}`,
        });
      }

      if (daySchedule.type === 'split' && (!daySchedule.afternoon || !daySchedule.afternoon.start || !daySchedule.afternoon.end)) {
        return res.status(400).json({
          success: false,
          error: `Missing afternoon hours for ${day} (type is 'split')`,
        });
      }
    }

    // Extract user ID from token if available
    const userId = (req as any).user?.id;

    const updatedBusinessHours = await settingsRepository.updateBusinessHours(businessHours, userId);

    res.json({
      success: true,
      message: 'Business hours updated successfully',
      data: { businessHours: updatedBusinessHours },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GENERIC SETTINGS ENDPOINTS
// ============================================================================

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

    // Refresh cron job settings cache if reminder-related settings were updated
    const reminderKeys = ['reminderSendHour', 'reminderSendMinute', 'enableAutoReminders'];
    if (settingsArray.some(s => reminderKeys.includes(s.key))) {
      await refreshSettingsCache();
      logger.info('Cron job settings cache refreshed after settings update');
    }

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

    // Refresh cron job settings cache if reminder-related setting was updated
    const reminderKeys = ['reminderSendHour', 'reminderSendMinute', 'enableAutoReminders'];
    if (reminderKeys.includes(key)) {
      await refreshSettingsCache();
      logger.info('Cron job settings cache refreshed after setting update', { key });
    }

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

// ============================================================================
// DANGER ZONE - DATABASE RESET
// ============================================================================

/**
 * POST /api/settings/reset-database
 * EXTREMELY DANGEROUS - Resets the entire database and creates a new admin user
 * Requires RESPONSABILE role and strong confirmation
 */
router.post('/reset-database', async (req, res, next) => {
  try {
    // Check user role
    const user = (req as any).user;
    if (!user || user.role !== UserRole.RESPONSABILE) {
      return res.status(403).json({
        success: false,
        error: 'Solo gli utenti con ruolo RESPONSABILE possono resettare il database',
      });
    }

    // Validate confirmation
    const { confirmation } = resetDatabaseSchema.parse(req.body);

    if (confirmation !== 'RESET DATABASE') {
      return res.status(400).json({
        success: false,
        error: 'Conferma non valida. Digitare esattamente "RESET DATABASE"',
      });
    }

    logger.warn(`⚠️ DATABASE RESET initiated by user: ${user.username} (${user.id})`);

    // Get admin password from environment (same as validated in security.ts)
    const adminPassword = process.env.VITE_ADMIN_INITIAL_PASSWORD;
    if (!adminPassword) {
      logger.error('❌ VITE_ADMIN_INITIAL_PASSWORD not set in environment variables');
      return res.status(500).json({
        success: false,
        error: 'Configurazione mancante: VITE_ADMIN_INITIAL_PASSWORD non impostata',
      });
    }

    // Execute database reset in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all data in correct order (respecting foreign keys)
      logger.info('🗑️ Deleting all payments...');
      await tx.payment.deleteMany({});

      logger.info('🗑️ Deleting all reminders...');
      await tx.reminder.deleteMany({});

      logger.info('🗑️ Deleting all appointments...');
      await tx.appointment.deleteMany({});

      logger.info('🗑️ Deleting all staff...');
      await tx.staff.deleteMany({});

      logger.info('🗑️ Deleting all staff roles...');
      await tx.staffRole.deleteMany({});

      logger.info('🗑️ Deleting all services...');
      await tx.service.deleteMany({});

      logger.info('🗑️ Deleting all service categories...');
      await tx.serviceCategory.deleteMany({});

      logger.info('🗑️ Deleting all customers...');
      await tx.customer.deleteMany({});

      logger.info('🗑️ Deleting all settings...');
      await tx.setting.deleteMany({});

      logger.info('🗑️ Deleting all users...');
      await tx.user.deleteMany({});

      logger.info('✅ All data deleted successfully');
    });

    // Create default admin user
    logger.info('👤 Creating default admin user...');
    const adminUser = await userRepository.create({
      username: 'admin',
      password: adminPassword,
      role: UserRole.RESPONSABILE,
      firstName: 'Admin',
      lastName: 'Sphyra',
      email: 'admin@sphyrawellness.com',
      isActive: true,
    });

    logger.info(`✅ Database reset completed. Admin user created: ${adminUser.username} (${adminUser.id})`);

    res.json({
      success: true,
      message: 'Database resettato con successo. Utente admin creato.',
      data: {
        adminUsername: adminUser.username,
        adminEmail: adminUser.email,
      },
    });
  } catch (error) {
    logger.error('❌ Database reset failed:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Errore di validazione',
        details: error.errors,
      });
    }
    next(error);
  }
});

export default router;
