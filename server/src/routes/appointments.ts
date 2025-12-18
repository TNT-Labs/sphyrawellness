import express from 'express';
import reminderService from '../services/reminderService.js';
import calendarService from '../services/calendarService.js';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendSuccess, sendError, handleRouteError } from '../utils/response.js';
import type { ApiResponse, Appointment, Customer, Service, Staff } from '../types/index.js';

const router = express.Router();

/**
 * GET /api/appointments
 * Get all appointments from the backend database
 * Protected: Requires authentication
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.appointments.allDocs({
      include_docs: true
    });

    const appointments: Appointment[] = result.rows
      .filter(row => row.doc && !row.id.startsWith('_design/'))
      .map(row => ({
        ...row.doc,
        id: row.id
      })) as Appointment[];

    return sendSuccess(res, appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return handleRouteError(error, res, 'Failed to fetch appointments');
  }
});

/**
 * POST /api/appointments/:appointmentId/confirm
 * Confirm appointment using token
 * Public: No authentication required (uses hashed token validation)
 */
router.post('/:appointmentId/confirm', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { token } = req.body;

    if (!token) {
      return sendError(res, 'Confirmation token is required', 400);
    }

    const result = await reminderService.confirmAppointment(appointmentId, token);

    if (!result.success) {
      return sendError(res, result.error || 'Failed to confirm appointment', 400);
    }

    return sendSuccess(res, result.appointment, 'Appointment confirmed successfully');
  } catch (error) {
    console.error('Error in /confirm:', error);
    return handleRouteError(error, res, 'Failed to confirm appointment');
  }
});

/**
 * GET /api/appointments/:appointmentId/confirm/:token
 * Confirm appointment via GET (for direct link clicks)
 * This redirects to the frontend confirmation page
 * Public: No authentication required (uses hashed token validation)
 */
router.get('/:appointmentId/confirm/:token', async (req, res) => {
  try {
    const { appointmentId, token } = req.params;

    const result = await reminderService.confirmAppointment(appointmentId, token);

    const frontendUrl = process.env.FRONTEND_URL || 'https://sphyra.local';

    if (!result.success) {
      // Redirect to error page
      return res.redirect(`${frontendUrl}/confirm-appointment/error?message=${encodeURIComponent(result.error || 'Invalid token')}`);
    }

    // Redirect to success page
    res.redirect(`${frontendUrl}/confirm-appointment/success?appointmentId=${appointmentId}`);
  } catch (error) {
    console.error('Error in GET /confirm:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://sphyra.local';
    res.redirect(`${frontendUrl}/confirm-appointment/error?message=${encodeURIComponent('An error occurred')}`);
  }
});

/**
 * GET /api/appointments/:appointmentId/calendar.ics
 * Generate and download iCalendar (.ics) file for an appointment
 * Public: No authentication required (allows direct download from email)
 */
router.get('/:appointmentId/calendar.ics', async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // Fetch appointment first to get foreign keys
    const appointmentDoc = await db.appointments.get(appointmentId);
    const appointment: Appointment = {
      ...appointmentDoc,
      id: appointmentDoc._id
    } as any;

    // OPTIMIZATION: Fetch all related data in parallel instead of sequentially
    // This reduces latency from 4 × network_delay to 1 × network_delay
    const [customerDoc, serviceDoc, staffDoc] = await Promise.all([
      db.customers.get(appointment.customerId),
      db.services.get(appointment.serviceId),
      db.staff.get(appointment.staffId)
    ]);

    const customer: Customer = {
      ...customerDoc,
      id: customerDoc._id
    } as any;

    const service: Service = {
      ...serviceDoc,
      id: serviceDoc._id
    } as any;

    const staff: Staff = {
      ...staffDoc,
      id: staffDoc._id
    } as any;

    // Generate .ics file content
    const icsContent = calendarService.generateICS({
      appointment,
      customer,
      service,
      staff
    });

    // Set headers for .ics file download
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="appuntamento-${appointmentId}.ics"`);
    res.send(icsContent);
  } catch (error) {
    console.error('Error generating calendar file:', error);
    return handleRouteError(error, res, 'Failed to generate calendar file');
  }
});

export default router;
