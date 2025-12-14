import express from 'express';
import reminderService from '../services/reminderService.js';
import calendarService from '../services/calendarService.js';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
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

    const response: ApiResponse = {
      success: true,
      data: appointments
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching appointments:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Internal server error'
    };
    res.status(500).json(response);
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
      const response: ApiResponse = {
        success: false,
        error: 'Confirmation token is required'
      };
      return res.status(400).json(response);
    }

    const result = await reminderService.confirmAppointment(appointmentId, token);

    if (!result.success) {
      const response: ApiResponse = {
        success: false,
        error: result.error || 'Failed to confirm appointment'
      };
      return res.status(400).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: result.appointment,
      message: 'Appointment confirmed successfully'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error in /confirm:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Internal server error'
    };
    res.status(500).json(response);
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
  } catch (error: any) {
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

    // Fetch appointment
    const appointmentDoc = await db.appointments.get(appointmentId);
    const appointment: Appointment = {
      ...appointmentDoc,
      id: appointmentDoc._id
    } as any;

    // Fetch related data
    const customerDoc = await db.customers.get(appointment.customerId);
    const customer: Customer = {
      ...customerDoc,
      id: customerDoc._id
    } as any;

    const serviceDoc = await db.services.get(appointment.serviceId);
    const service: Service = {
      ...serviceDoc,
      id: serviceDoc._id
    } as any;

    const staffDoc = await db.staff.get(appointment.staffId);
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
  } catch (error: any) {
    console.error('Error generating calendar file:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to generate calendar file'
    };
    res.status(500).json(response);
  }
});

export default router;
