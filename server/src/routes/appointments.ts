import express from 'express';
import reminderService from '../services/reminderService.js';
import db from '../config/database.js';
import type { ApiResponse, Appointment } from '../types/index.js';

const router = express.Router();

/**
 * GET /api/appointments
 * Get all appointments from the backend database
 */
router.get('/', async (req, res) => {
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
 */
router.get('/:appointmentId/confirm/:token', async (req, res) => {
  try {
    const { appointmentId, token } = req.params;

    const result = await reminderService.confirmAppointment(appointmentId, token);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!result.success) {
      // Redirect to error page
      return res.redirect(`${frontendUrl}/confirm-appointment/error?message=${encodeURIComponent(result.error || 'Invalid token')}`);
    }

    // Redirect to success page
    res.redirect(`${frontendUrl}/confirm-appointment/success?appointmentId=${appointmentId}`);
  } catch (error: any) {
    console.error('Error in GET /confirm:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/confirm-appointment/error?message=${encodeURIComponent('An error occurred')}`);
  }
});

export default router;
