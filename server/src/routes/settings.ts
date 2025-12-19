import express from 'express';
import db from '../config/database.js';
import { strictLimiter } from '../middleware/rateLimiter.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import { sendSuccess, sendError, handleRouteError } from '../utils/response.js';
import type { Settings, ApiResponse } from '../types/index.js';

const router = express.Router();

const DEFAULT_SETTINGS_ID = 'app-settings';

/**
 * GET /api/settings/is-server
 * Access restrictions have been removed - all users can access reminder settings
 * This endpoint now always returns true to allow universal access
 */
router.get('/is-server', async (req: AuthRequest, res) => {
  try {
    console.log('✅ is-server check: Always returning true (restrictions removed)');
    return sendSuccess(res, { isServer: true });
  } catch (error) {
    console.error('Error in GET /settings/is-server:', error);
    return handleRouteError(error, res, 'Failed to check server status');
  }
});

/**
 * GET /api/settings
 * Get application settings
 */
router.get('/', async (req, res) => {
  try {
    let settings: Settings;

    try {
      settings = await db.settings.get(DEFAULT_SETTINGS_ID) as Settings;
    } catch (settingsError) {
      // If settings don't exist, create defaults
      const error = settingsError as any;
      if (error.status === 404) {
        settings = {
          _id: DEFAULT_SETTINGS_ID,
          reminderSendHour: 10,
          reminderSendMinute: 0,
          enableAutoReminders: true,
          reminderDaysBefore: 1,
          updatedAt: new Date().toISOString()
        };

        await db.settings.put(settings);
      } else {
        throw error;
      }
    }

    return sendSuccess(res, settings);
  } catch (error) {
    console.error('Error in GET /settings:', error);
    return handleRouteError(error, res, 'Failed to fetch settings');
  }
});

/**
 * PUT /api/settings
 * Update application settings
 */
router.put('/', strictLimiter, async (req, res) => {
  try {
    const {
      reminderSendHour,
      reminderSendMinute,
      enableAutoReminders,
      reminderDaysBefore
    } = req.body;

    // Validation
    if (reminderSendHour !== undefined && (reminderSendHour < 0 || reminderSendHour > 23)) {
      return sendError(res, 'reminderSendHour must be between 0 and 23', 400);
    }

    if (reminderSendMinute !== undefined && (reminderSendMinute < 0 || reminderSendMinute > 59)) {
      return sendError(res, 'reminderSendMinute must be between 0 and 59', 400);
    }

    if (reminderDaysBefore !== undefined && (reminderDaysBefore < 1 || reminderDaysBefore > 30)) {
      return sendError(res, 'reminderDaysBefore must be between 1 and 30', 400);
    }

    // Get existing settings or create defaults
    let settings: Settings;
    try {
      settings = await db.settings.get(DEFAULT_SETTINGS_ID) as Settings;
    } catch (settingsError) {
      const error = settingsError as any;
      if (error.status === 404) {
        settings = {
          _id: DEFAULT_SETTINGS_ID,
          reminderSendHour: 10,
          reminderSendMinute: 0,
          enableAutoReminders: true,
          reminderDaysBefore: 1
        };
      } else {
        throw error;
      }
    }

    // Update settings
    const updatedSettings: Settings = {
      ...settings,
      ...(reminderSendHour !== undefined && { reminderSendHour }),
      ...(reminderSendMinute !== undefined && { reminderSendMinute }),
      ...(enableAutoReminders !== undefined && { enableAutoReminders }),
      ...(reminderDaysBefore !== undefined && { reminderDaysBefore }),
      updatedAt: new Date().toISOString()
    };

    await db.settings.put(updatedSettings);

    console.log('✅ Settings updated:', updatedSettings);

    return sendSuccess(res, updatedSettings, 'Settings updated successfully');
  } catch (error) {
    console.error('Error in PUT /settings:', error);
    return handleRouteError(error, res, 'Failed to update settings');
  }
});

export default router;
