import { Router } from 'express';
import { reminderRepository } from '../repositories/reminderRepository.js';
import { z } from 'zod';

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

    // TODO: Implement actual sending logic with emailService/smsService
    // For now, just mark as sent
    const updated = await reminderRepository.markAsSent(id);

    res.json(updated);
  } catch (error) {
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
