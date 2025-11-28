import PouchDB from 'pouchdb-browser';
import * as PouchDBFindModule from 'pouchdb-find';
import {
  Customer,
  Service,
  Staff,
  Appointment,
  Payment,
  Reminder,
  StaffRole,
  ServiceCategory,
  SyncConfig,
  SyncStatus
} from '../types';
import { logger } from './logger';

// Register PouchDB plugins
// Use default export or the module itself depending on how it's exported
const PouchDBFind = (PouchDBFindModule as any).default || PouchDBFindModule;
PouchDB.plugin(PouchDBFind);

// Document types in PouchDB
type DocType = 'customer' | 'service' | 'staff' | 'appointment' | 'payment' | 'reminder' | 'staffRole' | 'serviceCategory';

// PouchDB document with type
interface PouchDoc {
  _id: string;
  _rev?: string;
  type: DocType;
  [key: string]: any;
}

const LOCAL_DB_NAME = 'sphyra-wellness-local';

let localDB: PouchDB.Database | null = null;
let remoteDB: PouchDB.Database | null = null;
let syncHandler: PouchDB.Replication.Sync<any> | null = null;
let syncStatus: SyncStatus = { isActive: false };

// Callbacks for sync status updates
const syncStatusCallbacks: ((status: SyncStatus) => void)[] = [];

/**
 * Initialize local PouchDB database
 */
export async function initPouchDB(): Promise<PouchDB.Database> {
  if (localDB) {
    return localDB;
  }

  try {
    localDB = new PouchDB(LOCAL_DB_NAME);

    // Create indexes for efficient queries
    await createIndexes();

    logger.info('PouchDB initialized successfully');
    return localDB;
  } catch (error) {
    logger.error('Failed to initialize PouchDB:', error);
    throw error;
  }
}

/**
 * Create indexes for efficient queries
 */
async function createIndexes(): Promise<void> {
  if (!localDB) return;

  try {
    // Index for type field (used in all queries)
    await localDB.createIndex({
      index: { fields: ['type'] }
    });

    // Index for customer queries
    await localDB.createIndex({
      index: { fields: ['type', 'email'] }
    });
    await localDB.createIndex({
      index: { fields: ['type', 'phone'] }
    });

    // Index for service queries
    await localDB.createIndex({
      index: { fields: ['type', 'category'] }
    });

    // Index for appointment queries
    await localDB.createIndex({
      index: { fields: ['type', 'customerId'] }
    });
    await localDB.createIndex({
      index: { fields: ['type', 'date'] }
    });
    await localDB.createIndex({
      index: { fields: ['type', 'staffId'] }
    });

    // Index for payment queries
    await localDB.createIndex({
      index: { fields: ['type', 'appointmentId'] }
    });
    await localDB.createIndex({
      index: { fields: ['type', 'date'] }
    });

    // Index for reminder queries
    await localDB.createIndex({
      index: { fields: ['type', 'appointmentId'] }
    });

    logger.info('PouchDB indexes created successfully');
  } catch (error) {
    logger.error('Failed to create indexes:', error);
  }
}

/**
 * Get local database instance
 */
async function getDB(): Promise<PouchDB.Database> {
  if (!localDB) {
    return await initPouchDB();
  }
  return localDB;
}

/**
 * Convert entity to PouchDB document
 */
function toPouchDoc<T extends { id: string }>(entity: T, type: DocType): PouchDoc {
  const { id, ...rest } = entity;
  return {
    _id: `${type}_${id}`,
    type,
    id,
    ...rest
  };
}

/**
 * Convert PouchDB document to entity
 */
function fromPouchDoc<T>(doc: any): T {
  const { _id, _rev, type, ...entity } = doc;
  return entity as T;
}

// ============================================
// Sync Management
// ============================================

/**
 * Subscribe to sync status updates
 */
export function onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
  syncStatusCallbacks.push(callback);
  // Return unsubscribe function
  return () => {
    const index = syncStatusCallbacks.indexOf(callback);
    if (index > -1) {
      syncStatusCallbacks.splice(index, 1);
    }
  };
}

/**
 * Update sync status and notify subscribers
 */
function updateSyncStatus(update: Partial<SyncStatus>): void {
  syncStatus = { ...syncStatus, ...update };
  syncStatusCallbacks.forEach(callback => callback(syncStatus));
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

/**
 * Configure and start sync with remote CouchDB
 */
export async function startSync(config: SyncConfig): Promise<void> {
  if (!config.enabled || !config.serverUrl) {
    logger.info('Sync not enabled or server URL not configured');
    return;
  }

  try {
    await getDB(); // Ensure local DB is initialized

    // Stop existing sync if any
    await stopSync();

    // Build remote database URL with credentials
    let remoteUrl = config.serverUrl;
    if (!remoteUrl.endsWith('/')) {
      remoteUrl += '/';
    }
    remoteUrl += config.databaseName;

    // Create remote database instance with auth
    const dbOptions: PouchDB.Configuration.RemoteDatabaseConfiguration = {
      skip_setup: true
    };

    if (config.username && config.password) {
      dbOptions.auth = {
        username: config.username,
        password: config.password
      };
    }

    remoteDB = new PouchDB(remoteUrl, dbOptions);

    // Test connection
    try {
      await remoteDB.info();
      logger.info('Successfully connected to remote CouchDB');
    } catch (error) {
      logger.error('Failed to connect to remote CouchDB:', error);
      updateSyncStatus({
        isActive: false,
        lastError: 'Impossibile connettersi al server CouchDB. Verifica URL e credenziali.'
      });
      throw error;
    }

    // Configure sync options
    const syncOptions: PouchDB.Replication.SyncOptions = {
      live: config.syncMode === 'continuous',
      retry: config.retryOnError,
      heartbeat: 10000,
      timeout: 30000
    };

    // Start bidirectional sync
    syncHandler = localDB!.sync(remoteDB, syncOptions)
      .on('change', (info) => {
        logger.info('Sync change:', info);
        updateSyncStatus({
          isActive: true,
          lastSync: new Date().toISOString(),
          direction: info.direction as 'push' | 'pull',
          docs_read: (info as any).docs_read,
          docs_written: (info as any).docs_written
        });
      })
      .on('paused', (err?: any) => {
        if (err) {
          logger.error('Sync paused with error:', err);
          updateSyncStatus({
            isActive: false,
            lastError: err instanceof Error ? err.message : String(err)
          });
        } else {
          logger.info('Sync paused (up to date)');
          updateSyncStatus({
            isActive: config.syncMode === 'continuous',
            lastSync: new Date().toISOString()
          });
        }
      })
      .on('active', () => {
        logger.info('Sync resumed');
        updateSyncStatus({
          isActive: true,
          lastError: undefined
        });
      })
      .on('error', (err: any) => {
        logger.error('Sync error:', err);
        updateSyncStatus({
          isActive: false,
          lastError: err instanceof Error ? err.message : String(err)
        });
      })
      .on('complete', (info) => {
        logger.info('Sync completed:', info);
        updateSyncStatus({
          isActive: false,
          lastSync: new Date().toISOString()
        });
      });

    updateSyncStatus({
      isActive: true,
      lastSync: new Date().toISOString(),
      lastError: undefined
    });

    logger.info('Sync started successfully');
  } catch (error) {
    logger.error('Failed to start sync:', error);
    updateSyncStatus({
      isActive: false,
      lastError: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
    throw error;
  }
}

/**
 * Stop sync with remote database
 */
export async function stopSync(): Promise<void> {
  if (syncHandler) {
    logger.info('Stopping sync...');
    syncHandler.cancel();
    syncHandler = null;
  }

  if (remoteDB) {
    remoteDB = null;
  }

  updateSyncStatus({
    isActive: false
  });

  logger.info('Sync stopped');
}

/**
 * Manually trigger a one-time sync
 */
export async function syncOnce(config: SyncConfig): Promise<void> {
  if (!config.serverUrl) {
    throw new Error('Server URL not configured');
  }

  try {
    await getDB();

    let remoteUrl = config.serverUrl;
    if (!remoteUrl.endsWith('/')) {
      remoteUrl += '/';
    }
    remoteUrl += config.databaseName;

    const dbOptions: PouchDB.Configuration.RemoteDatabaseConfiguration = {
      skip_setup: true
    };

    if (config.username && config.password) {
      dbOptions.auth = {
        username: config.username,
        password: config.password
      };
    }

    const remote = new PouchDB(remoteUrl, dbOptions);

    updateSyncStatus({
      isActive: true,
      lastError: undefined
    });

    const result = await localDB!.sync(remote);

    updateSyncStatus({
      isActive: false,
      lastSync: new Date().toISOString(),
      docs_read: (result as any).pull?.docs_read || 0,
      docs_written: (result as any).push?.docs_written || 0
    });

    logger.info('One-time sync completed:', result);
  } catch (error) {
    logger.error('One-time sync failed:', error);
    updateSyncStatus({
      isActive: false,
      lastError: error instanceof Error ? error.message : 'Errore sconosciuto'
    });
    throw error;
  }
}

// ============================================
// CRUD Operations for Customers
// ============================================

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDB();
  const result = await db.find({
    selector: { type: 'customer' }
  });
  return result.docs.map(doc => fromPouchDoc<Customer>(doc));
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const db = await getDB();
  try {
    const doc = await db.get(`customer_${id}`);
    return fromPouchDoc<Customer>(doc);
  } catch (error: any) {
    if (error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

export async function addCustomer(customer: Customer): Promise<void> {
  const db = await getDB();
  const doc = toPouchDoc(customer, 'customer');
  await db.put(doc);
}

export async function updateCustomer(customer: Customer): Promise<void> {
  const db = await getDB();
  try {
    const existing = await db.get(`customer_${customer.id}`);
    const doc = { ...toPouchDoc(customer, 'customer'), _rev: existing._rev };
    await db.put(doc);
  } catch (error: any) {
    if (error.status === 404) {
      // Document doesn't exist, create it
      await addCustomer(customer);
    } else {
      throw error;
    }
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  const db = await getDB();
  const doc = await db.get(`customer_${id}`);
  await db.remove(doc);
}

// ============================================
// CRUD Operations for Services
// ============================================

export async function getAllServices(): Promise<Service[]> {
  const db = await getDB();
  const result = await db.find({
    selector: { type: 'service' }
  });
  return result.docs.map(doc => fromPouchDoc<Service>(doc));
}

export async function getService(id: string): Promise<Service | undefined> {
  const db = await getDB();
  try {
    const doc = await db.get(`service_${id}`);
    return fromPouchDoc<Service>(doc);
  } catch (error: any) {
    if (error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

export async function addService(service: Service): Promise<void> {
  const db = await getDB();
  const doc = toPouchDoc(service, 'service');
  await db.put(doc);
}

export async function updateService(service: Service): Promise<void> {
  const db = await getDB();
  try {
    const existing = await db.get(`service_${service.id}`);
    const doc = { ...toPouchDoc(service, 'service'), _rev: existing._rev };
    await db.put(doc);
  } catch (error: any) {
    if (error.status === 404) {
      await addService(service);
    } else {
      throw error;
    }
  }
}

export async function deleteService(id: string): Promise<void> {
  const db = await getDB();
  const doc = await db.get(`service_${id}`);
  await db.remove(doc);
}

// ============================================
// CRUD Operations for Staff
// ============================================

export async function getAllStaff(): Promise<Staff[]> {
  const db = await getDB();
  const result = await db.find({
    selector: { type: 'staff' }
  });
  return result.docs.map(doc => fromPouchDoc<Staff>(doc));
}

export async function getStaff(id: string): Promise<Staff | undefined> {
  const db = await getDB();
  try {
    const doc = await db.get(`staff_${id}`);
    return fromPouchDoc<Staff>(doc);
  } catch (error: any) {
    if (error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

export async function addStaff(staff: Staff): Promise<void> {
  const db = await getDB();
  const doc = toPouchDoc(staff, 'staff');
  await db.put(doc);
}

export async function updateStaff(staff: Staff): Promise<void> {
  const db = await getDB();
  try {
    const existing = await db.get(`staff_${staff.id}`);
    const doc = { ...toPouchDoc(staff, 'staff'), _rev: existing._rev };
    await db.put(doc);
  } catch (error: any) {
    if (error.status === 404) {
      await addStaff(staff);
    } else {
      throw error;
    }
  }
}

export async function deleteStaff(id: string): Promise<void> {
  const db = await getDB();
  const doc = await db.get(`staff_${id}`);
  await db.remove(doc);
}

// ============================================
// CRUD Operations for Appointments
// ============================================

export async function getAllAppointments(): Promise<Appointment[]> {
  const db = await getDB();
  const result = await db.find({
    selector: { type: 'appointment' }
  });
  return result.docs.map(doc => fromPouchDoc<Appointment>(doc));
}

export async function getAppointment(id: string): Promise<Appointment | undefined> {
  const db = await getDB();
  try {
    const doc = await db.get(`appointment_${id}`);
    return fromPouchDoc<Appointment>(doc);
  } catch (error: any) {
    if (error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

export async function addAppointment(appointment: Appointment): Promise<void> {
  const db = await getDB();
  const doc = toPouchDoc(appointment, 'appointment');
  await db.put(doc);
}

export async function updateAppointment(appointment: Appointment): Promise<void> {
  const db = await getDB();
  try {
    const existing = await db.get(`appointment_${appointment.id}`);
    const doc = { ...toPouchDoc(appointment, 'appointment'), _rev: existing._rev };
    await db.put(doc);
  } catch (error: any) {
    if (error.status === 404) {
      await addAppointment(appointment);
    } else {
      throw error;
    }
  }
}

export async function deleteAppointment(id: string): Promise<void> {
  const db = await getDB();
  const doc = await db.get(`appointment_${id}`);
  await db.remove(doc);
}

// ============================================
// CRUD Operations for Payments
// ============================================

export async function getAllPayments(): Promise<Payment[]> {
  const db = await getDB();
  const result = await db.find({
    selector: { type: 'payment' }
  });
  return result.docs.map(doc => fromPouchDoc<Payment>(doc));
}

export async function getPayment(id: string): Promise<Payment | undefined> {
  const db = await getDB();
  try {
    const doc = await db.get(`payment_${id}`);
    return fromPouchDoc<Payment>(doc);
  } catch (error: any) {
    if (error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

export async function addPayment(payment: Payment): Promise<void> {
  const db = await getDB();
  const doc = toPouchDoc(payment, 'payment');
  await db.put(doc);
}

export async function updatePayment(payment: Payment): Promise<void> {
  const db = await getDB();
  try {
    const existing = await db.get(`payment_${payment.id}`);
    const doc = { ...toPouchDoc(payment, 'payment'), _rev: existing._rev };
    await db.put(doc);
  } catch (error: any) {
    if (error.status === 404) {
      await addPayment(payment);
    } else {
      throw error;
    }
  }
}

export async function deletePayment(id: string): Promise<void> {
  const db = await getDB();
  const doc = await db.get(`payment_${id}`);
  await db.remove(doc);
}

// ============================================
// CRUD Operations for Reminders
// ============================================

export async function getAllReminders(): Promise<Reminder[]> {
  const db = await getDB();
  const result = await db.find({
    selector: { type: 'reminder' }
  });
  return result.docs.map(doc => fromPouchDoc<Reminder>(doc));
}

export async function getReminder(id: string): Promise<Reminder | undefined> {
  const db = await getDB();
  try {
    const doc = await db.get(`reminder_${id}`);
    return fromPouchDoc<Reminder>(doc);
  } catch (error: any) {
    if (error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

export async function addReminder(reminder: Reminder): Promise<void> {
  const db = await getDB();
  const doc = toPouchDoc(reminder, 'reminder');
  await db.put(doc);
}

export async function updateReminder(reminder: Reminder): Promise<void> {
  const db = await getDB();
  try {
    const existing = await db.get(`reminder_${reminder.id}`);
    const doc = { ...toPouchDoc(reminder, 'reminder'), _rev: existing._rev };
    await db.put(doc);
  } catch (error: any) {
    if (error.status === 404) {
      await addReminder(reminder);
    } else {
      throw error;
    }
  }
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await getDB();
  const doc = await db.get(`reminder_${id}`);
  await db.remove(doc);
}

// ============================================
// CRUD Operations for Staff Roles
// ============================================

export async function getAllStaffRoles(): Promise<StaffRole[]> {
  const db = await getDB();
  const result = await db.find({
    selector: { type: 'staffRole' }
  });
  return result.docs.map(doc => fromPouchDoc<StaffRole>(doc));
}

export async function getStaffRole(id: string): Promise<StaffRole | undefined> {
  const db = await getDB();
  try {
    const doc = await db.get(`staffRole_${id}`);
    return fromPouchDoc<StaffRole>(doc);
  } catch (error: any) {
    if (error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

export async function addStaffRole(role: StaffRole): Promise<void> {
  const db = await getDB();
  const doc = toPouchDoc(role, 'staffRole');
  await db.put(doc);
}

export async function updateStaffRole(role: StaffRole): Promise<void> {
  const db = await getDB();
  try {
    const existing = await db.get(`staffRole_${role.id}`);
    const doc = { ...toPouchDoc(role, 'staffRole'), _rev: existing._rev };
    await db.put(doc);
  } catch (error: any) {
    if (error.status === 404) {
      await addStaffRole(role);
    } else {
      throw error;
    }
  }
}

export async function deleteStaffRole(id: string): Promise<void> {
  const db = await getDB();
  const doc = await db.get(`staffRole_${id}`);
  await db.remove(doc);
}

// ============================================
// CRUD Operations for Service Categories
// ============================================

export async function getAllServiceCategories(): Promise<ServiceCategory[]> {
  const db = await getDB();
  const result = await db.find({
    selector: { type: 'serviceCategory' }
  });
  return result.docs.map(doc => fromPouchDoc<ServiceCategory>(doc));
}

export async function getServiceCategory(id: string): Promise<ServiceCategory | undefined> {
  const db = await getDB();
  try {
    const doc = await db.get(`serviceCategory_${id}`);
    return fromPouchDoc<ServiceCategory>(doc);
  } catch (error: any) {
    if (error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

export async function addServiceCategory(category: ServiceCategory): Promise<void> {
  const db = await getDB();
  const doc = toPouchDoc(category, 'serviceCategory');
  await db.put(doc);
}

export async function updateServiceCategory(category: ServiceCategory): Promise<void> {
  const db = await getDB();
  try {
    const existing = await db.get(`serviceCategory_${category.id}`);
    const doc = { ...toPouchDoc(category, 'serviceCategory'), _rev: existing._rev };
    await db.put(doc);
  } catch (error: any) {
    if (error.status === 404) {
      await addServiceCategory(category);
    } else {
      throw error;
    }
  }
}

export async function deleteServiceCategory(id: string): Promise<void> {
  const db = await getDB();
  const doc = await db.get(`serviceCategory_${id}`);
  await db.remove(doc);
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
  const db = await getDB();
  const info = await db.info();

  // Count documents by type
  const counts = {
    customers: 0,
    services: 0,
    staff: 0,
    appointments: 0,
    payments: 0,
    reminders: 0,
    staffRoles: 0,
    serviceCategories: 0
  };

  const allDocs = await db.allDocs();
  allDocs.rows.forEach(row => {
    const type = row.id.split('_')[0];
    if (type === 'customer') counts.customers++;
    else if (type === 'service') counts.services++;
    else if (type === 'staff') counts.staff++;
    else if (type === 'appointment') counts.appointments++;
    else if (type === 'payment') counts.payments++;
    else if (type === 'reminder') counts.reminders++;
    else if (type === 'staffRole') counts.staffRoles++;
    else if (type === 'serviceCategory') counts.serviceCategories++;
  });

  return counts;
}

/**
 * Export all data
 */
export async function exportData(): Promise<any> {
  const db = await getDB();
  const allDocs = await db.allDocs({ include_docs: true });

  const data: any = {
    customers: [],
    services: [],
    staff: [],
    appointments: [],
    payments: [],
    reminders: [],
    staffRoles: [],
    serviceCategories: []
  };

  allDocs.rows.forEach(row => {
    if (!row.doc) return;

    const doc = row.doc as PouchDoc;
    const entity = fromPouchDoc(doc);

    switch (doc.type) {
      case 'customer':
        data.customers.push(entity);
        break;
      case 'service':
        data.services.push(entity);
        break;
      case 'staff':
        data.staff.push(entity);
        break;
      case 'appointment':
        data.appointments.push(entity);
        break;
      case 'payment':
        data.payments.push(entity);
        break;
      case 'reminder':
        data.reminders.push(entity);
        break;
      case 'staffRole':
        data.staffRoles.push(entity);
        break;
      case 'serviceCategory':
        data.serviceCategories.push(entity);
        break;
    }
  });

  return data;
}

/**
 * Import data
 */
export async function importData(data: any): Promise<void> {
  const db = await getDB();

  // Import all entities
  const docs: PouchDoc[] = [];

  if (data.customers) {
    data.customers.forEach((c: Customer) => docs.push(toPouchDoc(c, 'customer')));
  }
  if (data.services) {
    data.services.forEach((s: Service) => docs.push(toPouchDoc(s, 'service')));
  }
  if (data.staff) {
    data.staff.forEach((s: Staff) => docs.push(toPouchDoc(s, 'staff')));
  }
  if (data.appointments) {
    data.appointments.forEach((a: Appointment) => docs.push(toPouchDoc(a, 'appointment')));
  }
  if (data.payments) {
    data.payments.forEach((p: Payment) => docs.push(toPouchDoc(p, 'payment')));
  }
  if (data.reminders) {
    data.reminders.forEach((r: Reminder) => docs.push(toPouchDoc(r, 'reminder')));
  }
  if (data.staffRoles) {
    data.staffRoles.forEach((r: StaffRole) => docs.push(toPouchDoc(r, 'staffRole')));
  }
  if (data.serviceCategories) {
    data.serviceCategories.forEach((c: ServiceCategory) => docs.push(toPouchDoc(c, 'serviceCategory')));
  }

  // Bulk insert/update
  await db.bulkDocs(docs);
}

/**
 * Clear all data
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const allDocs = await db.allDocs();

  const docsToDelete = allDocs.rows.map(row => ({
    _id: row.id,
    _rev: row.value.rev,
    _deleted: true
  }));

  await db.bulkDocs(docsToDelete);
}

// ============================================
// Query Functions
// ============================================

/**
 * Get all appointments for a customer
 */
export async function getCustomerAppointments(customerId: string): Promise<Appointment[]> {
  const db = await getDB();
  const result = await db.find({
    selector: {
      type: 'appointment',
      customerId: customerId
    }
  });
  return result.docs.map(doc => fromPouchDoc<Appointment>(doc));
}

/**
 * Get all appointments for a staff member
 */
export async function getStaffAppointments(staffId: string): Promise<Appointment[]> {
  const db = await getDB();
  const result = await db.find({
    selector: {
      type: 'appointment',
      staffId: staffId
    }
  });
  return result.docs.map(doc => fromPouchDoc<Appointment>(doc));
}

/**
 * Get all appointments for a service
 */
export async function getServiceAppointments(serviceId: string): Promise<{
  past: Appointment[];
  future: Appointment[];
}> {
  const db = await getDB();
  const result = await db.find({
    selector: {
      type: 'appointment',
      serviceId: serviceId
    }
  });
  const appointments = result.docs.map(doc => fromPouchDoc<Appointment>(doc));
  const now = new Date();

  const past = appointments.filter(apt => new Date(apt.date) < now);
  const future = appointments.filter(apt => new Date(apt.date) >= now);

  return { past, future };
}

/**
 * Get future appointments for a customer
 */
export async function getCustomerFutureAppointments(customerId: string): Promise<Appointment[]> {
  const db = await getDB();
  const result = await db.find({
    selector: {
      type: 'appointment',
      customerId: customerId
    }
  });
  const appointments = result.docs.map(doc => fromPouchDoc<Appointment>(doc));
  const now = new Date();
  return appointments.filter(apt => new Date(apt.date) >= now);
}

/**
 * Get future appointments for a staff member
 */
export async function getStaffFutureAppointments(staffId: string): Promise<Appointment[]> {
  const db = await getDB();
  const result = await db.find({
    selector: {
      type: 'appointment',
      staffId: staffId
    }
  });
  const appointments = result.docs.map(doc => fromPouchDoc<Appointment>(doc));
  const now = new Date();
  return appointments.filter(apt => new Date(apt.date) >= now);
}

/**
 * Get all payments for an appointment
 */
export async function getAppointmentPayments(appointmentId: string): Promise<Payment[]> {
  const db = await getDB();
  const result = await db.find({
    selector: {
      type: 'payment',
      appointmentId: appointmentId
    }
  });
  return result.docs.map(doc => fromPouchDoc<Payment>(doc));
}

// ============================================
// Validation Functions
// ============================================

/**
 * Check if it's safe to delete a customer (no future appointments)
 */
export async function canDeleteCustomer(customerId: string): Promise<{
  canDelete: boolean;
  reason?: string;
  futureAppointments: number;
}> {
  const futureAppointments = await getCustomerFutureAppointments(customerId);

  if (futureAppointments.length > 0) {
    return {
      canDelete: false,
      reason: `Il cliente ha ${futureAppointments.length} appuntamento${futureAppointments.length > 1 ? 'i' : ''} futur${futureAppointments.length > 1 ? 'i' : 'o'}`,
      futureAppointments: futureAppointments.length,
    };
  }

  return {
    canDelete: true,
    futureAppointments: 0,
  };
}

/**
 * Check if it's safe to delete staff (no future appointments)
 */
export async function canDeleteStaff(staffId: string): Promise<{
  canDelete: boolean;
  reason?: string;
  futureAppointments: number;
}> {
  const futureAppointments = await getStaffFutureAppointments(staffId);

  if (futureAppointments.length > 0) {
    return {
      canDelete: false,
      reason: `Il personale ha ${futureAppointments.length} appuntamento${futureAppointments.length > 1 ? 'i' : ''} futur${futureAppointments.length > 1 ? 'i' : 'o'}`,
      futureAppointments: futureAppointments.length,
    };
  }

  return {
    canDelete: true,
    futureAppointments: 0,
  };
}

/**
 * Check if it's safe to delete a service (no future appointments)
 */
export async function canDeleteService(serviceId: string): Promise<{
  canDelete: boolean;
  reason?: string;
  futureAppointments: number;
}> {
  const { future } = await getServiceAppointments(serviceId);

  if (future.length > 0) {
    return {
      canDelete: false,
      reason: `Il servizio ha ${future.length} appuntamento${future.length > 1 ? 'i' : ''} futur${future.length > 1 ? 'i' : 'o'}`,
      futureAppointments: future.length,
    };
  }

  return {
    canDelete: true,
    futureAppointments: 0,
  };
}
