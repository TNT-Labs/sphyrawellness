/**
 * IndexedDB implementation for local storage
 * This module provides all database operations using native IndexedDB API
 */

import {
  Customer,
  Service,
  Staff,
  Appointment,
  Payment,
  Reminder,
  StaffRole,
  ServiceCategory
} from '../types';
import { logger } from './logger';

const DB_NAME = 'sphyra-wellness-db';
const DB_VERSION = 3;

// Object store names
const STORES = {
  CUSTOMERS: 'customers',
  SERVICES: 'services',
  STAFF: 'staff',
  APPOINTMENTS: 'appointments',
  PAYMENTS: 'payments',
  REMINDERS: 'reminders',
  STAFF_ROLES: 'staffRoles',
  SERVICE_CATEGORIES: 'serviceCategories',
} as const;

let db: IDBDatabase | null = null;

/**
 * Check if IndexedDB is available (important for incognito mode)
 */
function isIndexedDBAvailable(): boolean {
  try {
    if (!window.indexedDB) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Initialize IndexedDB database
 */
export async function initIndexedDB(): Promise<void> {
  if (!isIndexedDBAvailable()) {
    throw new Error(
      'IndexedDB non è disponibile. Assicurati di non essere in modalità incognito e che il tuo browser supporti IndexedDB.'
    );
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      logger.error('Failed to open IndexedDB:', request.error);
      reject(new Error('Impossibile aprire il database'));
    };

    request.onsuccess = () => {
      db = request.result;
      logger.info('IndexedDB initialized successfully');
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!database.objectStoreNames.contains(STORES.CUSTOMERS)) {
        const customerStore = database.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
        customerStore.createIndex('email', 'email', { unique: false });
        customerStore.createIndex('phone', 'phone', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.SERVICES)) {
        const serviceStore = database.createObjectStore(STORES.SERVICES, { keyPath: 'id' });
        serviceStore.createIndex('category', 'category', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.STAFF)) {
        const staffStore = database.createObjectStore(STORES.STAFF, { keyPath: 'id' });
        staffStore.createIndex('role', 'role', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.APPOINTMENTS)) {
        const appointmentStore = database.createObjectStore(STORES.APPOINTMENTS, { keyPath: 'id' });
        appointmentStore.createIndex('customerId', 'customerId', { unique: false });
        appointmentStore.createIndex('staffId', 'staffId', { unique: false });
        appointmentStore.createIndex('serviceId', 'serviceId', { unique: false });
        appointmentStore.createIndex('date', 'date', { unique: false });
        appointmentStore.createIndex('status', 'status', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.PAYMENTS)) {
        const paymentStore = database.createObjectStore(STORES.PAYMENTS, { keyPath: 'id' });
        paymentStore.createIndex('appointmentId', 'appointmentId', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.REMINDERS)) {
        const reminderStore = database.createObjectStore(STORES.REMINDERS, { keyPath: 'id' });
        reminderStore.createIndex('appointmentId', 'appointmentId', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.STAFF_ROLES)) {
        database.createObjectStore(STORES.STAFF_ROLES, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORES.SERVICE_CATEGORIES)) {
        database.createObjectStore(STORES.SERVICE_CATEGORIES, { keyPath: 'id' });
      }

      logger.info('IndexedDB schema upgraded to version', DB_VERSION);
    };
  });
}

/**
 * Get database instance
 */
function getDB(): IDBDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initIndexedDB() first.');
  }
  return db;
}

/**
 * Generic get operation
 */
async function get<T>(storeName: string, id: string): Promise<T | undefined> {
  const database = getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic getAll operation
 */
async function getAll<T>(storeName: string): Promise<T[]> {
  const database = getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic add operation
 */
async function add<T>(storeName: string, item: T): Promise<void> {
  const database = getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic update operation
 */
async function update<T>(storeName: string, item: T): Promise<void> {
  const database = getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic delete operation
 */
async function remove(storeName: string, id: string): Promise<void> {
  const database = getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic query by index
 */
async function getByIndex<T>(
  storeName: string,
  indexName: string,
  value: string
): Promise<T[]> {
  const database = getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// CRUD Operations for Customers
// ============================================

export async function getAllCustomers(): Promise<Customer[]> {
  return getAll<Customer>(STORES.CUSTOMERS);
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  return get<Customer>(STORES.CUSTOMERS, id);
}

export async function addCustomer(customer: Customer): Promise<void> {
  return add(STORES.CUSTOMERS, customer);
}

export async function updateCustomer(customer: Customer): Promise<void> {
  return update(STORES.CUSTOMERS, customer);
}

export async function deleteCustomer(id: string): Promise<void> {
  return remove(STORES.CUSTOMERS, id);
}

// ============================================
// CRUD Operations for Services
// ============================================

export async function getAllServices(): Promise<Service[]> {
  return getAll<Service>(STORES.SERVICES);
}

export async function getService(id: string): Promise<Service | undefined> {
  return get<Service>(STORES.SERVICES, id);
}

export async function addService(service: Service): Promise<void> {
  return add(STORES.SERVICES, service);
}

export async function updateService(service: Service): Promise<void> {
  return update(STORES.SERVICES, service);
}

export async function deleteService(id: string): Promise<void> {
  return remove(STORES.SERVICES, id);
}

// ============================================
// CRUD Operations for Staff
// ============================================

export async function getAllStaff(): Promise<Staff[]> {
  return getAll<Staff>(STORES.STAFF);
}

export async function getStaff(id: string): Promise<Staff | undefined> {
  return get<Staff>(STORES.STAFF, id);
}

export async function addStaff(staff: Staff): Promise<void> {
  return add(STORES.STAFF, staff);
}

export async function updateStaff(staff: Staff): Promise<void> {
  return update(STORES.STAFF, staff);
}

export async function deleteStaff(id: string): Promise<void> {
  return remove(STORES.STAFF, id);
}

// ============================================
// CRUD Operations for Appointments
// ============================================

export async function getAllAppointments(): Promise<Appointment[]> {
  return getAll<Appointment>(STORES.APPOINTMENTS);
}

export async function getAppointment(id: string): Promise<Appointment | undefined> {
  return get<Appointment>(STORES.APPOINTMENTS, id);
}

export async function addAppointment(appointment: Appointment): Promise<void> {
  return add(STORES.APPOINTMENTS, appointment);
}

export async function updateAppointment(appointment: Appointment): Promise<void> {
  return update(STORES.APPOINTMENTS, appointment);
}

export async function deleteAppointment(id: string): Promise<void> {
  return remove(STORES.APPOINTMENTS, id);
}

// ============================================
// CRUD Operations for Payments
// ============================================

export async function getAllPayments(): Promise<Payment[]> {
  return getAll<Payment>(STORES.PAYMENTS);
}

export async function getPayment(id: string): Promise<Payment | undefined> {
  return get<Payment>(STORES.PAYMENTS, id);
}

export async function addPayment(payment: Payment): Promise<void> {
  return add(STORES.PAYMENTS, payment);
}

export async function updatePayment(payment: Payment): Promise<void> {
  return update(STORES.PAYMENTS, payment);
}

export async function deletePayment(id: string): Promise<void> {
  return remove(STORES.PAYMENTS, id);
}

// ============================================
// CRUD Operations for Reminders
// ============================================

export async function getAllReminders(): Promise<Reminder[]> {
  return getAll<Reminder>(STORES.REMINDERS);
}

export async function getReminder(id: string): Promise<Reminder | undefined> {
  return get<Reminder>(STORES.REMINDERS, id);
}

export async function addReminder(reminder: Reminder): Promise<void> {
  return add(STORES.REMINDERS, reminder);
}

export async function updateReminder(reminder: Reminder): Promise<void> {
  return update(STORES.REMINDERS, reminder);
}

export async function deleteReminder(id: string): Promise<void> {
  return remove(STORES.REMINDERS, id);
}

// ============================================
// CRUD Operations for Staff Roles
// ============================================

export async function getAllStaffRoles(): Promise<StaffRole[]> {
  return getAll<StaffRole>(STORES.STAFF_ROLES);
}

export async function getStaffRole(id: string): Promise<StaffRole | undefined> {
  return get<StaffRole>(STORES.STAFF_ROLES, id);
}

export async function addStaffRole(role: StaffRole): Promise<void> {
  return add(STORES.STAFF_ROLES, role);
}

export async function updateStaffRole(role: StaffRole): Promise<void> {
  return update(STORES.STAFF_ROLES, role);
}

export async function deleteStaffRole(id: string): Promise<void> {
  return remove(STORES.STAFF_ROLES, id);
}

// ============================================
// CRUD Operations for Service Categories
// ============================================

export async function getAllServiceCategories(): Promise<ServiceCategory[]> {
  return getAll<ServiceCategory>(STORES.SERVICE_CATEGORIES);
}

export async function getServiceCategory(id: string): Promise<ServiceCategory | undefined> {
  return get<ServiceCategory>(STORES.SERVICE_CATEGORIES, id);
}

export async function addServiceCategory(category: ServiceCategory): Promise<void> {
  return add(STORES.SERVICE_CATEGORIES, category);
}

export async function updateServiceCategory(category: ServiceCategory): Promise<void> {
  return update(STORES.SERVICE_CATEGORIES, category);
}

export async function deleteServiceCategory(id: string): Promise<void> {
  return remove(STORES.SERVICE_CATEGORIES, id);
}

// ============================================
// Query Functions
// ============================================

/**
 * Get all appointments for a specific customer
 */
export async function getCustomerAppointments(customerId: string): Promise<Appointment[]> {
  return getByIndex<Appointment>(STORES.APPOINTMENTS, 'customerId', customerId);
}

/**
 * Get future appointments for a specific customer
 */
export async function getCustomerFutureAppointments(customerId: string): Promise<Appointment[]> {
  const appointments = await getCustomerAppointments(customerId);
  const now = new Date().toISOString();
  return appointments.filter(apt => apt.date >= now.split('T')[0]);
}

/**
 * Get all appointments for a specific staff member
 */
export async function getStaffAppointments(staffId: string): Promise<Appointment[]> {
  return getByIndex<Appointment>(STORES.APPOINTMENTS, 'staffId', staffId);
}

/**
 * Get future appointments for a specific staff member
 */
export async function getStaffFutureAppointments(staffId: string): Promise<Appointment[]> {
  const appointments = await getStaffAppointments(staffId);
  const now = new Date().toISOString();
  return appointments.filter(apt => apt.date >= now.split('T')[0]);
}

/**
 * Get all appointments for a specific service
 */
export async function getServiceAppointments(serviceId: string): Promise<{
  past: Appointment[];
  future: Appointment[];
}> {
  const appointments = await getByIndex<Appointment>(STORES.APPOINTMENTS, 'serviceId', serviceId);
  const now = new Date().toISOString().split('T')[0];

  const past = appointments.filter(apt => apt.date < now);
  const future = appointments.filter(apt => apt.date >= now);

  return { past, future };
}

/**
 * Get all payments for a specific appointment
 */
export async function getAppointmentPayments(appointmentId: string): Promise<Payment[]> {
  return getByIndex<Payment>(STORES.PAYMENTS, 'appointmentId', appointmentId);
}

// ============================================
// Validation Functions
// ============================================

/**
 * Check if a customer can be deleted (no future appointments)
 */
export async function canDeleteCustomer(customerId: string): Promise<{
  canDelete: boolean;
  reason?: string;
  futureAppointments: number;
}> {
  const futureAppointments = await getCustomerFutureAppointments(customerId);
  const count = futureAppointments.length;

  return {
    canDelete: count === 0,
    reason: count > 0 ? `Il cliente ha ${count} appuntamento/i futuro/i` : undefined,
    futureAppointments: count,
  };
}

/**
 * Check if a staff member can be deleted (no future appointments)
 */
export async function canDeleteStaff(staffId: string): Promise<{
  canDelete: boolean;
  reason?: string;
  futureAppointments: number;
}> {
  const futureAppointments = await getStaffFutureAppointments(staffId);
  const count = futureAppointments.length;

  return {
    canDelete: count === 0,
    reason: count > 0 ? `Il membro del personale ha ${count} appuntamento/i futuro/i` : undefined,
    futureAppointments: count,
  };
}

/**
 * Check if a service can be deleted (no future appointments)
 */
export async function canDeleteService(serviceId: string): Promise<{
  canDelete: boolean;
  reason?: string;
  futureAppointments: number;
}> {
  const { future } = await getServiceAppointments(serviceId);
  const count = future.length;

  return {
    canDelete: count === 0,
    reason: count > 0 ? `Il servizio ha ${count} appuntamento/i futuro/i` : undefined,
    futureAppointments: count,
  };
}

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
  const [
    customers,
    services,
    staff,
    appointments,
    payments,
    reminders,
    staffRoles,
    serviceCategories,
  ] = await Promise.all([
    getAllCustomers(),
    getAllServices(),
    getAllStaff(),
    getAllAppointments(),
    getAllPayments(),
    getAllReminders(),
    getAllStaffRoles(),
    getAllServiceCategories(),
  ]);

  return {
    customers: customers.length,
    services: services.length,
    staff: staff.length,
    appointments: appointments.length,
    payments: payments.length,
    reminders: reminders.length,
    staffRoles: staffRoles.length,
    serviceCategories: serviceCategories.length,
  };
}

/**
 * Export all data (for backup)
 */
export async function exportData(): Promise<{
  customers: Customer[];
  services: Service[];
  staff: Staff[];
  appointments: Appointment[];
  payments: Payment[];
  reminders: Reminder[];
  staffRoles: StaffRole[];
  serviceCategories: ServiceCategory[];
}> {
  const [
    customers,
    services,
    staff,
    appointments,
    payments,
    reminders,
    staffRoles,
    serviceCategories,
  ] = await Promise.all([
    getAllCustomers(),
    getAllServices(),
    getAllStaff(),
    getAllAppointments(),
    getAllPayments(),
    getAllReminders(),
    getAllStaffRoles(),
    getAllServiceCategories(),
  ]);

  return {
    customers,
    services,
    staff,
    appointments,
    payments,
    reminders,
    staffRoles,
    serviceCategories,
  };
}

/**
 * Import all data (for restore)
 */
export async function importData(data: {
  customers?: Customer[];
  services?: Service[];
  staff?: Staff[];
  appointments?: Appointment[];
  payments?: Payment[];
  reminders?: Reminder[];
  staffRoles?: StaffRole[];
  serviceCategories?: ServiceCategory[];
}): Promise<void> {
  const database = getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      [
        STORES.CUSTOMERS,
        STORES.SERVICES,
        STORES.STAFF,
        STORES.APPOINTMENTS,
        STORES.PAYMENTS,
        STORES.REMINDERS,
        STORES.STAFF_ROLES,
        STORES.SERVICE_CATEGORIES,
      ],
      'readwrite'
    );

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    // Import each type of data
    if (data.customers) {
      const store = transaction.objectStore(STORES.CUSTOMERS);
      data.customers.forEach(item => store.put(item));
    }

    if (data.services) {
      const store = transaction.objectStore(STORES.SERVICES);
      data.services.forEach(item => store.put(item));
    }

    if (data.staff) {
      const store = transaction.objectStore(STORES.STAFF);
      data.staff.forEach(item => store.put(item));
    }

    if (data.appointments) {
      const store = transaction.objectStore(STORES.APPOINTMENTS);
      data.appointments.forEach(item => store.put(item));
    }

    if (data.payments) {
      const store = transaction.objectStore(STORES.PAYMENTS);
      data.payments.forEach(item => store.put(item));
    }

    if (data.reminders) {
      const store = transaction.objectStore(STORES.REMINDERS);
      data.reminders.forEach(item => store.put(item));
    }

    if (data.staffRoles) {
      const store = transaction.objectStore(STORES.STAFF_ROLES);
      data.staffRoles.forEach(item => store.put(item));
    }

    if (data.serviceCategories) {
      const store = transaction.objectStore(STORES.SERVICE_CATEGORIES);
      data.serviceCategories.forEach(item => store.put(item));
    }
  });
}

/**
 * Clear all data from database
 */
export async function clearAllData(): Promise<void> {
  const database = getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      [
        STORES.CUSTOMERS,
        STORES.SERVICES,
        STORES.STAFF,
        STORES.APPOINTMENTS,
        STORES.PAYMENTS,
        STORES.REMINDERS,
        STORES.STAFF_ROLES,
        STORES.SERVICE_CATEGORIES,
      ],
      'readwrite'
    );

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    // Clear all object stores
    transaction.objectStore(STORES.CUSTOMERS).clear();
    transaction.objectStore(STORES.SERVICES).clear();
    transaction.objectStore(STORES.STAFF).clear();
    transaction.objectStore(STORES.APPOINTMENTS).clear();
    transaction.objectStore(STORES.PAYMENTS).clear();
    transaction.objectStore(STORES.REMINDERS).clear();
    transaction.objectStore(STORES.STAFF_ROLES).clear();
    transaction.objectStore(STORES.SERVICE_CATEGORIES).clear();
  });
}
