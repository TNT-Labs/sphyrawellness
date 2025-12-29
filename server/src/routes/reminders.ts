import { Router } from 'express';
import { reminderRepository } from '../repositories/reminderRepository.js';
import reminderServicePrisma from '../services/reminderServicePrisma.js';
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
    console.error('Error sending reminder:', error);
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
    console.error('Error sending all reminders:', error);
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

// ============================================
// MOBILE APP ENDPOINTS
// ============================================

// GET /api/reminders/mobile/pending - Get pending SMS reminders for mobile app
router.get('/mobile/pending', async (req, res, next) => {
  try {
    // Get appointments needing reminders with full details
    const appointments = await reminderServicePrisma.getAppointmentsNeedingReminders();

    // Transform to mobile-friendly format with SMS message
    const pendingReminders = appointments
      .filter(apt => apt.customer.smsReminderConsent && apt.customer.phone)
      .map(apt => ({
        appointment: {
          id: apt.id,
          customerId: apt.customerId,
          serviceId: apt.serviceId,
          staffId: apt.staffId,
          date: apt.date.toISOString().split('T')[0],
          startTime: typeof apt.startTime === 'string' ? apt.startTime : apt.startTime.toISOString().split('T')[1].substring(0, 5),
          endTime: typeof apt.endTime === 'string' ? apt.endTime : apt.endTime.toISOString().split('T')[1].substring(0, 5),
          status: apt.status,
          reminderSent: apt.reminderSent,
          customer: {
            id: apt.customer.id,
            firstName: apt.customer.firstName,
            lastName: apt.customer.lastName,
            phone: apt.customer.phone,
            email: apt.customer.email,
            smsReminderConsent: apt.customer.smsReminderConsent,
          },
          service: {
            id: apt.service.id,
            name: apt.service.name,
            price: Number(apt.service.price),
            duration: apt.service.duration,
          },
          staff: {
            id: apt.staff.id,
            firstName: apt.staff.firstName,
            lastName: apt.staff.lastName,
          },
        },
        message: generateSMSMessage(apt),
      }));

    res.json(pendingReminders);
  } catch (error) {
    console.error('Error fetching mobile pending reminders:', error);
    next(error);
  }
});

// POST /api/reminders/mobile/mark-sent - Mark reminder as sent from mobile
router.post('/mobile/mark-sent', async (req, res, next) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ error: 'appointmentId is required' });
    }

    // Create reminder record
    await reminderRepository.create({
      appointment: { connect: { id: appointmentId } },
      type: 'sms',
      scheduledFor: new Date(),
      sent: true,
      sentAt: new Date(),
    });

    // Update appointment
    await reminderServicePrisma.sendReminderForAppointment(appointmentId, 'sms');

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking reminder as sent:', error);
    next(error);
  }
});

// POST /api/reminders/mobile/mark-failed - Mark reminder as failed from mobile
router.post('/mobile/mark-failed', async (req, res, next) => {
  try {
    const { appointmentId, errorMessage } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ error: 'appointmentId is required' });
    }

    // Create failed reminder record
    await reminderRepository.create({
      appointment: { connect: { id: appointmentId } },
      type: 'sms',
      scheduledFor: new Date(),
      sent: false,
      errorMessage: errorMessage || 'SMS send failed from mobile',
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking reminder as failed:', error);
    next(error);
  }
});

/**
 * Generate SMS message for appointment reminder
 */
function generateSMSMessage(appointment: any): string {
  const { customer, service, staff, date, startTime } = appointment;

  // Format date in Italian
  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `Ciao ${customer.firstName}! Ti ricordiamo il tuo appuntamento per ${service.name} ${dateStr} alle ${startTime} con ${staff.firstName} ${staff.lastName}. A presto! - Sphyra Wellness`;
}

export default router;
