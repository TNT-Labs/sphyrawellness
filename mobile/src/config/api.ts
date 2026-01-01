/**
 * API Configuration for Sphyra SMS Reminder Mobile App
 */

// Default API URL - should be configured by user
// For local network: http://192.168.1.100:3001/api
// For public HTTPS (RECOMMENDED): https://your-domain.duckdns.org/api
export const DEFAULT_API_URL = 'https://sphyrawellnesslab.duckdns.org/api';

// Sync interval in minutes
export const DEFAULT_SYNC_INTERVAL = 30; // 30 minutes

// Timeout for API requests
export const API_TIMEOUT = 10000; // 10 seconds

// Battery optimization settings
export const BATTERY_OPTIMIZATION = {
  // Business hours (when to sync more frequently)
  BUSINESS_HOURS_START: 8, // 8:00 AM
  BUSINESS_HOURS_END: 20, // 8:00 PM

  // Interval multipliers based on conditions
  NIGHT_MODE_MULTIPLIER: 4, // 4x interval during night (es. 30min → 120min)
  LOW_BATTERY_MULTIPLIER: 2, // 2x interval when battery < 20%
  NO_REMINDERS_MULTIPLIER: 3, // 3x interval after 24h without reminders

  // Battery thresholds
  LOW_BATTERY_THRESHOLD: 20, // Consider battery low below 20%

  // Adaptive interval settings
  NO_REMINDERS_THRESHOLD_HOURS: 24, // Hours without reminders before increasing interval
  MAX_ADAPTIVE_INTERVAL: 240, // Maximum interval in minutes (4 hours)
};

// Storage keys
export const STORAGE_KEYS = {
  TOKEN: '@sphyra:token',
  USER: '@sphyra:user',
  API_URL: '@sphyra:apiUrl',
  LAST_SYNC: '@sphyra:lastSync',
  AUTO_SYNC_ENABLED: '@sphyra:autoSyncEnabled',
  SYNC_INTERVAL: '@sphyra:syncInterval',
  LAST_REMINDER_FOUND: '@sphyra:lastReminderFound', // Track when we last found reminders
};

// API endpoints
export const ENDPOINTS = {
  LOGIN: '/auth/login',
  ME: '/auth/me',
  PENDING_REMINDERS: '/reminders/mobile/pending',
  MARK_SENT: '/reminders/mobile/mark-sent',
  MARK_FAILED: '/reminders/mobile/mark-failed',
};
