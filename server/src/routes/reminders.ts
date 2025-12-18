import express from 'express';
import reminderService from '../services/reminderService.js';
import { emailLimiter, strictLimiter } from '../middleware/rateLimiter.js';
import { sendSuccess, sendError, handleRouteError } from '../utils/response.js';
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
      return sendError(res, result.error || 'Failed to send reminder', 400);
    }

    return sendSuccess(res, { reminderId: result.reminderId }, 'Reminder sent successfully');
  } catch (error) {
    console.error('Error in /send/:appointmentId:', error);
    return handleRouteError(error, res, 'Failed to send reminder');
  }
});

/**
 * POST /api/reminders/send-all
 * Send reminders for all appointments that need them
 */
router.post('/send-all', emailLimiter, async (req, res) => {
  try {
    const result = await reminderService.sendAllDueReminders();

    return sendSuccess(res, result, `Sent ${result.sent} reminders (${result.failed} failed)`);
  } catch (error) {
    console.error('Error in /send-all:', error);
    return handleRouteError(error, res, 'Failed to send reminders');
  }
});

/**
 * GET /api/reminders/appointments-needing-reminders
 * Get list of appointments that need reminders
 */
router.get('/appointments-needing-reminders', strictLimiter, async (req, res) => {
  try {
    const appointments = await reminderService.getAppointmentsNeedingReminders();

    return sendSuccess(res, appointments, `Found ${appointments.length} appointments needing reminders`);
  } catch (error) {
    console.error('Error in /appointments-needing-reminders:', error);
    return handleRouteError(error, res, 'Failed to fetch appointments needing reminders');
  }
});

export default router;
