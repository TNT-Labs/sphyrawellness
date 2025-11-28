/**
 * Database module - now uses PouchDB for local storage and CouchDB sync
 * This module delegates all operations to pouchdbSync.ts while maintaining
 * the same public interface for backward compatibility
 */

import * as PouchDBSync from './pouchdbSync';
import { Customer, Service, Staff, Appointment, Payment, Reminder, StaffRole, ServiceCategory } from '../types';
import { logger } from './logger';
import { migrateIndexedDBToPouchDB } from './migrateToPouchDB';

/**
 * Initialize database and run migration if needed
 */
export async function initDB(): Promise<void> {
  try {
    // Initialize PouchDB
    await PouchDBSync.initPouchDB();

    // Migrate data from IndexedDB if needed
    await migrateIndexedDBToPouchDB();

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

// ============================================
// CRUD Operations for Customers
// ============================================

export const getAllCustomers = PouchDBSync.getAllCustomers;
export const getCustomer = PouchDBSync.getCustomer;
export const addCustomer = PouchDBSync.addCustomer;
export const updateCustomer = PouchDBSync.updateCustomer;
export const deleteCustomer = PouchDBSync.deleteCustomer;

// ============================================
// CRUD Operations for Services
// ============================================

export const getAllServices = PouchDBSync.getAllServices;
export const getService = PouchDBSync.getService;
export const addService = PouchDBSync.addService;
export const updateService = PouchDBSync.updateService;
export const deleteService = PouchDBSync.deleteService;

// ============================================
// CRUD Operations for Staff
// ============================================

export const getAllStaff = PouchDBSync.getAllStaff;
export const getStaff = PouchDBSync.getStaff;
export const addStaff = PouchDBSync.addStaff;
export const updateStaff = PouchDBSync.updateStaff;
export const deleteStaff = PouchDBSync.deleteStaff;

// ============================================
// CRUD Operations for Appointments
// ============================================

export const getAllAppointments = PouchDBSync.getAllAppointments;
export const getAppointment = PouchDBSync.getAppointment;
export const addAppointment = PouchDBSync.addAppointment;
export const updateAppointment = PouchDBSync.updateAppointment;
export const deleteAppointment = PouchDBSync.deleteAppointment;

// ============================================
// CRUD Operations for Payments
// ============================================

export const getAllPayments = PouchDBSync.getAllPayments;
export const getPayment = PouchDBSync.getPayment;
export const addPayment = PouchDBSync.addPayment;
export const updatePayment = PouchDBSync.updatePayment;
export const deletePayment = PouchDBSync.deletePayment;

// ============================================
// CRUD Operations for Reminders
// ============================================

export const getAllReminders = PouchDBSync.getAllReminders;
export const getReminder = PouchDBSync.getReminder;
export const addReminder = PouchDBSync.addReminder;
export const updateReminder = PouchDBSync.updateReminder;
export const deleteReminder = PouchDBSync.deleteReminder;

// ============================================
// CRUD Operations for Staff Roles
// ============================================

export const getAllStaffRoles = PouchDBSync.getAllStaffRoles;
export const getStaffRole = PouchDBSync.getStaffRole;
export const addStaffRole = PouchDBSync.addStaffRole;
export const updateStaffRole = PouchDBSync.updateStaffRole;
export const deleteStaffRole = PouchDBSync.deleteStaffRole;

// ============================================
// CRUD Operations for Service Categories
// ============================================

export const getAllServiceCategories = PouchDBSync.getAllServiceCategories;
export const getServiceCategory = PouchDBSync.getServiceCategory;
export const addServiceCategory = PouchDBSync.addServiceCategory;
export const updateServiceCategory = PouchDBSync.updateServiceCategory;
export const deleteServiceCategory = PouchDBSync.deleteServiceCategory;

// ============================================
// Utility Functions
// ============================================

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  customers: number;
  services: number;
  staff: number;
  appointments: number;
  payments: number;
  reminders: number;
  staffRoles: number;
  serviceCategories: number;
}> {
  return await PouchDBSync.getDatabaseStats();
}

/**
 * Export all data (for backup)
 */
export async function exportAllData(): Promise<{
  customers: Customer[];
  services: Service[];
  staff: Staff[];
  appointments: Appointment[];
  payments: Payment[];
  reminders: Reminder[];
  staffRoles: StaffRole[];
  serviceCategories: ServiceCategory[];
}> {
  return await PouchDBSync.exportData();
}

/**
 * Import all data (for restore)
 */
export async function importAllData(data: {
  customers?: Customer[];
  services?: Service[];
  staff?: Staff[];
  appointments?: Appointment[];
  payments?: Payment[];
  reminders?: Reminder[];
  staffRoles?: StaffRole[];
  serviceCategories?: ServiceCategory[];
}): Promise<void> {
  await PouchDBSync.importData(data);
}

/**
 * Clear all data from database
 */
export async function clearAllData(): Promise<void> {
  await PouchDBSync.clearAllData();
}

// ============================================
// Query Functions
// ============================================

export {
  getCustomerAppointments,
  getStaffAppointments,
  getServiceAppointments,
  getCustomerFutureAppointments,
  getStaffFutureAppointments,
  getAppointmentPayments,
} from './pouchdbSync';

// ============================================
// Validation Functions
// ============================================

export { canDeleteCustomer, canDeleteStaff, canDeleteService } from './pouchdbSync';

// ============================================
// Alias for backward compatibility
// ============================================

export { getDatabaseStats as getDBStats } from './pouchdbSync';

// ============================================
// Sync Functions (new)
// ============================================

export { startSync, stopSync, syncOnce, getSyncStatus, onSyncStatusChange } from './pouchdbSync';
