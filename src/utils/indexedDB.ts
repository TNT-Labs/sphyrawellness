/**
 * IndexedDB implementation for local storage
 * This module provides all database operations using native IndexedDB API
 * 
 * NOTA: Questo file NON richiede modifiche. Le funzioni *FromSync già esistenti
 * prevengono correttamente i loop di sincronizzazione.
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
import { logger } from './logger';
import { syncAdd, syncUpdate, syncDelete } from './dbBridge';

const DB_NAME = 'sphyra-wellness-db';
const DB_VERSION = 5; // Incrementato per aggiungere store deletedItems

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
  USERS: 'users',
  DELETED_ITEMS: 'deletedItems', // NUOVO: Tracking permanente delle cancellazioni
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
  } catch {
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

      // Handle database connection close events
      db.onclose = () => {
        logger.warn('IndexedDB connection closed unexpectedly');
        db = null;
      };

      // Handle version change from another tab
      db.onversionchange = () => {
        logger.warn('IndexedDB version change detected, closing connection');
        if (db) {
          db.close();
          db = null;
        }
        // Notify user or reload if needed
        logger.info('Database schema is being upgraded by another tab');
      };

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

      if (!database.objectStoreNames.contains(STORES.USERS)) {
        const userStore = database.createObjectStore(STORES.USERS, { keyPath: 'id' });
        userStore.createIndex('username', 'username', { unique: true });
        userStore.createIndex('role', 'role', { unique: false });
      }

      // NUOVO: Store per tracking permanente delle cancellazioni
      if (!database.objectStoreNames.contains(STORES.DELETED_ITEMS)) {
        const deletedStore = database.createObjectStore(STORES.DELETED_ITEMS, { keyPath: 'key' });
        deletedStore.createIndex('storeName', 'storeName', { unique: false });
        deletedStore.createIndex('deletedAt', 'deletedAt', { unique: false });
        logger.info('Created deletedItems store for permanent deletion tracking');
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
 * Create a transaction with error handling for closing connections
 */
function createTransaction(storeName: string | string[], mode: IDBTransactionMode): IDBTransaction {
  const database = getDB();
  try {
    return database.transaction(storeName, mode);
  } catch (error: any) {
    // If connection is closing, clear the db reference and throw a clearer error
    if (error.name === 'InvalidStateError' && error.message.includes('closing')) {
      logger.error('Database connection is closing, cannot create transaction');
      db = null;
      throw new Error('Database connection is closing. Please refresh the page.');
    }
    throw error;
  }
}

/**
 * Generic get operation
 */
async function get<T>(storeName: string, id: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generic getAll operation
 */
async function getAll<T>(storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generic add operation
 * Automatically adds createdAt and updatedAt timestamps if not present
 * IMPORTANTE: Triggera sync verso PouchDB tramite dbBridge
 */
async function add<T extends Record<string, any>>(storeName: string, item: T): Promise<void> {
  // Add timestamps if not present
  const now = new Date().toISOString();
  const itemWithTimestamps = {
    ...item,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now,
  };

  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(itemWithTimestamps);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generic update operation
 * Automatically adds updatedAt timestamp
 * IMPORTANTE: Triggera sync verso PouchDB tramite dbBridge
 */
async function update<T extends Record<string, any>>(storeName: string, item: T): Promise<void> {
  // Add updatedAt timestamp
  const itemWithTimestamp = {
    ...item,
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(itemWithTimestamp);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Update operation from sync - does NOT trigger sync back to PouchDB
 * and preserves original timestamps
 * IMPORTANTE: Utilizzata da pouchdbSync per prevenire loop infiniti
 */
async function updateFromSync<T extends Record<string, any>>(storeName: string, item: T): Promise<void> {
  // Use item as-is, preserving all timestamps from sync
  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Delete operation specifically for sync (doesn't trigger sync back to PouchDB)
 * Used when receiving deleted documents from remote sync
 */
async function deleteFromSync(storeName: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generic delete operation
 */
async function remove(storeName: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
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
  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
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
  await add(STORES.CUSTOMERS, customer);
  // Sync to PouchDB in background (non-blocking)
  syncAdd('customers', customer).catch(err =>
    logger.error('Background sync failed for customer add:', err)
  );
}

export async function updateCustomer(customer: Customer): Promise<void> {
  await update(STORES.CUSTOMERS, customer);
  // Sync to PouchDB in background (non-blocking)
  syncUpdate('customers', customer).catch(err =>
    logger.error('Background sync failed for customer update:', err)
  );
}

/**
 * Update customer from sync - does NOT trigger sync loop
 * IMPORTANTE: Chiamata da pouchdbSync, NON triggera dbBridge
 */
export async function updateCustomerFromSync(customer: Customer): Promise<void> {
  await updateFromSync(STORES.CUSTOMERS, customer);
}

/**
 * Delete customer from sync - does NOT trigger sync loop
 */
export async function deleteCustomerFromSync(id: string): Promise<void> {
  await deleteFromSync(STORES.CUSTOMERS, id);
}

export async function deleteCustomer(id: string): Promise<void> {
  await remove(STORES.CUSTOMERS, id);
  // IMPORTANTE: Registra la cancellazione permanentemente
  await recordDeletion('customers', id);
  // Sync to PouchDB in background (non-blocking)
  syncDelete('customers', id).catch(err =>
    logger.error('Background sync failed for customer delete:', err)
  );
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
  await add(STORES.SERVICES, service);
  // Sync to PouchDB in background (non-blocking)
  syncAdd('services', service).catch(err =>
    logger.error('Background sync failed for service add:', err)
  );
}

export async function updateService(service: Service): Promise<void> {
  await update(STORES.SERVICES, service);
  // Sync to PouchDB in background (non-blocking)
  syncUpdate('services', service).catch(err =>
    logger.error('Background sync failed for service update:', err)
  );
}

/**
 * Update service from sync - does NOT trigger sync loop
 */
export async function updateServiceFromSync(service: Service): Promise<void> {
  await updateFromSync(STORES.SERVICES, service);
}

/**
 * Delete service from sync - does NOT trigger sync loop
 */
export async function deleteServiceFromSync(id: string): Promise<void> {
  await deleteFromSync(STORES.SERVICES, id);
}

export async function deleteService(id: string): Promise<void> {
  await remove(STORES.SERVICES, id);
  // IMPORTANTE: Registra la cancellazione permanentemente
  await recordDeletion('services', id);
  // Sync to PouchDB in background (non-blocking)
  syncDelete('services', id).catch(err =>
    logger.error('Background sync failed for service delete:', err)
  );
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
  await add(STORES.STAFF, staff);
  // Sync to PouchDB in background (non-blocking)
  syncAdd('staff', staff).catch(err =>
    logger.error('Background sync failed for staff add:', err)
  );
}

export async function updateStaff(staff: Staff): Promise<void> {
  await update(STORES.STAFF, staff);
  // Sync to PouchDB in background (non-blocking)
  syncUpdate('staff', staff).catch(err =>
    logger.error('Background sync failed for staff update:', err)
  );
}

/**
 * Update staff from sync - does NOT trigger sync loop
 */
export async function updateStaffFromSync(staff: Staff): Promise<void> {
  await updateFromSync(STORES.STAFF, staff);
}

/**
 * Delete staff from sync - does NOT trigger sync loop
 */
export async function deleteStaffFromSync(id: string): Promise<void> {
  await deleteFromSync(STORES.STAFF, id);
}

export async function deleteStaff(id: string): Promise<void> {
  await remove(STORES.STAFF, id);
  // IMPORTANTE: Registra la cancellazione permanentemente
  await recordDeletion('staff', id);
  // Sync to PouchDB in background (non-blocking)
  syncDelete('staff', id).catch(err =>
    logger.error('Background sync failed for staff delete:', err)
  );
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
  await add(STORES.APPOINTMENTS, appointment);
  // Sync to PouchDB in background (non-blocking)
  syncAdd('appointments', appointment).catch(err =>
    logger.error('Background sync failed for appointment add:', err)
  );
}

export async function updateAppointment(appointment: Appointment): Promise<void> {
  await update(STORES.APPOINTMENTS, appointment);
  // Sync to PouchDB in background (non-blocking)
  syncUpdate('appointments', appointment).catch(err =>
    logger.error('Background sync failed for appointment update:', err)
  );
}

/**
 * Update appointment from sync - does NOT trigger sync loop
 * Used when receiving data from PouchDB sync to prevent infinite loops
 */
export async function updateAppointmentFromSync(appointment: Appointment): Promise<void> {
  await updateFromSync(STORES.APPOINTMENTS, appointment);
}

/**
 * Delete appointment from sync - does NOT trigger sync loop
 * Used when receiving deleted documents from PouchDB sync
 */
export async function deleteAppointmentFromSync(id: string): Promise<void> {
  await deleteFromSync(STORES.APPOINTMENTS, id);
}

export async function deleteAppointment(id: string): Promise<void> {
  await remove(STORES.APPOINTMENTS, id);
  // IMPORTANTE: Registra la cancellazione permanentemente
  await recordDeletion('appointments', id);
  // Sync to PouchDB in background (non-blocking)
  syncDelete('appointments', id).catch(err =>
    logger.error('Background sync failed for appointment delete:', err)
  );
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
  await add(STORES.PAYMENTS, payment);
  // Sync to PouchDB in background (non-blocking)
  syncAdd('payments', payment).catch(err =>
    logger.error('Background sync failed for payment add:', err)
  );
}

export async function updatePayment(payment: Payment): Promise<void> {
  await update(STORES.PAYMENTS, payment);
  // Sync to PouchDB in background (non-blocking)
  syncUpdate('payments', payment).catch(err =>
    logger.error('Background sync failed for payment update:', err)
  );
}

/**
 * Update payment from sync - does NOT trigger sync loop
 */
export async function updatePaymentFromSync(payment: Payment): Promise<void> {
  await updateFromSync(STORES.PAYMENTS, payment);
}

/**
 * Delete payment from sync - does NOT trigger sync loop
 */
export async function deletePaymentFromSync(id: string): Promise<void> {
  await deleteFromSync(STORES.PAYMENTS, id);
}

export async function deletePayment(id: string): Promise<void> {
  await remove(STORES.PAYMENTS, id);
  // IMPORTANTE: Registra la cancellazione permanentemente
  await recordDeletion('payments', id);
  // Sync to PouchDB in background (non-blocking)
  syncDelete('payments', id).catch(err =>
    logger.error('Background sync failed for payment delete:', err)
  );
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
  await add(STORES.REMINDERS, reminder);
  // Sync to PouchDB in background (non-blocking)
  syncAdd('reminders', reminder).catch(err =>
    logger.error('Background sync failed for reminder add:', err)
  );
}

export async function updateReminder(reminder: Reminder): Promise<void> {
  await update(STORES.REMINDERS, reminder);
  // Sync to PouchDB in background (non-blocking)
  syncUpdate('reminders', reminder).catch(err =>
    logger.error('Background sync failed for reminder update:', err)
  );
}

/**
 * Update reminder from sync - does NOT trigger sync loop
 * Used when receiving data from PouchDB sync to prevent infinite loops
 */
export async function updateReminderFromSync(reminder: Reminder): Promise<void> {
  await updateFromSync(STORES.REMINDERS, reminder);
}

/**
 * Delete reminder from sync - does NOT trigger sync loop
 */
export async function deleteReminderFromSync(id: string): Promise<void> {
  await deleteFromSync(STORES.REMINDERS, id);
}

export async function deleteReminder(id: string): Promise<void> {
  await remove(STORES.REMINDERS, id);
  // IMPORTANTE: Registra la cancellazione permanentemente
  await recordDeletion('reminders', id);
  // Sync to PouchDB in background (non-blocking)
  syncDelete('reminders', id).catch(err =>
    logger.error('Background sync failed for reminder delete:', err)
  );
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
  await add(STORES.STAFF_ROLES, role);
  // Sync to PouchDB in background (non-blocking)
  syncAdd('staffRoles', role).catch(err =>
    logger.error('Background sync failed for staff role add:', err)
  );
}

export async function updateStaffRole(role: StaffRole): Promise<void> {
  await update(STORES.STAFF_ROLES, role);
  // Sync to PouchDB in background (non-blocking)
  syncUpdate('staffRoles', role).catch(err =>
    logger.error('Background sync failed for staff role update:', err)
  );
}

/**
 * Update staff role from sync - does NOT trigger sync loop
 */
export async function updateStaffRoleFromSync(role: StaffRole): Promise<void> {
  await updateFromSync(STORES.STAFF_ROLES, role);
}

/**
 * Delete staff role from sync - does NOT trigger sync loop
 */
export async function deleteStaffRoleFromSync(id: string): Promise<void> {
  await deleteFromSync(STORES.STAFF_ROLES, id);
}

export async function deleteStaffRole(id: string): Promise<void> {
  await remove(STORES.STAFF_ROLES, id);
  // IMPORTANTE: Registra la cancellazione permanentemente
  await recordDeletion('staffRoles', id);
  // Sync to PouchDB in background (non-blocking)
  syncDelete('staffRoles', id).catch(err =>
    logger.error('Background sync failed for staff role delete:', err)
  );
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
  await add(STORES.SERVICE_CATEGORIES, category);
  // Sync to PouchDB in background (non-blocking)
  syncAdd('serviceCategories', category).catch(err =>
    logger.error('Background sync failed for service category add:', err)
  );
}

export async function updateServiceCategory(category: ServiceCategory): Promise<void> {
  await update(STORES.SERVICE_CATEGORIES, category);
  // Sync to PouchDB in background (non-blocking)
  syncUpdate('serviceCategories', category).catch(err =>
    logger.error('Background sync failed for service category update:', err)
  );
}

/**
 * Update service category from sync - does NOT trigger sync loop
 */
export async function updateServiceCategoryFromSync(category: ServiceCategory): Promise<void> {
  await updateFromSync(STORES.SERVICE_CATEGORIES, category);
}

/**
 * Delete service category from sync - does NOT trigger sync loop
 */
export async function deleteServiceCategoryFromSync(id: string): Promise<void> {
  await deleteFromSync(STORES.SERVICE_CATEGORIES, id);
}

export async function deleteServiceCategory(id: string): Promise<void> {
  await remove(STORES.SERVICE_CATEGORIES, id);
  // IMPORTANTE: Registra la cancellazione permanentemente
  await recordDeletion('serviceCategories', id);
  // Sync to PouchDB in background (non-blocking)
  syncDelete('serviceCategories', id).catch(err =>
    logger.error('Background sync failed for service category delete:', err)
  );
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
// Deletion Tracking Functions
// ============================================

/**
 * Type for deleted item tracking
 */
interface DeletedItem {
  key: string; // "storeName:id"
  storeName: string;
  itemId: string;
  deletedAt: string; // ISO timestamp
}

/**
 * Record a deletion permanently in IndexedDB
 */
export async function recordDeletion(storeName: string, id: string): Promise<void> {
  const key = `${storeName}:${id}`;
  const deletedItem: DeletedItem = {
    key,
    storeName,
    itemId: id,
    deletedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(STORES.DELETED_ITEMS, 'readwrite');
      const store = transaction.objectStore(STORES.DELETED_ITEMS);
      const request = store.put(deletedItem);

      request.onsuccess = () => {
        logger.debug(`[DeletionTracking] Recorded deletion: ${key}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Check if an item was deleted (permanently tracked)
 */
export async function wasItemDeleted(storeName: string, id: string): Promise<boolean> {
  const key = `${storeName}:${id}`;

  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(STORES.DELETED_ITEMS, 'readonly');
      const store = transaction.objectStore(STORES.DELETED_ITEMS);
      const request = store.get(key);

      request.onsuccess = () => {
        const exists = !!request.result;
        if (exists) {
          logger.debug(`[DeletionTracking] Item was deleted: ${key} at ${request.result.deletedAt}`);
        }
        resolve(exists);
      };
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Remove an item from deletion tracking (if it's restored)
 */
export async function clearDeletionRecord(storeName: string, id: string): Promise<void> {
  const key = `${storeName}:${id}`;

  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(STORES.DELETED_ITEMS, 'readwrite');
      const store = transaction.objectStore(STORES.DELETED_ITEMS);
      const request = store.delete(key);

      request.onsuccess = () => {
        logger.debug(`[DeletionTracking] Cleared deletion record: ${key}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get all deletion records (for debugging/admin)
 */
export async function getAllDeletionRecords(): Promise<DeletedItem[]> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(STORES.DELETED_ITEMS, 'readonly');
      const store = transaction.objectStore(STORES.DELETED_ITEMS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Clean old deletion records (older than specified days)
 * Useful to prevent the store from growing indefinitely
 */
export async function cleanOldDeletionRecords(olderThanDays: number = 365): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffTimestamp = cutoffDate.toISOString();

  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(STORES.DELETED_ITEMS, 'readwrite');
      const store = transaction.objectStore(STORES.DELETED_ITEMS);
      const index = store.index('deletedAt');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTimestamp));

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          logger.info(`[DeletionTracking] Cleaned ${deletedCount} old deletion records (older than ${olderThanDays} days)`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
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
  users: number;
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
    users,
  ] = await Promise.all([
    getAllCustomers(),
    getAllServices(),
    getAllStaff(),
    getAllAppointments(),
    getAllPayments(),
    getAllReminders(),
    getAllStaffRoles(),
    getAllServiceCategories(),
    getAllUsers(),
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
    users: users.length,
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
  users: User[];
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
    users,
  ] = await Promise.all([
    getAllCustomers(),
    getAllServices(),
    getAllStaff(),
    getAllAppointments(),
    getAllPayments(),
    getAllReminders(),
    getAllStaffRoles(),
    getAllServiceCategories(),
    getAllUsers(),
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
    users,
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
  users?: User[];
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
        STORES.USERS,
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

    if (data.users) {
      const store = transaction.objectStore(STORES.USERS);
      data.users.forEach(item => store.put(item));
    }
  });
}

// ============================================
// CRUD Operations for Users
// ============================================

export async function getAllUsers(): Promise<User[]> {
  return getAll<User>(STORES.USERS);
}

export async function getUser(id: string): Promise<User | undefined> {
  return get<User>(STORES.USERS, id);
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const users = await getByIndex<User>(STORES.USERS, 'username', username);
  return users[0];
}

export async function addUser(user: User): Promise<void> {
  await add(STORES.USERS, user);
  // Sync to PouchDB in background (non-blocking)
  syncAdd('users', user).catch(err =>
    logger.error('Background sync failed for user add:', err)
  );
}

export async function updateUser(user: User): Promise<void> {
  await update(STORES.USERS, user);
  // Sync to PouchDB in background (non-blocking)
  syncUpdate('users', user).catch(err =>
    logger.error('Background sync failed for user update:', err)
  );
}

/**
 * Update user from sync - does NOT trigger sync loop
 */
export async function updateUserFromSync(user: User): Promise<void> {
  await updateFromSync(STORES.USERS, user);
}

/**
 * Delete user from sync - does NOT trigger sync loop
 */
export async function deleteUserFromSync(id: string): Promise<void> {
  await deleteFromSync(STORES.USERS, id);
}

export async function deleteUser(id: string): Promise<void> {
  await remove(STORES.USERS, id);
  // IMPORTANTE: Registra la cancellazione permanentemente
  await recordDeletion('users', id);
  // Sync to PouchDB in background (non-blocking)
  syncDelete('users', id).catch(err =>
    logger.error('Background sync failed for user delete:', err)
  );
}

// ============================================
// Utility Functions
// ============================================

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
        STORES.USERS,
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
    transaction.objectStore(STORES.USERS).clear();
  });
}
