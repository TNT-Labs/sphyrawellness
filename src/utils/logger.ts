/**
 * Production-safe logger utility
 * In production, console logs are suppressed to avoid exposing sensitive information
 * and to reduce bundle size
 */

const isDevelopment = import.meta.env.MODE !== 'production';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
    // In production, you might want to send errors to a monitoring service
    // Example: sendToMonitoringService({ level: 'error', args });
  },

  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};
