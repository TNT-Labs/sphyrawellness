/**
 * Production-safe logger utility
 * In production, console logs are suppressed to avoid exposing sensitive information
 * and to reduce bundle size
 */

const isDevelopment = import.meta.env.MODE !== 'production';

export interface LogEntry {
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  details?: unknown[];
}

const MAX_LOGS = 1000;
const logs: LogEntry[] = [];

const addLog = (level: LogEntry['level'], args: unknown[]) => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(' '),
    details: args.length > 1 ? args.slice(1) : undefined,
  };

  logs.push(entry);

  // Keep only the last MAX_LOGS entries
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
};

export const logger = {
  log: (...args: unknown[]) => {
    addLog('log', args);
    if (isDevelopment) {
      console.log(...args);
    }
  },

  error: (...args: unknown[]) => {
    addLog('error', args);
    if (isDevelopment) {
      console.error(...args);
    }
    // In production, you might want to send errors to a monitoring service
    // Example: sendToMonitoringService({ level: 'error', args });
  },

  warn: (...args: unknown[]) => {
    addLog('warn', args);
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  info: (...args: unknown[]) => {
    addLog('info', args);
    if (isDevelopment) {
      console.info(...args);
    }
  },

  debug: (...args: unknown[]) => {
    addLog('debug', args);
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  getLogs: (): LogEntry[] => {
    return [...logs];
  },

  clearLogs: () => {
    logs.length = 0;
  },

  getLogsCount: () => {
    return logs.length;
  },
};
