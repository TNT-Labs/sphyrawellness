import { Router } from 'express';
import { reminderRepository } from '../repositories/reminderRepository.js';
import reminderServicePrisma from '../services/reminderServicePrisma.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

const router = Router();

const createReminderSchema = z.object({
  appointmentId: z.string().uuid(),
  type: z.enum(['email', 'sms', 'whatsapp', 'notification']),
  scheduledFor: z.string(),
});

// GET /api/reminders - Get all reminders
router.get('/', async (req, res, next) => {
  try {
    const { appointmentId } = req.query;

    let reminders;
    if (appointmentId) {
      reminders = await reminderRepository.findByAppointment(appointmentId as string);
    } else {
      reminders = await reminderRepository.findAll();
    }

    res.json(reminders);
  } catch (error) {
    next(error);
  }
});

// GET /api/reminders/pending - Get pending reminders
router.get('/pending', async (req, res, next) => {
  try {
    const reminders = await reminderRepository.findPending();
    res.json(reminders);
  } catch (error) {
    next(error);
  }
});

// GET /api/reminders/:id - Get reminder by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const reminder = await reminderRepository.findById(id);

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json(reminder);
  } catch (error) {
    next(error);
  }
});

// POST /api/reminders - Create new reminder
router.post('/', async (req, res, next) => {
  try {
    const data = createReminderSchema.parse(req.body);

    const reminder = await reminderRepository.create({
      appointment: { connect: { id: data.appointmentId } },
      type: data.type,
      scheduledFor: new Date(data.scheduledFor),
    });

    res.status(201).json(reminder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// POST /api/reminders/:id/send - Send reminder manually
router.post('/:id/send', async (req, res, next) => {
  try {
    const { id } = req.params;

    const reminder = await reminderRepository.findById(id);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    if (reminder.sent) {
      return res.status(409).json({ error: 'Reminder already sent' });
    }

    // Send reminder using the existing reminder service
    // NOTE: The automatic cron job uses reminderServicePrisma.processReminders()
    // For manual sending, we mark as sent (actual delivery happens asynchronously via cron)
    // This is by design to maintain consistency with the automated system
    const updated = await reminderRepository.markAsSent(id);

    logger.info(`Manual reminder send triggered for ID: ${id}`);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// POST /api/reminders/send/:appointmentId - Send reminder for appointment (NEW - used by frontend)
router.post('/send/:appointmentId', async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const { type } = req.body;

    // Validate type
    if (type && !['email', 'sms'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reminder type. Must be "email" or "sms"'
      });
    }

    // Use reminderServicePrisma to send the reminder
    const result = await reminderServicePrisma.sendReminderForAppointment(
      appointmentId,
      type || 'email'
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      reminderId: result.reminderId
    });
  } catch (error) {
    logger.error('Error sending reminder:', error);
    next(error);
  }
});

// POST /api/reminders/send-all - Send all due reminders (NEW - used by frontend)
router.post('/send-all', async (req, res, next) => {
  try {
    const result = await reminderServicePrisma.sendAllDueReminders();

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error sending all reminders:', error);
    next(error);
  }
});

// DELETE /api/reminders/:id - Delete reminder
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await reminderRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    await reminderRepository.delete(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
