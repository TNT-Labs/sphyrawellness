import express from 'express';
import db from '../config/database.js';
import { strictLimiter } from '../middleware/rateLimiter.js';
import type { Settings, ApiResponse } from '../types/index.js';

const router = express.Router();

const DEFAULT_SETTINGS_ID = 'app-settings';

/**
 * GET /api/settings/is-server
 * Check if the request is coming from the server itself (localhost)
 */
router.get('/is-server', (req, res) => {
  try {
    // Get the client IP address
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    // Normalize IPv6 localhost to IPv4
    const normalizedIp = clientIp === '::1' || clientIp === '::ffff:127.0.0.1'
      ? '127.0.0.1'
      : clientIp;

    // Check if the request is from localhost
    const isLocalhost = normalizedIp === '127.0.0.1' ||
                        normalizedIp === 'localhost' ||
                        normalizedIp === '::1';

    const response: ApiResponse<{ isServer: boolean }> = {
      success: true,
      data: { isServer: isLocalhost }
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error in GET /settings/is-server:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Internal server error'
    };
    res.status(500).json(response);
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
    } catch (error: any) {
      // If settings don't exist, create defaults
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

    const response: ApiResponse<Settings> = {
      success: true,
      data: settings
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error in GET /settings:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Internal server error'
    };
    res.status(500).json(response);
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
      const response: ApiResponse = {
        success: false,
        error: 'reminderSendHour must be between 0 and 23'
      };
      return res.status(400).json(response);
    }

    if (reminderSendMinute !== undefined && (reminderSendMinute < 0 || reminderSendMinute > 59)) {
      const response: ApiResponse = {
        success: false,
        error: 'reminderSendMinute must be between 0 and 59'
      };
      return res.status(400).json(response);
    }

    // Get existing settings or create defaults
    let settings: Settings;
    try {
      settings = await db.settings.get(DEFAULT_SETTINGS_ID) as Settings;
    } catch (error: any) {
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

    const response: ApiResponse<Settings> = {
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error in PUT /settings:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;
