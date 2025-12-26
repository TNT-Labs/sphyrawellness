import { Router } from 'express';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
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

    // Check for conflicts
    const hasConflict = await appointmentRepository.hasConflict(
      data.staffId,
      new Date(data.date),
      new Date(`2000-01-01T${data.startTime}`),
      new Date(`2000-01-01T${data.endTime}`)
    );

    if (hasConflict) {
      return res.status(409).json({
        error: 'Time slot conflict with existing appointment',
      });
    }

    const appointment = await appointmentRepository.create({
      customer: { connect: { id: data.customerId } },
      service: { connect: { id: data.serviceId } },
      staff: { connect: { id: data.staffId } },
      date: new Date(data.date),
      startTime: new Date(`2000-01-01T${data.startTime}`),
      endTime: new Date(`2000-01-01T${data.endTime}`),
      status: data.status,
      notes: data.notes,
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
      const hasConflict = await appointmentRepository.hasConflict(
        data.staffId || existing.staffId,
        new Date(data.date || existing.date),
        new Date(`2000-01-01T${data.startTime || existing.startTime}`),
        new Date(`2000-01-01T${data.endTime || existing.endTime}`),
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
      ...(data.date && { date: new Date(data.date) }),
      ...(data.startTime && { startTime: new Date(`2000-01-01T${data.startTime}`) }),
      ...(data.endTime && { endTime: new Date(`2000-01-01T${data.endTime}`) }),
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

    const appointment = await appointmentRepository.findByConfirmationToken(token);

    if (!appointment || appointment.id !== id) {
      return res.status(404).json({ error: 'Invalid confirmation token' });
    }

    // Check token expiry
    if (appointment.tokenExpiresAt && new Date() > appointment.tokenExpiresAt) {
      return res.status(410).json({ error: 'Confirmation token expired' });
    }

    const confirmed = await appointmentRepository.confirm(id);

    res.json(confirmed);
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
