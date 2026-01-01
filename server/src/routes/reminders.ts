import { Router } from 'express';
import { reminderRepository } from '../repositories/reminderRepository.js';
import reminderServicePrisma from '../services/reminderServicePrisma.js';
import { prisma } from '../lib/prisma.js';
import type { Appointment, Customer, Service, Staff, AppointmentStatus } from '@prisma/client';
import { z } from 'zod';

const router = Router();

// Type for appointment with relations
type AppointmentWithRelations = Appointment & {
  customer: Customer;
  service: Service;
  staff: Staff;
};

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
    // Calculate time window: now to +24 hours
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    console.log(`📱 Mobile app: Looking for appointments from ${now.toISOString()} to ${next24Hours.toISOString()}`);

    // Get all appointments within the next 24 hours
    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: now,
          lte: next24Hours,
        },
        status: {
          in: ['scheduled', 'confirmed'] as AppointmentStatus[]
        },
        reminderSent: false,
      },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log(`📱 Found ${appointments.length} appointments in next 24 hours`);

    // Transform to mobile-friendly format with SMS message
    const pendingReminders = appointments
      .filter((apt: AppointmentWithRelations) => apt.customer.smsReminderConsent && apt.customer.phone)
      .map((apt: AppointmentWithRelations) => ({
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
          appointmentDate: apt.date.toISOString(), // Full ISO date for logging
          customer: {
            id: apt.customer.id,
            name: `${apt.customer.firstName} ${apt.customer.lastName}`,
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

    console.log(`📱 Returning ${pendingReminders.length} reminders to mobile app (after GDPR filter)`);

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
function generateSMSMessage(appointment: AppointmentWithRelations): string {
  const { customer, service, staff, date, startTime } = appointment;

  // Format date in Italian (without UTC references)
  const dateObj = new Date(date);
  const days = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const months = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

  const weekday = days[dateObj.getDay()];
  const day = dateObj.getDate();
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  const dateStr = `${weekday} ${day} ${month} ${year}`;

  // Format time (handle both string and Date object)
  const timeStr = typeof startTime === 'string'
    ? startTime
    : startTime.toISOString().split('T')[1].substring(0, 5);

  return `Ciao ${customer.firstName}! Ti ricordiamo il tuo appuntamento per ${service.name} ${dateStr} alle ${timeStr} con ${staff.firstName} ${staff.lastName}. A presto! - Sphyra Wellness Lab`;
}

export default router;
