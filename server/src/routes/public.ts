import { Router } from 'express';
import { serviceRepository } from '../repositories/serviceRepository.js';
import { staffRepository } from '../repositories/staffRepository.js';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { z } from 'zod';
import { startOfDay, endOfDay, setHours, setMinutes, addMinutes } from 'date-fns';

const router = Router();

const availabilitySchema = z.object({
  serviceId: z.string().uuid(),
  staffId: z.string().uuid(),
  date: z.string(),
});

const createPublicAppointmentSchema = z.object({
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    privacyConsent: z.boolean().refine((val) => val === true, {
      message: 'Privacy consent is required',
    }),
  }),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid(),
  date: z.string(),
  startTime: z.string(), // HH:mm format
});

// GET /api/public/services - Get available services
router.get('/services', async (req, res, next) => {
  try {
    const services = await serviceRepository.findAll();

    // Filter only active services with active categories
    const activeServices = services.filter(
      (s) => s.category === null || s.category.isActive
    );

    res.json(activeServices);
  } catch (error) {
    next(error);
  }
});

// GET /api/public/staff - Get available staff
router.get('/staff', async (req, res, next) => {
  try {
    const { serviceId } = req.query;

    const staff = await staffRepository.findActive();

    // TODO: Filter by service specialization if needed
    // For now, return all active staff

    res.json(staff);
  } catch (error) {
    next(error);
  }
});

// POST /api/public/appointments/availability - Check availability
router.post('/appointments/availability', async (req, res, next) => {
  try {
    const { serviceId, staffId, date } = availabilitySchema.parse(req.body);

    // Get service to know duration
    const service = await serviceRepository.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Get staff appointments for that day
    const appointmentDate = new Date(date);
    const appointments = await appointmentRepository.findByStaff(
      staffId,
      startOfDay(appointmentDate),
      endOfDay(appointmentDate)
    );

    // Generate time slots (9:00 - 18:00, every 30 minutes)
    const slots = [];
    const workStart = 9; // 9 AM
    const workEnd = 18; // 6 PM
    const slotInterval = 30; // minutes

    for (let hour = workStart; hour < workEnd; hour++) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        const slotStart = setMinutes(setHours(appointmentDate, hour), minute);
        const slotEnd = addMinutes(slotStart, service.duration);

        // Check if slot end is within working hours
        if (slotEnd.getHours() > workEnd) {
          break;
        }

        // Check if slot conflicts with existing appointments
        const hasConflict = appointments.some((apt) => {
          const aptStart = new Date(`2000-01-01T${apt.startTime}`);
          const aptEnd = new Date(`2000-01-01T${apt.endTime}`);
          const checkStart = new Date(`2000-01-01T${slotStart.toTimeString().substring(0, 5)}`);
          const checkEnd = new Date(`2000-01-01T${slotEnd.toTimeString().substring(0, 5)}`);

          return (
            (checkStart >= aptStart && checkStart < aptEnd) ||
            (checkEnd > aptStart && checkEnd <= aptEnd) ||
            (checkStart <= aptStart && checkEnd >= aptEnd)
          );
        });

        if (!hasConflict) {
          slots.push({
            startTime: slotStart.toTimeString().substring(0, 5),
            endTime: slotEnd.toTimeString().substring(0, 5),
          });
        }
      }
    }

    res.json({ availableSlots: slots });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// POST /api/public/appointments - Create public appointment
router.post('/appointments', async (req, res, next) => {
  try {
    const data = createPublicAppointmentSchema.parse(req.body);

    // Check if customer exists by email or phone
    let customer = await customerRepository.findByEmail(data.customer.email);

    if (!customer) {
      customer = await customerRepository.findByPhone(data.customer.phone);
    }

    // Create customer if not exists
    if (!customer) {
      customer = await customerRepository.create({
        firstName: data.customer.firstName,
        lastName: data.customer.lastName,
        email: data.customer.email,
        phone: data.customer.phone,
        privacyConsent: data.customer.privacyConsent,
        privacyConsentDate: new Date(),
        privacyConsentVersion: '1.0',
      });
    }

    // Get service for duration
    const service = await serviceRepository.findById(data.serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Calculate end time
    const startTime = new Date(`2000-01-01T${data.startTime}`);
    const endTime = addMinutes(startTime, service.duration);

    // Check for conflicts
    const hasConflict = await appointmentRepository.hasConflict(
      data.staffId,
      new Date(data.date),
      startTime,
      endTime
    );

    if (hasConflict) {
      return res.status(409).json({
        error: 'Time slot no longer available',
      });
    }

    // Create appointment
    const appointment = await appointmentRepository.create({
      customer: { connect: { id: customer.id } },
      service: { connect: { id: data.serviceId } },
      staff: { connect: { id: data.staffId } },
      date: new Date(data.date),
      startTime,
      endTime: new Date(`2000-01-01T${endTime.toTimeString().substring(0, 5)}`),
      status: 'scheduled',
    });

    // TODO: Send confirmation email

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment: {
        id: appointment.id,
        date: appointment.date,
        startTime: data.startTime,
        service: service.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

export default router;
