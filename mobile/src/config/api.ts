/**
 * API Configuration for Sphyra SMS Reminder Mobile App
 */

// Default API URL - should be configured by user
// For local network: http://192.168.1.100:3001/api
// For public HTTPS (RECOMMENDED): https://your-domain.duckdns.org/api
export const DEFAULT_API_URL = 'http://192.168.1.100:3001/api';

// Sync interval in minutes
export const DEFAULT_SYNC_INTERVAL = 30; // 30 minutes

// Timeout for API requests
export const API_TIMEOUT = 10000; // 10 seconds

// Storage keys
export const STORAGE_KEYS = {
  TOKEN: '@sphyra:token',
  USER: '@sphyra:user',
  API_URL: '@sphyra:apiUrl',
  LAST_SYNC: '@sphyra:lastSync',
  AUTO_SYNC_ENABLED: '@sphyra:autoSyncEnabled',
  SYNC_INTERVAL: '@sphyra:syncInterval',
};

// API endpoints
export const ENDPOINTS = {
  LOGIN: '/auth/login',
  ME: '/auth/me',
  PENDING_REMINDERS: '/reminders/mobile/pending',
  MARK_SENT: '/reminders/mobile/mark-sent',
  MARK_FAILED: '/reminders/mobile/mark-failed',
};
