/**
 * Audit Logging Utility
 * Tracks security-critical operations for compliance and forensics
 *
 * GDPR/Security Compliance:
 * - Logs authentication events (login success/failure)
 * - Logs access to sensitive data (customer info, appointments)
 * - Logs data modifications (create, update, delete)
 * - Includes IP address, timestamp, user ID, and action details
 */

import type { Request } from 'express';
import logger from './logger.js';

/**
 * Audit event types
 */
export enum AuditAction {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  TOKEN_VERIFIED = 'TOKEN_VERIFIED',
  TOKEN_INVALID = 'TOKEN_INVALID',

  // Customer data events
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED = 'CUSTOMER_UPDATED',
  CUSTOMER_DELETED = 'CUSTOMER_DELETED',
  CUSTOMER_VIEWED = 'CUSTOMER_VIEWED',
  CUSTOMER_CONSENT_UPDATED = 'CUSTOMER_CONSENT_UPDATED',

  // Appointment events
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_UPDATED = 'APPOINTMENT_UPDATED',
  APPOINTMENT_DELETED = 'APPOINTMENT_DELETED',
  APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',

  // Payment events
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_UPDATED = 'PAYMENT_UPDATED',
  PAYMENT_DELETED = 'PAYMENT_DELETED',

  // User management events
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_PASSWORD_CHANGED = 'USER_PASSWORD_CHANGED',

  // Settings events
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',

  // Upload events
  FILE_UPLOADED = 'FILE_UPLOADED',
  FILE_DELETED = 'FILE_DELETED',
  FILE_UPLOAD_BLOCKED = 'FILE_UPLOAD_BLOCKED',

  // Security events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

/**
 * Audit event severity levels
 */
export enum AuditSeverity {
  INFO = 'INFO',         // Normal operations
  WARNING = 'WARNING',   // Potentially suspicious
  ERROR = 'ERROR',       // Failed operations
  CRITICAL = 'CRITICAL', // Security incidents
}

/**
 * Extract client IP from request
 * Handles proxies and load balancers
 */
function getClientIP(req: Request): string {
  // Check X-Forwarded-For header (from proxies)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can be a comma-separated list; take the first one
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }

  // Check X-Real-IP header
  const realIP = req.headers['x-real-ip'];
  if (realIP && typeof realIP === 'string') {
    return realIP;
  }

  // Fallback to socket IP
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Extract user agent from request
 */
function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Audit log entry structure
 */
interface AuditLogEntry {
  timestamp: string;
  action: AuditAction;
  severity: AuditSeverity;
  userId?: string;
  username?: string;
  ipAddress: string;
  userAgent: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, any>;
  success: boolean;
}

/**
 * Log an audit event
 */
export function logAuditEvent(
  action: AuditAction,
  req: Request,
  options: {
    userId?: string;
    username?: string;
    severity?: AuditSeverity;
    resource?: string;
    resourceId?: string;
    details?: Record<string, any>;
    success?: boolean;
  } = {}
): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action,
    severity: options.severity || AuditSeverity.INFO,
    userId: options.userId,
    username: options.username,
    ipAddress: getClientIP(req),
    userAgent: getUserAgent(req),
    resource: options.resource,
    resourceId: options.resourceId,
    details: options.details,
    success: options.success ?? true,
  };

  // Format log message
  const message = formatAuditMessage(entry);

  // Log based on severity
  switch (entry.severity) {
    case AuditSeverity.CRITICAL:
      logger.error(`🚨 [AUDIT-CRITICAL] ${message}`, entry);
      break;
    case AuditSeverity.ERROR:
      logger.error(`❌ [AUDIT-ERROR] ${message}`, entry);
      break;
    case AuditSeverity.WARNING:
      logger.warn(`⚠️  [AUDIT-WARNING] ${message}`, entry);
      break;
    default:
      logger.info(`📝 [AUDIT] ${message}`, entry);
  }

  // TODO: In production, also send to external logging service
  // Examples: Datadog, Sentry, CloudWatch, etc.
  // sendToExternalLogging(entry);
}

/**
 * Format audit message for logging
 */
function formatAuditMessage(entry: AuditLogEntry): string {
  const parts: string[] = [];

  // Action
  parts.push(entry.action);

  // User info
  if (entry.username) {
    parts.push(`user=${entry.username}`);
  } else if (entry.userId) {
    parts.push(`userId=${entry.userId}`);
  }

  // Resource
  if (entry.resource && entry.resourceId) {
    parts.push(`${entry.resource}=${entry.resourceId}`);
  } else if (entry.resource) {
    parts.push(`resource=${entry.resource}`);
  }

  // IP
  parts.push(`ip=${entry.ipAddress}`);

  // Success/Failure
  parts.push(entry.success ? '✓' : '✗');

  return parts.join(' | ');
}

/**
 * Convenience functions for common audit events
 */

export function logLoginSuccess(req: Request, userId: string, username: string): void {
  logAuditEvent(AuditAction.LOGIN_SUCCESS, req, {
    userId,
    username,
    severity: AuditSeverity.INFO,
    success: true,
  });
}

export function logLoginFailure(req: Request, username: string, reason?: string): void {
  logAuditEvent(AuditAction.LOGIN_FAILURE, req, {
    username,
    severity: AuditSeverity.WARNING,
    success: false,
    details: { reason },
  });
}

export function logCustomerAccess(
  req: Request,
  userId: string,
  customerId: string,
  action: 'created' | 'updated' | 'deleted' | 'viewed'
): void {
  const actionMap = {
    created: AuditAction.CUSTOMER_CREATED,
    updated: AuditAction.CUSTOMER_UPDATED,
    deleted: AuditAction.CUSTOMER_DELETED,
    viewed: AuditAction.CUSTOMER_VIEWED,
  };

  logAuditEvent(actionMap[action], req, {
    userId,
    resource: 'customer',
    resourceId: customerId,
    severity: action === 'deleted' ? AuditSeverity.WARNING : AuditSeverity.INFO,
  });
}

export function logAppointmentChange(
  req: Request,
  userId: string,
  appointmentId: string,
  action: 'created' | 'updated' | 'deleted' | 'confirmed' | 'cancelled'
): void {
  const actionMap = {
    created: AuditAction.APPOINTMENT_CREATED,
    updated: AuditAction.APPOINTMENT_UPDATED,
    deleted: AuditAction.APPOINTMENT_DELETED,
    confirmed: AuditAction.APPOINTMENT_CONFIRMED,
    cancelled: AuditAction.APPOINTMENT_CANCELLED,
  };

  logAuditEvent(actionMap[action], req, {
    userId,
    resource: 'appointment',
    resourceId: appointmentId,
    severity: action === 'deleted' || action === 'cancelled'
      ? AuditSeverity.WARNING
      : AuditSeverity.INFO,
  });
}

export function logUnauthorizedAccess(req: Request, reason: string): void {
  logAuditEvent(AuditAction.UNAUTHORIZED_ACCESS, req, {
    severity: AuditSeverity.ERROR,
    success: false,
    details: { reason },
  });
}

export function logSuspiciousActivity(
  req: Request,
  reason: string,
  details?: Record<string, any>
): void {
  logAuditEvent(AuditAction.SUSPICIOUS_ACTIVITY, req, {
    severity: AuditSeverity.CRITICAL,
    success: false,
    details: { reason, ...details },
  });
}
