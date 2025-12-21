/**
 * IndexedDB implementation for local storage
 * Full CRUD with soft-delete to fix persistent deletion bug
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
const DB_VERSION = 4;

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
} as const;

let db: IDBDatabase | null = null;

function isIndexedDBAvailable(): boolean {
  try {
    return !!window.indexedDB;
  } catch {
    return false;
  }
}

export async function initIndexedDB(): Promise<void> {
  if (!isIndexedDBAvailable()) throw new Error('IndexedDB non disponibile.');

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      db.onversionchange = () => {
        logger.warn('Database version change detected. Closing.');
        db?.close();
        db = null;
      };
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Customers
      if (!database.objectStoreNames.contains(STORES.CUSTOMERS)) {
        const store = database.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
        store.createIndex('email', 'email', { unique: false });
        store.createIndex('phone', 'phone', { unique: false });
      }

      // Services
      if (!database.objectStoreNames.contains(STORES.SERVICES)) {
        const store = database.createObjectStore(STORES.SERVICES, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
      }

      // Staff
      if (!database.objectStoreNames.contains(STORES.STAFF)) {
        const store = database.createObjectStore(STORES.STAFF, { keyPath: 'id' });
        store.createIndex('role', 'role', { unique: false });
      }

      // Appointments
      if (!database.objectStoreNames.contains(STORES.APPOINTMENTS)) {
        const store = database.createObjectStore(STORES.APPOINTMENTS, { keyPath: 'id' });
        store.createIndex('customerId', 'customerId', { unique: false });
        store.createIndex('staffId', 'staffId', { unique: false });
        store.createIndex('serviceId', 'serviceId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      // Payments
      if (!database.objectStoreNames.contains(STORES.PAYMENTS)) {
        const store = database.createObjectStore(STORES.PAYMENTS, { keyPath: 'id' });
        store.createIndex('appointmentId', 'appointmentId', { unique: false });
      }

      // Reminders
      if (!database.objectStoreNames.contains(STORES.REMINDERS)) {
        const store = database.createObjectStore(STORES.REMINDERS, { keyPath: 'id' });
        store.createIndex('appointmentId', 'appointmentId', { unique: false });
      }

      // Staff roles
      if (!database.objectStoreNames.contains(STORES.STAFF_ROLES)) {
        database.createObjectStore(STORES.STAFF_ROLES, { keyPath: 'id' });
      }

      // Service categories
      if (!database.objectStoreNames.contains(STORES.SERVICE_CATEGORIES)) {
        database.createObjectStore(STORES.SERVICE_CATEGORIES, { keyPath: 'id' });
      }

      // Users
      if (!database.objectStoreNames.contains(STORES.USERS)) {
        const store = database.createObjectStore(STORES.USERS, { keyPath: 'id' });
        store.createIndex('username', 'username', { unique: true });
        store.createIndex('role', 'role', { unique: false });
      }
    };
  });
}

function getDB(): IDBDatabase {
  if (!db) throw new Error('DB non inizializzato.');
  return db;
}

function createTransaction(store: string | string[], mode: IDBTransactionMode): IDBTransaction {
  return getDB().transaction(store, mode);
}

// Generic helpers
async function get<T>(storeName: string, id: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = createTransaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAll<T>(storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const transaction = createTransaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []).filter((item: any) => !item.deleted));
    req.onerror = () => reject(req.error);
  });
}

async function add<T extends Record<string, any>>(storeName: string, item: T): Promise<void> {
  const now = new Date().toISOString();
  const itemWithTimestamps = { ...item, createdAt: item.createdAt || now, updatedAt: item.updatedAt || now };
  return new Promise((resolve, reject) => {
    const transaction = createTransaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const req = store.add(itemWithTimestamps);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function update<T extends Record<string, any>>(storeName: string, item: T): Promise<void> {
  const itemWithTimestamp = { ...item, updatedAt: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const transaction = createTransaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const req = store.put(itemWithTimestamp);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function updateFromSync<T extends Record<string, any>>(storeName: string, item: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = createTransaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function remove(storeName: string, id: string): Promise<void> {
  const item = await get(storeName, id);
  if (!item) return;
  const itemWithDeleted = { ...item, deleted: true, updatedAt: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const transaction = createTransaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const req = store.put(itemWithDeleted);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getByIndex<T>(storeName: string, indexName: string, value: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const transaction = createTransaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const req = index.getAll(value);
    req.onsuccess = () => resolve((req.result || []).filter((item: any) => !item.deleted));
    req.onerror = () => reject(req.error);
  });
}

// ============================
// CRUD per entità
// ============================

// Customers
export async function getAllCustomers(): Promise<Customer[]> {
  return getAll<Customer>(STORES.CUSTOMERS);
}
export async function getCustomer(id: string): Promise<Customer | undefined> {
  return get<Customer>(STORES.CUSTOMERS, id);
}
export async function addCustomer(customer: Customer): Promise<void> {
  await add(STORES.CUSTOMERS, customer);
  syncAdd('customers', customer).catch(err => logger.error('Sync add customer failed:', err));
}
export async function updateCustomer(customer: Customer): Promise<void> {
  await update(STORES.CUSTOMERS, customer);
  syncUpdate('customers', customer).catch(err => logger.error('Sync update customer failed:', err));
}
export async function updateCustomerFromSync(customer: Customer): Promise<void> {
  await updateFromSync(STORES.CUSTOMERS, customer);
}
export async function deleteCustomer(id: string): Promise<void> {
  await remove(STORES.CUSTOMERS, id);
  syncDelete('customers', id).catch(err => logger.error('Sync delete customer failed:', err));
}

// Services
export async function getAllServices(): Promise<Service[]> {
  return getAll<Service>(STORES.SERVICES);
}
export async function getService(id: string): Promise<Service | undefined> {
  return get<Service>(STORES.SERVICES, id);
}
export async function addService(service: Service): Promise<void> {
  await add(STORES.SERVICES, service);
  syncAdd('services', service).catch(err => logger.error('Sync add service failed:', err));
}
export async function updateService(service: Service): Promise<void> {
  await update(STORES.SERVICES, service);
  syncUpdate('services', service).catch(err => logger.error('Sync update service failed:', err));
}
export async function updateServiceFromSync(service: Service): Promise<void> {
  await updateFromSync(STORES.SERVICES, service);
}
export async function deleteService(id: string): Promise<void> {
  await remove(STORES.SERVICES, id);
  syncDelete('services', id).catch(err => logger.error('Sync delete service failed:', err));
}

// Staff
export async function getAllStaff(): Promise<Staff[]> {
  return getAll<Staff>(STORES.STAFF);
}
export async function getStaff(id: string): Promise<Staff | undefined> {
  return get<Staff>(STORES.STAFF, id);
}
export async function addStaff(staff: Staff): Promise<void> {
  await add(STORES.STAFF, staff);
  syncAdd('staff', staff).catch(err => logger.error('Sync add staff failed:', err));
}
export async function updateStaff(staff: Staff): Promise<void> {
  await update(STORES.STAFF, staff);
  syncUpdate('staff', staff).catch(err => logger.error('Sync update staff failed:', err));
}
export async function updateStaffFromSync(staff: Staff): Promise<void> {
  await updateFromSync(STORES.STAFF, staff);
}
export async function deleteStaff(id: string): Promise<void> {
  await remove(STORES.STAFF, id);
  syncDelete('staff', id).catch(err => logger.error('Sync delete staff failed:', err));
}

// Appointments
export async function getAllAppointments(): Promise<Appointment[]> {
  return getAll<Appointment>(STORES.APPOINTMENTS);
}
export async function getAppointment(id: string): Promise<Appointment | undefined> {
  return get<Appointment>(STORES.APPOINTMENTS, id);
}
export async function addAppointment(app: Appointment): Promise<void> {
  await add(STORES.APPOINTMENTS, app);
  syncAdd('appointments', app).catch(err => logger.error('Sync add appointment failed:', err));
}
export async function updateAppointment(app: Appointment): Promise<void> {
  await update(STORES.APPOINTMENTS, app);
  syncUpdate('appointments', app).catch(err => logger.error('Sync update appointment failed:', err));
}
export async function updateAppointmentFromSync(app: Appointment): Promise<void> {
  await updateFromSync(STORES.APPOINTMENTS, app);
}
export async function deleteAppointment(id: string): Promise<void> {
  await remove(STORES.APPOINTMENTS, id);
  syncDelete('appointments', id).catch(err => logger.error('Sync delete appointment failed:', err));
}

// Payments
export async function getAllPayments(): Promise<Payment[]> {
  return getAll<Payment>(STORES.PAYMENTS);
}
export async function getPayment(id: string): Promise<Payment | undefined> {
  return get<Payment>(STORES.PAYMENTS, id);
}
export async function addPayment(payment: Payment): Promise<void> {
  await add(STORES.PAYMENTS, payment);
  syncAdd('payments', payment).catch(err => logger.error('Sync add payment failed:', err));
}
export async function updatePayment(payment: Payment): Promise<void> {
  await update(STORES.PAYMENTS, payment);
  syncUpdate('payments', payment).catch(err => logger.error('Sync update payment failed:', err));
}
export async function updatePaymentFromSync(payment: Payment): Promise<void> {
  await updateFromSync(STORES.PAYMENTS, payment);
}
export async function deletePayment(id: string): Promise<void> {
  await remove(STORES.PAYMENTS, id);
  syncDelete('payments', id).catch(err => logger.error('Sync delete payment failed:', err));
}

// Reminders
export async function getAllReminders(): Promise<Reminder[]> {
  return getAll<Reminder>(STORES.REMINDERS);
}
export async function getReminder(id: string): Promise<Reminder | undefined> {
  return get<Reminder>(STORES.REMINDERS, id);
}
export async function addReminder(reminder: Reminder): Promise<void> {
  await add(STORES.REMINDERS, reminder);
  syncAdd('reminders', reminder).catch(err => logger.error('Sync add reminder failed:', err));
}
export async function updateReminder(reminder: Reminder): Promise<void> {
  await update(STORES.REMINDERS, reminder);
  syncUpdate('reminders', reminder).catch(err => logger.error('Sync update reminder failed:', err));
}
export async function updateReminderFromSync(reminder: Reminder): Promise<void> {
  await updateFromSync(STORES.REMINDERS, reminder);
}
export async function deleteReminder(id: string): Promise<void> {
  await remove(STORES.REMINDERS, id);
  syncDelete('reminders', id).catch(err => logger.error('Sync delete reminder failed:', err));
}

// Staff Roles
export async function getAllStaffRoles(): Promise<StaffRole[]> {
  return getAll<StaffRole>(STORES.STAFF_ROLES);
}
export async function getStaffRole(id: string): Promise<StaffRole | undefined> {
  return get<StaffRole>(STORES.STAFF_ROLES, id);
}
export async function addStaffRole(role: StaffRole): Promise<void> {
  await add(STORES.STAFF_ROLES, role);
  syncAdd('staffRoles', role).catch(err => logger.error('Sync add staff role failed:', err));
}
export async function updateStaffRole(role: StaffRole): Promise<void> {
  await update(STORES.STAFF_ROLES, role);
  syncUpdate('staffRoles', role).catch(err => logger.error('Sync update staff role failed:', err));
}
export async function updateStaffRoleFromSync(role: StaffRole): Promise<void> {
  await updateFromSync(STORES.STAFF_ROLES, role);
}
export async function deleteStaffRole(id: string): Promise<void> {
  await remove(STORES.STAFF_ROLES, id);
  syncDelete('staffRoles', id).catch(err => logger.error('Sync delete staff role failed:', err));
}

// Service Categories
export async function getAllServiceCategories(): Promise<ServiceCategory[]> {
  return getAll<ServiceCategory>(STORES.SERVICE_CATEGORIES);
}
export async function getServiceCategory(id: string): Promise<ServiceCategory | undefined> {
  return get<ServiceCategory>(STORES.SERVICE_CATEGORIES, id);
}
export async function addServiceCategory(category: ServiceCategory): Promise<void> {
  await add(STORES.SERVICE_CATEGORIES, category);
  syncAdd('serviceCategories', category).catch(err => logger.error('Sync add service category failed:', err));
}
export async function updateServiceCategory(category: ServiceCategory): Promise<void> {
  await update(STORES.SERVICE_CATEGORIES, category);
  syncUpdate('serviceCategories', category).catch(err => logger.error('Sync update service category failed:', err));
}
export async function updateServiceCategoryFromSync(category: ServiceCategory): Promise<void> {
  await updateFromSync(STORES.SERVICE_CATEGORIES, category);
}
export async function deleteServiceCategory(id: string): Promise<void> {
  await remove(STORES.SERVICE_CATEGORIES, id);
  syncDelete('serviceCategories', id).catch(err => logger.error('Sync delete service category failed:', err));
}

// Users
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
  syncAdd('users', user).catch(err => logger.error('Sync add user failed:', err));
}
export async function updateUser(user: User): Promise<void> {
  await update(STORES.USERS, user);
  syncUpdate('users', user).catch(err => logger.error('Sync update user failed:', err));
}
export async function updateUserFromSync(user: User): Promise<void> {
  await updateFromSync(STORES.USERS, user);
}
export async function deleteUser(id: string): Promise<void> {
  await remove(STORES.USERS, id);
  syncDelete('users', id).catch(err => logger.error('Sync delete user failed:', err));
                     }
