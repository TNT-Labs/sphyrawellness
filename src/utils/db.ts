/**
 * Database module - uses native IndexedDB for local storage
 * This module delegates all operations to indexedDB.ts
 * 
 * NOTA: Questo file NON richiede modifiche sostanziali.
 * Aggiornati solo alcuni commenti per chiarezza sul coordinamento con dbBridge.
 */

import * as IndexedDB from './indexedDB';
import { Customer, Service, Staff, Appointment, Payment, Reminder, StaffRole, ServiceCategory } from '../types';
import { logger } from './logger';

/**
 * Initialize database
 */
export async function initDB(): Promise<void> {
  try {
    // Initialize IndexedDB
    await IndexedDB.initIndexedDB();

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

// ============================================
// CRUD Operations for Customers
// ============================================

// NOTA: Queste funzioni triggerano automaticamente sync verso PouchDB tramite dbBridge
export const getAllCustomers = IndexedDB.getAllCustomers;
export const getCustomer = IndexedDB.getCustomer;
export const addCustomer = IndexedDB.addCustomer;
export const updateCustomer = IndexedDB.updateCustomer;
export const deleteCustomer = IndexedDB.deleteCustomer;

// ============================================
// CRUD Operations for Services
// ============================================

export const getAllServices = IndexedDB.getAllServices;
export const getService = IndexedDB.getService;
export const addService = IndexedDB.addService;
export const updateService = IndexedDB.updateService;
export const deleteService = IndexedDB.deleteService;

// ============================================
// CRUD Operations for Staff
// ============================================

export const getAllStaff = IndexedDB.getAllStaff;
export const getStaff = IndexedDB.getStaff;
export const addStaff = IndexedDB.addStaff;
export const updateStaff = IndexedDB.updateStaff;
export const deleteStaff = IndexedDB.deleteStaff;

// ============================================
// CRUD Operations for Appointments
// ============================================

export const getAllAppointments = IndexedDB.getAllAppointments;
export const getAppointment = IndexedDB.getAppointment;
export const addAppointment = IndexedDB.addAppointment;
export const updateAppointment = IndexedDB.updateAppointment;
export const deleteAppointment = IndexedDB.deleteAppointment;

// ============================================
// CRUD Operations for Payments
// ============================================

export const getAllPayments = IndexedDB.getAllPayments;
export const getPayment = IndexedDB.getPayment;
export const addPayment = IndexedDB.addPayment;
export const updatePayment = IndexedDB.updatePayment;
export const deletePayment = IndexedDB.deletePayment;

// ============================================
// CRUD Operations for Reminders
// ============================================

export const getAllReminders = IndexedDB.getAllReminders;
export const getReminder = IndexedDB.getReminder;
export const addReminder = IndexedDB.addReminder;
export const updateReminder = IndexedDB.updateReminder;
export const deleteReminder = IndexedDB.deleteReminder;

// ============================================
// CRUD Operations for Staff Roles
// ============================================

export const getAllStaffRoles = IndexedDB.getAllStaffRoles;
export const getStaffRole = IndexedDB.getStaffRole;
export const addStaffRole = IndexedDB.addStaffRole;
export const updateStaffRole = IndexedDB.updateStaffRole;
export const deleteStaffRole = IndexedDB.deleteStaffRole;

// ============================================
// CRUD Operations for Service Categories
// ============================================

export const getAllServiceCategories = IndexedDB.getAllServiceCategories;
export const getServiceCategory = IndexedDB.getServiceCategory;
export const addServiceCategory = IndexedDB.addServiceCategory;
export const updateServiceCategory = IndexedDB.updateServiceCategory;
export const deleteServiceCategory = IndexedDB.deleteServiceCategory;

// ============================================
// CRUD Operations for Users
// ============================================

export const getAllUsers = IndexedDB.getAllUsers;
export const getUser = IndexedDB.getUser;
export const getUserByUsername = IndexedDB.getUserByUsername;
export const addUser = IndexedDB.addUser;
export const updateUser = IndexedDB.updateUser;
export const deleteUser = IndexedDB.deleteUser;

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
  return await IndexedDB.getDatabaseStats();
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
  return await IndexedDB.exportData();
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
  await IndexedDB.importData(data);
}

/**
 * Clear all data from database
 */
export async function clearAllData(): Promise<void> {
  await IndexedDB.clearAllData();
}

/**
 * Physically delete the entire IndexedDB database
 * WARNING: This is a destructive operation that cannot be undone
 */
export async function deleteDatabase(): Promise<void> {
  await IndexedDB.deleteDatabase();
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
} from './indexedDB';

// ============================================
// Validation Functions
// ============================================

export { canDeleteCustomer, canDeleteStaff, canDeleteService } from './indexedDB';

// ============================================
// Deletion Tracking Functions (FIX #7)
// ============================================

export { cleanOldDeletionRecords } from './indexedDB';

// ============================================
// Alias for backward compatibility
// ============================================

export { getDatabaseStats as getDBStats };
