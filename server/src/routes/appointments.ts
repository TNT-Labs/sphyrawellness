import { Router } from 'express';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
import reminderServicePrisma from '../services/reminderServicePrisma.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const router = Router();

const createAppointmentSchema = z.object({
  customerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
  notes: z.string().optional(),
});

const updateAppointmentSchema = createAppointmentSchema.partial();

// GET /api/appointments
router.get('/', async (req, res, next) => {
  try {
    const { startDate, endDate, status, customerId, staffId, serviceId } = req.query;

    let appointments;

    if (startDate && endDate) {
      appointments = await appointmentRepository.findByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
    } else if (customerId) {
      appointments = await appointmentRepository.findByCustomer(customerId as string);
    } else if (staffId) {
      appointments = await appointmentRepository.findByStaff(staffId as string);
    } else if (serviceId) {
      appointments = await appointmentRepository.findByService(serviceId as string);
    } else if (status) {
      appointments = await appointmentRepository.findByStatus(status as any);
    } else {
      appointments = await appointmentRepository.findAll();
    }

    res.json(appointments);
  } catch (error) {
    next(error);
  }
});

// GET /api/appointments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await appointmentRepository.findById(id);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    next(error);
  }
});

// POST /api/appointments
router.post('/', async (req, res, next) => {
  try {
    const data = createAppointmentSchema.parse(req.body);

    // Create appointment with atomic conflict check (prevents race conditions)
    const dateObj = new Date(`${data.date}T12:00:00Z`);
    const startTimeObj = new Date(`1970-01-01T${data.startTime}:00Z`);
    const endTimeObj = new Date(`1970-01-01T${data.endTime}:00Z`);

    const appointment = await appointmentRepository.createWithConflictCheck(
      {
        customer: { connect: { id: data.customerId } },
        service: { connect: { id: data.serviceId } },
        staff: { connect: { id: data.staffId } },
        date: dateObj,
        startTime: startTimeObj,
        endTime: endTimeObj,
        status: data.status,
        notes: data.notes,
      },
      data.staffId,
      dateObj,
      startTimeObj,
      endTimeObj
    );

    // Generate confirmation token immediately
    const confirmationToken = uuidv4() + uuidv4();
    const confirmationTokenHash = await bcrypt.hash(confirmationToken, 12);
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 48);

    // Update appointment with confirmation token
    await appointmentRepository.update(appointment.id, {
      confirmationTokenHash,
      tokenExpiresAt,
    });

    res.status(201).json(appointment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// PUT /api/appointments/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateAppointmentSchema.parse(req.body);

    const existing = await appointmentRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check for conflicts if time changed
    if (data.staffId || data.date || data.startTime || data.endTime) {
      const dateForCheck = data.date
        ? new Date(`${data.date}T12:00:00Z`)
        : existing.date;
      const startForCheck = data.startTime
        ? new Date(`1970-01-01T${data.startTime}:00Z`)
        : existing.startTime;
      const endForCheck = data.endTime
        ? new Date(`1970-01-01T${data.endTime}:00Z`)
        : existing.endTime;

      const hasConflict = await appointmentRepository.hasConflict(
        data.staffId || existing.staffId,
        dateForCheck,
        startForCheck,
        endForCheck,
        id
      );

      if (hasConflict) {
        return res.status(409).json({
          error: 'Time slot conflict with existing appointment',
        });
      }
    }

    const appointment = await appointmentRepository.update(id, {
      ...(data.customerId && { customer: { connect: { id: data.customerId } } }),
      ...(data.serviceId && { service: { connect: { id: data.serviceId } } }),
      ...(data.staffId && { staff: { connect: { id: data.staffId } } }),
      ...(data.date && { date: new Date(`${data.date}T12:00:00Z`) }),
      ...(data.startTime && { startTime: new Date(`1970-01-01T${data.startTime}:00Z`) }),
      ...(data.endTime && { endTime: new Date(`1970-01-01T${data.endTime}:00Z`) }),
      status: data.status,
      notes: data.notes,
    });

    res.json(appointment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// PATCH /api/appointments/:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const appointment = await appointmentRepository.updateStatus(id, status);

    res.json(appointment);
  } catch (error) {
    next(error);
  }
});

// POST /api/appointments/:id/confirm (Public endpoint)
router.post('/:id/confirm', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Use reminderServicePrisma for secure hashed token validation
    const result = await reminderServicePrisma.confirmAppointment(id, token);

    if (!result.success) {
      // Map error messages to appropriate HTTP status codes
      if (result.error?.includes('not found')) {
        return res.status(404).json({ error: result.error });
      }
      if (result.error?.includes('expired')) {
        return res.status(410).json({ error: result.error });
      }
      return res.status(400).json({ error: result.error });
    }

    res.json(result.appointment);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await appointmentRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await appointmentRepository.delete(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
