/**
 * API Configuration for Sphyra SMS Reminder Mobile App
 */

// Default API URL - should be configured by user
// For local network: http://192.168.1.100:3001/api
// For public HTTPS (RECOMMENDED): https://your-domain.duckdns.org/api
export const DEFAULT_API_URL = 'https://sphyrawellnesslab.duckdns.org/api';

// Sync interval in minutes (optimized for battery life)
export const DEFAULT_SYNC_INTERVAL = 60; // 60 minutes (WorkManager minimum is 15)

// Timeout for API requests
export const API_TIMEOUT = 10000; // 10 seconds

// Battery optimization settings
export const BATTERY_OPTIMIZATION = {
  // Night hours (NO SYNC during this period - SMS not sent)
  NIGHT_HOURS_START: 20, // 20:00 (8:00 PM)
  NIGHT_HOURS_END: 9, // 09:00 (9:00 AM)

  // Business hours (for display purposes)
  BUSINESS_HOURS_START: 9, // 9:00 AM
  BUSINESS_HOURS_END: 20, // 8:00 PM

  // Interval multipliers based on conditions (more aggressive for battery saving)
  LOW_BATTERY_MULTIPLIER: 3, // 3x interval when battery < 20% (was 2x)
  NO_REMINDERS_MULTIPLIER: 4, // 4x interval after 12h without reminders (was 3x)
  CHARGING_MULTIPLIER: 0.5, // 0.5x interval when charging (sync more often)

  // Battery thresholds
  LOW_BATTERY_THRESHOLD: 20, // Consider battery low below 20%
  CRITICAL_BATTERY_THRESHOLD: 10, // Critical battery below 10%

  // Adaptive interval settings
  NO_REMINDERS_THRESHOLD_HOURS: 12, // Hours without reminders before increasing interval (was 24)
  MAX_ADAPTIVE_INTERVAL: 240, // Maximum interval in minutes (4 hours)
  MIN_ADAPTIVE_INTERVAL: 15, // Minimum interval (WorkManager constraint)
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
