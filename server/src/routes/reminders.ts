import express from 'express';
import reminderService from '../services/reminderService.js';
import { emailLimiter, strictLimiter } from '../middleware/rateLimiter.js';
import type { ApiResponse } from '../types/index.js';

const router = express.Router();

/**
 * POST /api/reminders/send/:appointmentId
 * Send reminder for a specific appointment
 */
router.post('/send/:appointmentId', emailLimiter, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const result = await reminderService.sendReminderForAppointment(appointmentId);

    if (!result.success) {
      const response: ApiResponse = {
        success: false,
        error: result.error || 'Failed to send reminder'
      };
      return res.status(400).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { reminderId: result.reminderId },
      message: 'Reminder sent successfully'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error in /send/:appointmentId:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Internal server error'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/reminders/send-all
 * Send reminders for all appointments that need them
 */
router.post('/send-all', emailLimiter, async (req, res) => {
  try {
    const result = await reminderService.sendAllDueReminders();

    const response: ApiResponse = {
      success: true,
      data: result,
      message: `Sent ${result.sent} reminders (${result.failed} failed)`
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error in /send-all:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Internal server error'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/reminders/appointments-needing-reminders
 * Get list of appointments that need reminders
 */
router.get('/appointments-needing-reminders', strictLimiter, async (req, res) => {
  try {
    const appointments = await reminderService.getAppointmentsNeedingReminders();

    const response: ApiResponse = {
      success: true,
      data: appointments,
      message: `Found ${appointments.length} appointments needing reminders`
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error in /appointments-needing-reminders:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;
