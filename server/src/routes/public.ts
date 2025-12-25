import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../config/database.js';
import reminderService from '../services/reminderService.js';
import logger from '../utils/logger.js';
import { attachCsrfToken, generateCsrfToken } from '../middleware/csrf.js';
import { sendSuccess, sendError, handleRouteError } from '../utils/response.js';
import type { ApiResponse, Service, Staff, Appointment, Customer } from '../types/index.js';

const router = express.Router();

// Apply CSRF token generation to all public routes
// Frontend should read X-CSRF-Token header and include it in POST requests
router.use(attachCsrfToken);

/**
 * GET /api/public/csrf-token
 * Get a CSRF token for secure form submissions
 * The token is also available in the X-CSRF-Token response header
 */
router.get('/csrf-token', (req, res) => {
  const token = generateCsrfToken();
  const response: ApiResponse = {
    success: true,
    data: { csrfToken: token }
  };
  res.json(response);
});

// Validation schemas
const availableSlotsQuerySchema = z.object({
  serviceId: z.string().uuid('Invalid service ID format'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)')
});

const bookingBodySchema = z.object({
  serviceId: z.string().uuid('Invalid service ID format'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (expected HH:MM)'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^[+\d\s()-]+$/, 'Invalid phone format').min(5).max(20),
  notes: z.string().max(1000).optional(),
  // GDPR Consents
  privacyConsent: z.boolean().refine(val => val === true, {
    message: 'Privacy consent is required to complete the booking'
  }),
  emailReminderConsent: z.boolean().optional().default(false),
  smsReminderConsent: z.boolean().optional().default(false),
  healthDataConsent: z.boolean().optional().default(false)
});

/**
 * GET /api/public/services
 * Get all active services with their categories
 * Public: No authentication required
 */
router.get('/services', async (req, res) => {
  try {
    // Fetch all services
    const servicesResult = await db.services.allDocs({
      include_docs: true
    });

    const services: Service[] = servicesResult.rows
      .filter(row => row.doc && !row.id.startsWith('_design/') && !(row.doc as any)._deleted)
      .map(row => ({
        ...row.doc,
        id: row.id
      })) as Service[];

    // Fetch all service categories from the correct database
    const categoriesResult = await db.serviceCategories.allDocs({
      include_docs: true
    });

    const categories: any[] = categoriesResult.rows
      .filter(row => row.doc && !row.id.startsWith('_design/') && !(row.doc as any)._deleted)
      .map(row => ({
        ...row.doc,
        id: row.id
      }));

    return sendSuccess(res, { services, categories });
  } catch (error) {
    logger.error('Error fetching services:', error);
    return handleRouteError(error, res, 'Failed to fetch services');
  }
});

/**
 * Verifica la disponibilità di uno staff member in uno slot orario specifico
 *
 * @param staffId - ID del membro dello staff
 * @param date - Data nel formato YYYY-MM-DD
 * @param startTime - Ora inizio nel formato HH:MM
 * @param endTime - Ora fine nel formato HH:MM
 * @param appointments - Lista appuntamenti esistenti
 * @returns true se lo staff è disponibile, false altrimenti
 *
 * @example
 * isStaffAvailable('staff-1', '2025-01-15', '10:00', '11:00', existingApts)
 */
function isStaffAvailable(
  staffId: string,
  date: string,
  startTime: string,
  endTime: string,
  appointments: Appointment[]
): boolean {
  const appointmentsForStaff = appointments.filter(
    apt => apt.staffId === staffId && apt.date === date && apt.status !== 'cancelled'
  );

  for (const apt of appointmentsForStaff) {
    // Check if there's any overlap
    if (
      (startTime >= apt.startTime && startTime < apt.endTime) ||
      (endTime > apt.startTime && endTime <= apt.endTime) ||
      (startTime <= apt.startTime && endTime >= apt.endTime)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Aggiunge minuti ad un orario in formato stringa
 *
 * @param time - Orario nel formato HH:MM
 * @param minutes - Numero di minuti da aggiungere
 * @returns Nuovo orario nel formato HH:MM
 *
 * @example
 * addMinutesToTime('10:00', 30) // Returns '10:30'
 * addMinutesToTime('23:45', 30) // Returns '00:15'
 */
function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

/**
 * GET /api/public/available-slots
 * Get available time slots for a service on a specific date
 * Query params: serviceId, date (YYYY-MM-DD)
 * Public: No authentication required
 */
router.get('/available-slots', async (req, res) => {
  try {
    // Validate input with Zod to prevent NoSQL injection
    const validationResult = availableSlotsQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      return sendError(res, validationResult.error.issues[0].message, 400);
    }

    const { serviceId, date } = validationResult.data;

    // Validate that the date is not in the past
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      return sendError(res, 'Cannot book appointments for past dates', 400);
    }

    // Fetch the service to get duration
    const serviceDoc = await db.services.get(serviceId as string);
    const service: Service = {
      ...serviceDoc,
      id: serviceDoc._id
    } as any;

    // Fetch all staff
    const staffResult = await db.staff.allDocs({
      include_docs: true
    });

    const allStaff: Staff[] = staffResult.rows
      .filter(row => row.doc && !row.id.startsWith('_design/') && !(row.doc as any)._deleted)
      .map(row => ({
        ...row.doc,
        id: row.id
      })) as Staff[];

    // Filter staff that can perform this service (have the service category in specializations)
    // and are currently active
    const qualifiedStaff = allStaff.filter(
      staff =>
        staff.isActive &&
        staff.specializations &&
        service.category &&
        staff.specializations.includes(service.category)
    );

    if (qualifiedStaff.length === 0) {
      return sendSuccess(
        res,
        { slots: [] },
        'No active staff members are currently qualified to perform this service'
      );
    }

    // Fetch all appointments for the given date
    const appointmentsResult = await db.appointments.find({
      selector: {
        date: date as string,
        status: { $in: ['scheduled', 'confirmed'] },
        _deleted: { $ne: true }
      }
    });

    const appointments: Appointment[] = appointmentsResult.docs.map(doc => ({
      ...doc,
      id: doc._id
    })) as any;

    // Generate time slots (9:00 - 19:00, every 30 minutes)
    const slots = [];
    const workDayStart = '09:00';
    const workDayEnd = '19:00';
    const slotInterval = 30; // minutes

    let currentTime = workDayStart;

    while (currentTime < workDayEnd) {
      const endTime = addMinutesToTime(currentTime, service.duration);

      // Check if slot end time is within work hours
      if (endTime <= workDayEnd) {
        // Check if any staff member is available for this slot
        const availableStaff = qualifiedStaff.find(staff =>
          isStaffAvailable(staff.id, date as string, currentTime, endTime, appointments)
        );

        slots.push({
          time: currentTime,
          available: !!availableStaff,
          staffId: availableStaff?.id
        });
      }

      currentTime = addMinutesToTime(currentTime, slotInterval);
    }

    return sendSuccess(res, { slots });
  } catch (error) {
    logger.error('Error fetching available slots:', error);
    return handleRouteError(error, res, 'Failed to fetch available slots');
  }
});

/**
 * POST /api/public/bookings
 * Create a new booking from public interface
 * Public: No authentication required
 */
router.post('/bookings', async (req, res) => {
  try {
    // Validate input with Zod to prevent NoSQL injection
    const validationResult = bookingBodySchema.safeParse(req.body);

    if (!validationResult.success) {
      return sendError(res, validationResult.error.issues[0].message, 400);
    }

    const {
      serviceId,
      date,
      startTime,
      firstName,
      lastName,
      email,
      phone,
      notes,
      privacyConsent,
      emailReminderConsent,
      smsReminderConsent,
      healthDataConsent
    } = validationResult.data;

    // Validate that the date is not in the past
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      return sendError(res, 'Cannot book appointments for past dates', 400);
    }

    // GDPR Validation: If notes contain health data, healthDataConsent is required
    if (notes && notes.trim() && !healthDataConsent) {
      return sendError(
        res,
        'Health data consent is required when providing notes about allergies or health conditions',
        400
      );
    }

    // Fetch the service
    const serviceDoc = await db.services.get(serviceId);
    const service: Service = {
      ...serviceDoc,
      id: serviceDoc._id
    } as any;

    // Calculate end time
    const endTime = addMinutesToTime(startTime, service.duration);

    // Fetch all staff qualified for this service
    const staffResult = await db.staff.allDocs({
      include_docs: true
    });

    const allStaff: Staff[] = staffResult.rows
      .filter(row => row.doc && !row.id.startsWith('_design/') && !(row.doc as any)._deleted)
      .map(row => ({
        ...row.doc,
        id: row.id
      })) as Staff[];

    const qualifiedStaff = allStaff.filter(
      staff =>
        staff.isActive &&
        staff.specializations &&
        service.category &&
        staff.specializations.includes(service.category)
    );

    if (qualifiedStaff.length === 0) {
      return sendError(
        res,
        'No active staff members are currently qualified to perform this service. Please contact us for assistance.',
        400
      );
    }

    // Fetch all appointments for the given date
    const appointmentsResult = await db.appointments.find({
      selector: {
        date: date,
        status: { $in: ['scheduled', 'confirmed'] },
        _deleted: { $ne: true }
      }
    });

    const existingAppointments: Appointment[] = appointmentsResult.docs.map(doc => ({
      ...doc,
      id: doc._id
    })) as any;

    // Find an available staff member for the requested slot
    const availableStaff = qualifiedStaff.find(staff =>
      isStaffAvailable(staff.id, date, startTime, endTime, existingAppointments)
    );

    if (!availableStaff) {
      return sendError(res, 'The selected time slot is no longer available. Please choose another time.', 400);
    }

    // Check if customer already exists by email
    // OPTIMIZATION: Use .find() with selector instead of loading all customers
    // This uses the email index and is ~100x faster for large datasets
    let customer: Customer | null = null;
    try {
      const result = await db.customers.find({
        selector: {
          email: email,
          _deleted: { $ne: true }
        },
        limit: 1
      });

      if (result.docs && result.docs.length > 0) {
        const doc = result.docs[0];
        customer = {
          ...doc,
          id: (doc as any)._id
        } as any;
      }
    } catch (error) {
      logger.debug('No existing customer found');
    }

    // Create new customer if doesn't exist
    if (!customer) {
      const customerId = uuidv4();
      const timestamp = new Date().toISOString();

      // Build consent history for audit trail
      const consentHistory: any[] = [
        {
          type: 'privacy',
          action: 'granted',
          timestamp,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('User-Agent')
        }
      ];

      // Add email consent to history if granted
      if (emailReminderConsent) {
        consentHistory.push({
          type: 'emailReminder',
          action: 'granted',
          timestamp
        });
      }

      // Add SMS consent to history if granted
      if (smsReminderConsent) {
        consentHistory.push({
          type: 'smsReminder',
          action: 'granted',
          timestamp
        });
      }

      // Add health data consent to history if granted
      if (healthDataConsent) {
        consentHistory.push({
          type: 'healthData',
          action: 'granted',
          timestamp
        });
      }

      const newCustomer: Customer = {
        id: customerId,
        firstName,
        lastName,
        email,
        phone,
        notes: notes || '',
        consents: {
          privacyConsent: true, // Always true (validated by Zod)
          privacyConsentDate: timestamp,
          privacyConsentVersion: '1.0', // Current Privacy Policy version
          emailReminderConsent: emailReminderConsent || false,
          emailReminderConsentDate: emailReminderConsent ? timestamp : undefined,
          smsReminderConsent: smsReminderConsent || false,
          smsReminderConsentDate: smsReminderConsent ? timestamp : undefined,
          healthDataConsent: healthDataConsent || false,
          healthDataConsentDate: healthDataConsent ? timestamp : undefined,
          consentHistory
        },
        createdAt: timestamp
      };

      await db.customers.put({
        _id: customerId,
        ...newCustomer
      } as any);

      customer = newCustomer;
    } else {
      // Update existing customer - merge consents intelligently
      const timestamp = new Date().toISOString();

      // Get existing consents or create default structure for backward compatibility
      const existingConsents = customer.consents || {
        privacyConsent: true,
        privacyConsentDate: customer.createdAt || timestamp,
        privacyConsentVersion: '1.0',
        emailReminderConsent: false,
        smsReminderConsent: false,
        healthDataConsent: false,
        consentHistory: []
      };

      // Build new consent history entries (only for changed consents)
      const newConsentHistory: any[] = [...(existingConsents.consentHistory || [])];

      // Track email consent change
      if (emailReminderConsent !== undefined && emailReminderConsent !== existingConsents.emailReminderConsent) {
        newConsentHistory.push({
          type: 'emailReminder',
          action: emailReminderConsent ? 'granted' : 'revoked',
          timestamp,
          ipAddress: req.ip || req.socket.remoteAddress
        });
      }

      // Track SMS consent change
      if (smsReminderConsent !== undefined && smsReminderConsent !== existingConsents.smsReminderConsent) {
        newConsentHistory.push({
          type: 'smsReminder',
          action: smsReminderConsent ? 'granted' : 'revoked',
          timestamp
        });
      }

      // Track health data consent change
      if (healthDataConsent !== undefined && healthDataConsent !== existingConsents.healthDataConsent) {
        newConsentHistory.push({
          type: 'healthData',
          action: healthDataConsent ? 'granted' : 'revoked',
          timestamp
        });
      }

      const updatedCustomer = {
        ...customer,
        firstName,
        lastName,
        phone,
        notes: notes ? `${customer.notes || ''}\n${notes}`.trim() : customer.notes,
        consents: {
          ...existingConsents,
          // Update consents only if provided (keep existing if not provided)
          emailReminderConsent: emailReminderConsent !== undefined ? emailReminderConsent : existingConsents.emailReminderConsent,
          emailReminderConsentDate: emailReminderConsent ? timestamp : existingConsents.emailReminderConsentDate,
          smsReminderConsent: smsReminderConsent !== undefined ? smsReminderConsent : existingConsents.smsReminderConsent,
          smsReminderConsentDate: smsReminderConsent ? timestamp : existingConsents.smsReminderConsentDate,
          healthDataConsent: healthDataConsent !== undefined ? healthDataConsent : existingConsents.healthDataConsent,
          healthDataConsentDate: healthDataConsent ? timestamp : existingConsents.healthDataConsentDate,
          consentHistory: newConsentHistory
        },
        updatedAt: timestamp
      };

      await db.customers.put({
        _id: customer.id,
        _rev: (await db.customers.get(customer.id))._rev,
        ...updatedCustomer
      } as any);

      customer = updatedCustomer;
    }

    // Create the appointment
    const appointmentId = uuidv4();
    const appointment: Appointment = {
      id: appointmentId,
      customerId: customer.id,
      serviceId: service.id,
      staffId: availableStaff.id,
      date,
      startTime,
      endTime,
      status: 'scheduled',
      notes: notes || '',
      reminderSent: false,
      createdAt: new Date().toISOString()
    };

    await db.appointments.put({
      _id: appointmentId,
      ...appointment
    } as any);

    // Send confirmation email with reminder
    try {
      await reminderService.sendReminderForAppointment(appointmentId);
    } catch (emailError) {
      logger.error('Failed to send confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    return sendSuccess(res, { appointment, customer }, 'Booking created successfully');
  } catch (error) {
    logger.error('Error creating booking:', error);
    return handleRouteError(error, res, 'Failed to create booking');
  }
});

export default router;
