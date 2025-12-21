/**
 * db.ts - Wrapper CRUD per IndexedDB con soft-delete
 */

import {
  Customer,
  Service,
  Staff,
  Appointment,
  Payment,
  Reminder,
  StaffRole,
  ServiceCategory,
  User
} from '../types';
import * as idb from './indexeddb';
import { logger } from './logger';

// ============================
// Customers
// ============================
export const Customers = {
  getAll: () => idb.getAllCustomers(),
  get: (id: string) => idb.getCustomer(id),
  add: (c: Customer) => idb.addCustomer(c),
  update: (c: Customer) => idb.updateCustomer(c),
  updateFromSync: (c: Customer) => idb.updateCustomerFromSync(c),
  delete: (id: string) => idb.deleteCustomer(id)
};

// ============================
// Services
// ============================
export const Services = {
  getAll: () => idb.getAllServices(),
  get: (id: string) => idb.getService(id),
  add: (s: Service) => idb.addService(s),
  update: (s: Service) => idb.updateService(s),
  updateFromSync: (s: Service) => idb.updateServiceFromSync(s),
  delete: (id: string) => idb.deleteService(id)
};

// ============================
// Staff
// ============================
export const Staffs = {
  getAll: () => idb.getAllStaff(),
  get: (id: string) => idb.getStaff(id),
  add: (s: Staff) => idb.addStaff(s),
  update: (s: Staff) => idb.updateStaff(s),
  updateFromSync: (s: Staff) => idb.updateStaffFromSync(s),
  delete: (id: string) => idb.deleteStaff(id)
};

// ============================
// Appointments
// ============================
export const Appointments = {
  getAll: () => idb.getAllAppointments(),
  get: (id: string) => idb.getAppointment(id),
  add: (a: Appointment) => idb.addAppointment(a),
  update: (a: Appointment) => idb.updateAppointment(a),
  updateFromSync: (a: Appointment) => idb.updateAppointmentFromSync(a),
  delete: (id: string) => idb.deleteAppointment(id)
};

// ============================
// Payments
// ============================
export const Payments = {
  getAll: () => idb.getAllPayments(),
  get: (id: string) => idb.getPayment(id),
  add: (p: Payment) => idb.addPayment(p),
  update: (p: Payment) => idb.updatePayment(p),
  updateFromSync: (p: Payment) => idb.updatePaymentFromSync(p),
  delete: (id: string) => idb.deletePayment(id)
};

// ============================
// Reminders
// ============================
export const Reminders = {
  getAll: () => idb.getAllReminders(),
  get: (id: string) => idb.getReminder(id),
  add: (r: Reminder) => idb.addReminder(r),
  update: (r: Reminder) => idb.updateReminder(r),
  updateFromSync: (r: Reminder) => idb.updateReminderFromSync(r),
  delete: (id: string) => idb.deleteReminder(id)
};

// ============================
// Staff Roles
// ============================
export const StaffRoles = {
  getAll: () => idb.getAllStaffRoles(),
  get: (id: string) => idb.getStaffRole(id),
  add: (r: StaffRole) => idb.addStaffRole(r),
  update: (r: StaffRole) => idb.updateStaffRole(r),
  updateFromSync: (r: StaffRole) => idb.updateStaffRoleFromSync(r),
  delete: (id: string) => idb.deleteStaffRole(id)
};

// ============================
// Service Categories
// ============================
export const ServiceCategories = {
  getAll: () => idb.getAllServiceCategories(),
  get: (id: string) => idb.getServiceCategory(id),
  add: (c: ServiceCategory) => idb.addServiceCategory(c),
  update: (c: ServiceCategory) => idb.updateServiceCategory(c),
  updateFromSync: (c: ServiceCategory) => idb.updateServiceCategoryFromSync(c),
  delete: (id: string) => idb.deleteServiceCategory(id)
};

// ============================
// Users
// ============================
export const Users = {
  getAll: () => idb.getAllUsers(),
  get: (id: string) => idb.getUser(id),
  getByUsername: (username: string) => idb.getUserByUsername(username),
  add: (u: User) => idb.addUser(u),
  update: (u: User) => idb.updateUser(u),
  updateFromSync: (u: User) => idb.updateUserFromSync(u),
  delete: (id: string) => idb.deleteUser(id)
};
