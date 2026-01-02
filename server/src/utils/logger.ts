/**
 * Enhanced production-grade logger using Winston
 * Provides structured logging with different transports and formats
 */

import winston from 'winston';
import { format } from 'winston';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Custom format for console output with colors
const consoleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.colorize(),
  format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present (excluding certain fields)
    const meta = { ...metadata };
    delete meta.timestamp;
    delete meta.level;
    delete meta.message;

    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }

    return msg;
  })
);

// JSON format for file output
const fileFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

// Create Winston logger instance
const winstonLogger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: fileFormat,
  defaultMeta: {
    service: 'sphyra-wellness-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: consoleFormat,
      level: isDevelopment ? 'debug' : 'info'
    }),

    // Write error logs to file in production
    ...(isDevelopment ? [] : [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ])
  ],
  exceptionHandlers: isDevelopment ? [] : [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: isDevelopment ? [] : [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// In-memory log storage (for debugging and monitoring)
export interface LogEntry {
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  details?: unknown[];
  metadata?: Record<string, unknown>;
}

const MAX_LOGS = 1000;
const logs: LogEntry[] = [];

const addLog = (level: LogEntry['level'], message: string, metadata?: Record<string, unknown>) => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    metadata
  };

  logs.push(entry);

  // Keep only the last MAX_LOGS entries
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
};

// Enhanced logger interface with Winston
export const logger = {
  /**
   * Log informational messages
   */
  info: (message: string, metadata?: Record<string, unknown>) => {
    addLog('info', message, metadata);
    winstonLogger.info(message, metadata);
  },

  /**
   * Log error messages (always logged, even in production)
   */
  error: (message: string, error?: Error | unknown, metadata?: Record<string, unknown>) => {
    const meta = { ...metadata };

    if (error instanceof Error) {
      meta.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    } else if (error) {
      meta.error = error;
    }

    addLog('error', message, meta);
    winstonLogger.error(message, meta);
  },

  /**
   * Log warning messages
   */
  warn: (message: string, metadata?: Record<string, unknown>) => {
    addLog('warn', message, metadata);
    winstonLogger.warn(message, metadata);
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (message: string, metadata?: Record<string, unknown>) => {
    addLog('debug', message, metadata);
    if (isDevelopment) {
      winstonLogger.debug(message, metadata);
    }
  },

  /**
   * Log general messages (alias for info)
   */
  log: (message: string, metadata?: Record<string, unknown>) => {
    addLog('log', message, metadata);
    winstonLogger.info(message, metadata);
  },

  /**
   * Log HTTP requests
   */
  http: (message: string, metadata?: Record<string, unknown>) => {
    winstonLogger.http?.(message, metadata);
  },

  /**
   * Get stored logs
   */
  getLogs: (): LogEntry[] => {
    return [...logs];
  },

  /**
   * Clear stored logs
   */
  clearLogs: () => {
    logs.length = 0;
  },

  /**
   * Get logs count
   */
  getLogsCount: () => {
    return logs.length;
  },

  /**
   * Create a child logger with additional default metadata
   */
  child: (defaultMetadata: Record<string, unknown>) => {
    return winstonLogger.child(defaultMetadata);
  }
};

// Export a default instance
export default logger;
