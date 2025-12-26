/**
 * Database utilities stub
 * This file provides compatibility functions for the migration from CouchDB/PouchDB to PostgreSQL.
 * These functions are deprecated and should be replaced with proper API calls.
 *
 * TODO: Remove this file once all pages are updated to use REST API directly.
 */

import { logger } from './logger';

/**
 * Check if a service can be deleted
 * @deprecated Use servicesApi.delete() instead - the backend will validate
 */
export async function canDeleteService(serviceId: string): Promise<{ canDelete: boolean; reason?: string }> {
  logger.warn('canDeleteService is deprecated - use servicesApi.delete() instead');
  // Let the backend handle validation
  return { canDelete: true };
}

/**
 * Check if a customer can be deleted
 * @deprecated Use customersApi.delete() instead - the backend will validate
 */
export async function canDeleteCustomer(customerId: string): Promise<{ canDelete: boolean; reason?: string }> {
  logger.warn('canDeleteCustomer is deprecated - use customersApi.delete() instead');
  // Let the backend handle validation
  return { canDelete: true };
}

/**
 * Check if a staff member can be deleted
 * @deprecated Use staffApi.delete() instead - the backend will validate
 */
export async function canDeleteStaff(staffId: string): Promise<{ canDelete: boolean; reason?: string }> {
  logger.warn('canDeleteStaff is deprecated - use staffApi.delete() instead');
  // Let the backend handle validation
  return { canDelete: true };
}

/**
 * Export all data
 * @deprecated Data export should be handled by the backend
 */
export async function exportAllData(): Promise<any> {
  logger.error('exportAllData is not implemented - data export should be done via backend API');
  throw new Error('Export not available - please use backend data export functionality');
}

/**
 * Import all data
 * @deprecated Data import should be handled by the backend
 */
export async function importAllData(data: any): Promise<void> {
  logger.error('importAllData is not implemented - data import should be done via backend API');
  throw new Error('Import not available - please use backend data import functionality');
}

/**
 * Get database statistics
 * @deprecated Use dedicated API endpoints for statistics
 */
export async function getDBStats(): Promise<any> {
  logger.warn('getDBStats is deprecated - statistics should come from backend API');
  return {
    totalSize: 0,
    documents: {
      customers: 0,
      services: 0,
      staff: 0,
      appointments: 0,
      payments: 0,
      reminders: 0,
      staffRoles: 0,
      serviceCategories: 0,
    },
  };
}

/**
 * Clear all data
 * @deprecated This operation should be handled by the backend
 */
export async function clearAllData(): Promise<void> {
  logger.error('clearAllData is not implemented - this should be done via backend admin API');
  throw new Error('Clear data not available - contact system administrator');
}

/**
 * Delete database
 * @deprecated This operation should be handled by the backend
 */
export async function deleteDatabase(): Promise<void> {
  logger.error('deleteDatabase is not implemented - this should be done via backend admin API');
  throw new Error('Delete database not available - contact system administrator');
}

/**
 * Get all users
 * @deprecated Use proper user management API
 */
export async function getAllUsers(): Promise<any[]> {
  logger.warn('getAllUsers is deprecated - use proper user management API');
  return [];
}

/**
 * Add user (alias for compatibility)
 * @deprecated Use proper user management API
 */
export async function addUser(user: any): Promise<any> {
  logger.error('addUser is not implemented - use proper user management API');
  throw new Error('User management should be done via backend API');
}

/**
 * Delete user (alias for compatibility)
 * @deprecated Use proper user management API
 */
export async function deleteUser(userId: string): Promise<void> {
  logger.error('deleteUser is not implemented - use proper user management API');
  throw new Error('User management should be done via backend API');
}
