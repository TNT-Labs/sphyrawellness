import { Router } from 'express';
import { serviceRepository } from '../repositories/serviceRepository.js';
import { staffRepository } from '../repositories/staffRepository.js';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { settingsRepository } from '../repositories/settingsRepository.js';
import reminderServicePrisma from '../services/reminderServicePrisma.js';
import emailService from '../services/emailService.js';
import calendarService from '../services/calendarService.js';
import { publicBookingLimiter } from '../middleware/rateLimiter.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { startOfDay, endOfDay, setHours, setMinutes, addMinutes, format as formatDate, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { logger } from '../utils/logger.js';

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

// Schema for new public booking (flat structure from frontend)
const createPublicBookingSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  startTime: z.string(), // HH:mm
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  notes: z.string().optional(),
  privacyConsent: z.boolean().refine((val) => val === true, {
    message: 'Privacy consent is required',
  }),
  emailReminderConsent: z.boolean().optional(),
  smsReminderConsent: z.boolean().optional(),
  healthDataConsent: z.boolean().optional(),
});

// GET /api/public/services - Get available services
router.get('/services', async (req, res, next) => {
  try {
    const services = await serviceRepository.findAll();

    // Filter only active services with active categories
    const activeServices = services.filter(
      (s) => !s.categoryId || (s.category && s.category.isActive)
    );

    // Get unique categories from active services
    const categoryMap = new Map();
    activeServices.forEach((service) => {
      if (service.category && !categoryMap.has(service.category.id)) {
        categoryMap.set(service.category.id, service.category);
      }
    });
    const categories = Array.from(categoryMap.values());

    // Return in expected format
    res.json({
      success: true,
      data: {
        services: activeServices,
        categories: categories,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/public/staff - Get available staff
router.get('/staff', async (req, res, next) => {
  try {
    const { serviceId } = req.query;

    const staff = await staffRepository.findActive();

    // NOTE: Staff filtering by service specialization not yet implemented
    // Future enhancement: Filter staff based on their specializations matching the requested service
    // For now, return all active staff (frontend handles staff selection based on availability)

    res.json(staff);
  } catch (error) {
    next(error);
  }
});

// GET /api/public/available-slots - Get available time slots for a service on a specific date
router.get('/available-slots', async (req, res, next) => {
  try {
    const { serviceId, date } = req.query;

    if (!serviceId || !date) {
      return res.status(400).json({
        success: false,
        error: 'serviceId and date are required'
      });
    }

    // Get service to know duration
    const service = await serviceRepository.findById(serviceId as string);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    // Load business hours from database
    const businessHours = await settingsRepository.getBusinessHours();

    // Determine day of week from date (0 = Sunday, 1 = Monday, etc.)
    const appointmentDate = new Date(date as string);
    const dayIndex = getDay(appointmentDate);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayOfWeek = dayNames[dayIndex];

    // Get schedule for this day
    const schedule = businessHours[dayOfWeek];

    // If day is closed, return empty slots
    if (!schedule.enabled) {
      return res.json({
        success: true,
        data: {
          slots: []
        }
      });
    }

    // Get all active staff
    const allStaff = await staffRepository.findAll();
    const activeStaff = allStaff.filter(s => s.isActive);

    if (activeStaff.length === 0) {
      return res.json({
        success: true,
        data: {
          slots: []
        }
      });
    }

    const allSlots = new Map(); // Use Map to track unique time slots

    // Helper function to parse HH:mm time string to { hours, minutes }
    const parseTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return { hours, minutes };
    };

    // Generate time periods based on schedule type
    const timePeriods: Array<{ start: string; end: string }> = [];
    if (schedule.type === 'continuous') {
      timePeriods.push(schedule.morning);
    } else {
      timePeriods.push(schedule.morning);
      if (schedule.afternoon) {
        timePeriods.push(schedule.afternoon);
      }
    }

    // For each staff member, get their available slots
    for (const staff of activeStaff) {
      const appointments = await appointmentRepository.findByStaff(
        staff.id,
        startOfDay(appointmentDate),
        endOfDay(appointmentDate)
      );

      const slotInterval = 30; // minutes

      // Generate slots for each time period
      for (const period of timePeriods) {
        const periodStart = parseTime(period.start);
        const periodEnd = parseTime(period.end);

        // Convert to minutes from midnight for easier iteration
        const startMinutes = periodStart.hours * 60 + periodStart.minutes;
        const endMinutes = periodEnd.hours * 60 + periodEnd.minutes;

        for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += slotInterval) {
          const hour = Math.floor(currentMinutes / 60);
          const minute = currentMinutes % 60;

          const slotStart = setMinutes(setHours(appointmentDate, hour), minute);
          const slotEnd = addMinutes(slotStart, service.duration);

          // Check if slot end is within the current period
          const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
          if (slotEndMinutes > endMinutes) {
            continue; // Skip this slot if it extends beyond the period
          }

          // Check if slot conflicts with existing appointments for this staff
          const hasConflict = appointments.some((apt) => {
            // Extract HH:mm from ISO datetime strings (e.g., "1970-01-01T09:00:00.000Z" -> "09:00")
            const aptStartDate = new Date(apt.startTime);
            const aptEndDate = new Date(apt.endTime);
            const aptStartHours = aptStartDate.getUTCHours();
            const aptStartMinutes = aptStartDate.getUTCMinutes();
            const aptEndHours = aptEndDate.getUTCHours();
            const aptEndMinutes = aptEndDate.getUTCMinutes();

            // Convert to minutes from midnight for easier comparison
            const aptStartMins = aptStartHours * 60 + aptStartMinutes;
            const aptEndMins = aptEndHours * 60 + aptEndMinutes;
            const slotStartMins = slotStart.getHours() * 60 + slotStart.getMinutes();
            const slotEndMins = slotEnd.getHours() * 60 + slotEnd.getMinutes();

            // Check for overlap: slots overlap if one starts before the other ends
            return (
              (slotStartMins >= aptStartMins && slotStartMins < aptEndMins) ||
              (slotEndMins > aptStartMins && slotEndMins <= aptEndMins) ||
              (slotStartMins <= aptStartMins && slotEndMins >= aptEndMins)
            );
          });

          if (!hasConflict) {
            const timeKey = slotStart.toTimeString().substring(0, 5);
            if (!allSlots.has(timeKey)) {
              allSlots.set(timeKey, {
                startTime: timeKey,
                endTime: slotEnd.toTimeString().substring(0, 5),
                availableStaff: []
              });
            }
            allSlots.get(timeKey).availableStaff.push({
              id: staff.id,
              name: `${staff.firstName} ${staff.lastName}`
            });
          }
        }
      }
    }

    // Convert Map to sorted array and format for frontend
    const slots = Array.from(allSlots.values())
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map(slot => ({
        time: slot.startTime, // Frontend expects "time" not "startTime"
        available: true, // If in the list, it's available
        staffId: slot.availableStaff[0]?.id, // Use first available staff
        // Include all available staff for reference
        availableStaff: slot.availableStaff
      }));

    res.json({
      success: true,
      data: {
        slots
      }
    });
  } catch (error) {
    logger.error('Error getting available slots:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
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

    // Load business hours from database
    const businessHours = await settingsRepository.getBusinessHours();

    // Determine day of week from date
    const appointmentDate = new Date(date);
    const dayIndex = getDay(appointmentDate);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayOfWeek = dayNames[dayIndex];

    // Get schedule for this day
    const schedule = businessHours[dayOfWeek];

    // If day is closed, return empty slots
    if (!schedule.enabled) {
      return res.json({ availableSlots: [] });
    }

    // Get staff appointments for that day
    const appointments = await appointmentRepository.findByStaff(
      staffId,
      startOfDay(appointmentDate),
      endOfDay(appointmentDate)
    );

    // Generate time periods based on schedule type
    const timePeriods: Array<{ start: string; end: string }> = [];
    if (schedule.type === 'continuous') {
      timePeriods.push(schedule.morning);
    } else {
      timePeriods.push(schedule.morning);
      if (schedule.afternoon) {
        timePeriods.push(schedule.afternoon);
      }
    }

    // Helper function to parse HH:mm time string
    const parseTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return { hours, minutes };
    };

    const slots = [];
    const slotInterval = 30; // minutes

    // Generate slots for each time period
    for (const period of timePeriods) {
      const periodStart = parseTime(period.start);
      const periodEnd = parseTime(period.end);

      // Convert to minutes from midnight
      const startMinutes = periodStart.hours * 60 + periodStart.minutes;
      const endMinutes = periodEnd.hours * 60 + periodEnd.minutes;

      for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += slotInterval) {
        const hour = Math.floor(currentMinutes / 60);
        const minute = currentMinutes % 60;
        const slotStart = setMinutes(setHours(appointmentDate, hour), minute);
        const slotEnd = addMinutes(slotStart, service.duration);

        // Check if slot end is within the current period
        const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
        if (slotEndMinutes > endMinutes) {
          continue; // Skip this slot if it extends beyond the period
        }

        // Check if slot conflicts with existing appointments
        const hasConflict = appointments.some((apt) => {
          // Extract time from ISO datetime strings
          const aptStartDate = new Date(apt.startTime);
          const aptEndDate = new Date(apt.endTime);
          const aptStartHours = aptStartDate.getUTCHours();
          const aptStartMinutes = aptStartDate.getUTCMinutes();
          const aptEndHours = aptEndDate.getUTCHours();
          const aptEndMinutes = aptEndDate.getUTCMinutes();

          // Convert to minutes from midnight
          const aptStartMins = aptStartHours * 60 + aptStartMinutes;
          const aptEndMins = aptEndHours * 60 + aptEndMinutes;
          const slotStartMins = slotStart.getHours() * 60 + slotStart.getMinutes();
          const slotEndMins = slotEnd.getHours() * 60 + slotEnd.getMinutes();

          // Check for overlap
          return (
            (slotStartMins >= aptStartMins && slotStartMins < aptEndMins) ||
            (slotEndMins > aptStartMins && slotEndMins <= aptEndMins) ||
            (slotStartMins <= aptStartMins && slotEndMins >= aptEndMins)
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

// POST /api/public/appointments - Create public appointment (with rate limiting to prevent spam)
router.post('/appointments', publicBookingLimiter, async (req, res, next) => {
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

    // Parse start time and calculate end time (standardized method using date-fns)
    const [startHours, startMinutes] = data.startTime.split(':').map(Number);
    const dateObj = new Date(data.date);
    const startTimeDate = setMinutes(setHours(new Date(), startHours), startMinutes);
    const endTimeDate = addMinutes(startTimeDate, service.duration);

    // Create ISO time strings for database storage
    const startTime = new Date(`1970-01-01T${data.startTime}:00.000Z`);
    const endTimeStr = `${String(endTimeDate.getHours()).padStart(2, '0')}:${String(endTimeDate.getMinutes()).padStart(2, '0')}`;
    const endTimeObj = new Date(`1970-01-01T${endTimeStr}:00.000Z`);

    // Create appointment with atomic conflict check (prevents race conditions)
    const appointment = await appointmentRepository.createWithConflictCheck(
      {
        customer: { connect: { id: customer.id } },
        service: { connect: { id: data.serviceId } },
        staff: { connect: { id: data.staffId } },
        date: dateObj,
        startTime,
        endTime: endTimeObj,
        status: 'scheduled',
      },
      data.staffId,
      dateObj,
      startTime,
      endTimeObj
    );

    // Generate confirmation token (so customer can confirm later)
    const confirmationToken = uuidv4() + uuidv4(); // 2 UUIDs for extra security
    const confirmationTokenHash = await bcrypt.hash(confirmationToken, 12);
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 48); // Token valid for 48 hours

    // Update appointment with confirmation token
    await appointmentRepository.update(appointment.id, {
      confirmationTokenHash,
      tokenExpiresAt,
    });

    // Send confirmation email (async, non-blocking)
    try {
      const staff = await staffRepository.findById(data.staffId);

      if (staff && customer.email) {
        // Generate ICS calendar file
        const icsContent = calendarService.generateICS({
          appointment: {
            id: appointment.id,
            date: data.date,
            startTime: data.startTime,
            endTime: endTimeStr
          } as any,
          customer: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email
          } as any,
          service: {
            name: service.name,
            duration: service.duration
          } as any,
          staff: {
            firstName: staff.firstName,
            lastName: staff.lastName
          } as any
        });

        // Generate confirmation link using both ID and token
        const confirmationLink = process.env.FRONTEND_URL
          ? `${process.env.FRONTEND_URL}/confirm-appointment?id=${appointment.id}&token=${confirmationToken}`
          : undefined;

        // Send confirmation email
        const emailResult = await emailService.sendAppointmentConfirmation(customer.email, {
          customerName: `${customer.firstName} ${customer.lastName}`,
          appointmentDate: formatDate(new Date(data.date), 'EEEE d MMMM yyyy', { locale: it }),
          appointmentTime: data.startTime,
          serviceName: service.name,
          staffName: `${staff.firstName} ${staff.lastName}`,
          confirmationLink,
          icsContent
        });

        if (emailResult.success) {
          logger.info(`✅ Confirmation email sent to ${customer.email}`);
        } else {
          logger.error(`⚠️ Failed to send confirmation email: ${emailResult.error}`);
        }
      }
    } catch (emailError) {
      // Log error but don't fail the appointment creation
      logger.error('⚠️ Error sending confirmation email:', emailError);
    }

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

// POST /api/public/bookings - Create public booking (new format from frontend, with rate limiting)
router.post('/bookings', publicBookingLimiter, async (req, res, next) => {
  try {
    const data = createPublicBookingSchema.parse(req.body);

    // 1. Get service for duration
    const service = await serviceRepository.findById(data.serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    // 2. Find available staff for the selected time slot
    const allStaff = await staffRepository.findAll();
    const activeStaff = allStaff.filter(s => s.isActive);

    if (activeStaff.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'No staff available'
      });
    }

    // Calculate time slot details
    const appointmentDate = new Date(data.date);
    const [hours, minutes] = data.startTime.split(':').map(Number);
    const slotStart = setMinutes(setHours(new Date(), hours), minutes);
    const slotEnd = addMinutes(slotStart, service.duration);

    // Find first available staff member for this time slot
    let availableStaffId: string | null = null;

    for (const staff of activeStaff) {
      // Get staff appointments for the day
      const appointments = await appointmentRepository.findByStaff(
        staff.id,
        startOfDay(appointmentDate),
        endOfDay(appointmentDate)
      );

      // Check if this time slot conflicts with any appointment
      const hasConflict = appointments.some((apt) => {
        const aptStartDate = new Date(apt.startTime);
        const aptEndDate = new Date(apt.endTime);
        const aptStartHours = aptStartDate.getUTCHours();
        const aptStartMinutes = aptStartDate.getUTCMinutes();
        const aptEndHours = aptEndDate.getUTCHours();
        const aptEndMinutes = aptEndDate.getUTCMinutes();

        const aptStartMins = aptStartHours * 60 + aptStartMinutes;
        const aptEndMins = aptEndHours * 60 + aptEndMinutes;
        const slotStartMins = hours * 60 + minutes;
        const slotEndMins = slotEnd.getHours() * 60 + slotEnd.getMinutes();

        return (
          (slotStartMins >= aptStartMins && slotStartMins < aptEndMins) ||
          (slotEndMins > aptStartMins && slotEndMins <= aptEndMins) ||
          (slotStartMins <= aptStartMins && slotEndMins >= aptEndMins)
        );
      });

      if (!hasConflict) {
        availableStaffId = staff.id;
        break; // Found available staff
      }
    }

    if (!availableStaffId) {
      return res.status(409).json({
        success: false,
        error: 'Time slot is no longer available. Please choose another time.'
      });
    }

    // 3. Check if customer exists by email or phone
    let customer = await customerRepository.findByEmail(data.email);

    if (!customer) {
      customer = await customerRepository.findByPhone(data.phone);
    }

    // 4. Create or update customer with GDPR consents
    const now = new Date();
    if (!customer) {
      customer = await customerRepository.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        privacyConsent: data.privacyConsent,
        privacyConsentDate: now,
        privacyConsentVersion: '1.0',
        emailReminderConsent: data.emailReminderConsent || false,
        emailReminderConsentDate: data.emailReminderConsent ? now : undefined,
        smsReminderConsent: data.smsReminderConsent || false,
        smsReminderConsentDate: data.smsReminderConsent ? now : undefined,
        healthDataConsent: data.healthDataConsent || false,
        healthDataConsentDate: data.healthDataConsent ? now : undefined,
      });
    } else {
      // Update existing customer consents if needed
      const updates: any = {};

      if (data.emailReminderConsent && !customer.emailReminderConsent) {
        updates.emailReminderConsent = true;
        updates.emailReminderConsentDate = now;
      }

      if (data.smsReminderConsent && !customer.smsReminderConsent) {
        updates.smsReminderConsent = true;
        updates.smsReminderConsentDate = now;
      }

      if (data.healthDataConsent && !customer.healthDataConsent) {
        updates.healthDataConsent = true;
        updates.healthDataConsentDate = now;
      }

      if (Object.keys(updates).length > 0) {
        customer = await customerRepository.update(customer.id, updates);
      }
    }

    // 5. Create appointment with ISO datetime strings (atomic operation to prevent race conditions)
    const startTimeISO = new Date(`1970-01-01T${data.startTime}:00.000Z`);
    const endTimeStr = `${String(slotEnd.getHours()).padStart(2, '0')}:${String(slotEnd.getMinutes()).padStart(2, '0')}`;
    const endTimeISO = new Date(`1970-01-01T${endTimeStr}:00.000Z`);

    const appointment = await appointmentRepository.createWithConflictCheck(
      {
        customer: { connect: { id: customer.id } },
        service: { connect: { id: data.serviceId } },
        staff: { connect: { id: availableStaffId } },
        date: appointmentDate,
        startTime: startTimeISO,
        endTime: endTimeISO,
        status: 'scheduled',
        notes: data.notes || undefined,
      },
      availableStaffId,
      appointmentDate,
      startTimeISO,
      endTimeISO
    );

    // Generate confirmation token immediately (so customer can confirm later)
    const confirmationToken = uuidv4() + uuidv4(); // 2 UUIDs for extra security
    const confirmationTokenHash = await bcrypt.hash(confirmationToken, 12);
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 48); // Token valid for 48 hours

    // Update appointment with confirmation token
    await appointmentRepository.update(appointment.id, {
      confirmationTokenHash,
      tokenExpiresAt,
    });

    logger.info(`✅ Public booking created: ${customer.firstName} ${customer.lastName} - ${service.name} on ${data.date} at ${data.startTime}`);

    // Send confirmation email (async, non-blocking)
    try {
      const staff = await staffRepository.findById(availableStaffId);

      if (staff && customer.email) {
        // Generate ICS calendar file
        const icsContent = calendarService.generateICS({
          appointment: {
            id: appointment.id,
            date: data.date,
            startTime: data.startTime,
            endTime: endTimeStr
          } as any,
          customer: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email
          } as any,
          service: {
            name: service.name,
            duration: service.duration
          } as any,
          staff: {
            firstName: staff.firstName,
            lastName: staff.lastName
          } as any
        });

        // Generate confirmation link using both ID and token
        const confirmationLink = process.env.FRONTEND_URL
          ? `${process.env.FRONTEND_URL}/confirm-appointment?id=${appointment.id}&token=${confirmationToken}`
          : undefined;

        // Send confirmation email
        const emailResult = await emailService.sendAppointmentConfirmation(customer.email, {
          customerName: `${customer.firstName} ${customer.lastName}`,
          appointmentDate: formatDate(appointmentDate, 'EEEE d MMMM yyyy', { locale: it }),
          appointmentTime: data.startTime,
          serviceName: service.name,
          staffName: `${staff.firstName} ${staff.lastName}`,
          confirmationLink,
          icsContent
        });

        if (emailResult.success) {
          logger.info(`✅ Confirmation email sent to ${customer.email}`);
        } else {
          logger.error(`⚠️ Failed to send confirmation email: ${emailResult.error}`);
        }
      }
    } catch (emailError) {
      // Log error but don't fail the appointment creation
      logger.error('⚠️ Error sending confirmation email:', emailError);
    }

    // 6. Return success response
    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: {
        appointmentId: appointment.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        serviceName: service.name,
        date: data.date,
        time: data.startTime,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    logger.error('Error creating public booking:', error);
    next(error);
  }
});

// POST /api/public/appointments/:id/confirm - Confirm appointment (Public endpoint)
router.post('/appointments/:id/confirm', async (req, res, next) => {
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

export default router;
