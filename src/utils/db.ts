import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Customer, Service, Staff, Appointment, Payment, Reminder } from '../types';

// Define database schema
interface SphyraDB extends DBSchema {
  customers: {
    key: string;
    value: Customer;
    indexes: { 'by-email': string; 'by-phone': string };
  };
  services: {
    key: string;
    value: Service;
    indexes: { 'by-category': string };
  };
  staff: {
    key: string;
    value: Staff;
    indexes: { 'by-email': string };
  };
  appointments: {
    key: string;
    value: Appointment;
    indexes: { 'by-customer': string; 'by-date': string; 'by-staff': string };
  };
  payments: {
    key: string;
    value: Payment;
    indexes: { 'by-appointment': string; 'by-date': string };
  };
  reminders: {
    key: string;
    value: Reminder;
    indexes: { 'by-appointment': string };
  };
}

const DB_NAME = 'sphyra-wellness-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<SphyraDB> | null = null;

/**
 * Initialize and open the database
 */
export async function initDB(): Promise<IDBPDatabase<SphyraDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await openDB<SphyraDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create customers store
        if (!db.objectStoreNames.contains('customers')) {
          const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
          customerStore.createIndex('by-email', 'email');
          customerStore.createIndex('by-phone', 'phone');
        }

        // Create services store
        if (!db.objectStoreNames.contains('services')) {
          const serviceStore = db.createObjectStore('services', { keyPath: 'id' });
          serviceStore.createIndex('by-category', 'category');
        }

        // Create staff store
        if (!db.objectStoreNames.contains('staff')) {
          const staffStore = db.createObjectStore('staff', { keyPath: 'id' });
          staffStore.createIndex('by-email', 'email');
        }

        // Create appointments store
        if (!db.objectStoreNames.contains('appointments')) {
          const appointmentStore = db.createObjectStore('appointments', { keyPath: 'id' });
          appointmentStore.createIndex('by-customer', 'customerId');
          appointmentStore.createIndex('by-date', 'date');
          appointmentStore.createIndex('by-staff', 'staffId');
        }

        // Create payments store
        if (!db.objectStoreNames.contains('payments')) {
          const paymentStore = db.createObjectStore('payments', { keyPath: 'id' });
          paymentStore.createIndex('by-appointment', 'appointmentId');
          paymentStore.createIndex('by-date', 'date');
        }

        // Create reminders store
        if (!db.objectStoreNames.contains('reminders')) {
          const reminderStore = db.createObjectStore('reminders', { keyPath: 'id' });
          reminderStore.createIndex('by-appointment', 'appointmentId');
        }
      },
    });

    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get database instance (initializes if needed)
 */
async function getDB(): Promise<IDBPDatabase<SphyraDB>> {
  if (!dbInstance) {
    return await initDB();
  }
  return dbInstance;
}

// ============================================
// CRUD Operations for Customers
// ============================================

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDB();
  return await db.getAll('customers');
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const db = await getDB();
  return await db.get('customers', id);
}

export async function addCustomer(customer: Customer): Promise<void> {
  const db = await getDB();
  await db.add('customers', customer);
}

export async function updateCustomer(customer: Customer): Promise<void> {
  const db = await getDB();
  await db.put('customers', customer);
}

export async function deleteCustomer(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('customers', id);
}

// ============================================
// CRUD Operations for Services
// ============================================

export async function getAllServices(): Promise<Service[]> {
  const db = await getDB();
  return await db.getAll('services');
}

export async function getService(id: string): Promise<Service | undefined> {
  const db = await getDB();
  return await db.get('services', id);
}

export async function addService(service: Service): Promise<void> {
  const db = await getDB();
  await db.add('services', service);
}

export async function updateService(service: Service): Promise<void> {
  const db = await getDB();
  await db.put('services', service);
}

export async function deleteService(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('services', id);
}

// ============================================
// CRUD Operations for Staff
// ============================================

export async function getAllStaff(): Promise<Staff[]> {
  const db = await getDB();
  return await db.getAll('staff');
}

export async function getStaff(id: string): Promise<Staff | undefined> {
  const db = await getDB();
  return await db.get('staff', id);
}

export async function addStaff(staff: Staff): Promise<void> {
  const db = await getDB();
  await db.add('staff', staff);
}

export async function updateStaff(staff: Staff): Promise<void> {
  const db = await getDB();
  await db.put('staff', staff);
}

export async function deleteStaff(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('staff', id);
}

// ============================================
// CRUD Operations for Appointments
// ============================================

export async function getAllAppointments(): Promise<Appointment[]> {
  const db = await getDB();
  return await db.getAll('appointments');
}

export async function getAppointment(id: string): Promise<Appointment | undefined> {
  const db = await getDB();
  return await db.get('appointments', id);
}

export async function addAppointment(appointment: Appointment): Promise<void> {
  const db = await getDB();
  await db.add('appointments', appointment);
}

export async function updateAppointment(appointment: Appointment): Promise<void> {
  const db = await getDB();
  await db.put('appointments', appointment);
}

export async function deleteAppointment(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('appointments', id);
}

// ============================================
// CRUD Operations for Payments
// ============================================

export async function getAllPayments(): Promise<Payment[]> {
  const db = await getDB();
  return await db.getAll('payments');
}

export async function getPayment(id: string): Promise<Payment | undefined> {
  const db = await getDB();
  return await db.get('payments', id);
}

export async function addPayment(payment: Payment): Promise<void> {
  const db = await getDB();
  await db.add('payments', payment);
}

export async function updatePayment(payment: Payment): Promise<void> {
  const db = await getDB();
  await db.put('payments', payment);
}

export async function deletePayment(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('payments', id);
}

// ============================================
// CRUD Operations for Reminders
// ============================================

export async function getAllReminders(): Promise<Reminder[]> {
  const db = await getDB();
  return await db.getAll('reminders');
}

export async function getReminder(id: string): Promise<Reminder | undefined> {
  const db = await getDB();
  return await db.get('reminders', id);
}

export async function addReminder(reminder: Reminder): Promise<void> {
  const db = await getDB();
  await db.add('reminders', reminder);
}

export async function updateReminder(reminder: Reminder): Promise<void> {
  const db = await getDB();
  await db.put('reminders', reminder);
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('reminders', id);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Clear all data from the database
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['customers', 'services', 'staff', 'appointments', 'payments', 'reminders'],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore('customers').clear(),
    tx.objectStore('services').clear(),
    tx.objectStore('staff').clear(),
    tx.objectStore('appointments').clear(),
    tx.objectStore('payments').clear(),
    tx.objectStore('reminders').clear(),
  ]);

  await tx.done;
}

/**
 * Get database statistics
 */
export async function getDBStats(): Promise<{
  customers: number;
  services: number;
  staff: number;
  appointments: number;
  payments: number;
  reminders: number;
}> {
  const db = await getDB();

  const [customers, services, staff, appointments, payments, reminders] = await Promise.all([
    db.count('customers'),
    db.count('services'),
    db.count('staff'),
    db.count('appointments'),
    db.count('payments'),
    db.count('reminders'),
  ]);

  return {
    customers,
    services,
    staff,
    appointments,
    payments,
    reminders,
  };
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
}> {
  const [customers, services, staff, appointments, payments, reminders] = await Promise.all([
    getAllCustomers(),
    getAllServices(),
    getAllStaff(),
    getAllAppointments(),
    getAllPayments(),
    getAllReminders(),
  ]);

  return {
    customers,
    services,
    staff,
    appointments,
    payments,
    reminders,
  };
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
}): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['customers', 'services', 'staff', 'appointments', 'payments', 'reminders'],
    'readwrite'
  );

  // Import customers
  if (data.customers) {
    const customerStore = tx.objectStore('customers');
    for (const customer of data.customers) {
      await customerStore.put(customer);
    }
  }

  // Import services
  if (data.services) {
    const serviceStore = tx.objectStore('services');
    for (const service of data.services) {
      await serviceStore.put(service);
    }
  }

  // Import staff
  if (data.staff) {
    const staffStore = tx.objectStore('staff');
    for (const staff of data.staff) {
      await staffStore.put(staff);
    }
  }

  // Import appointments
  if (data.appointments) {
    const appointmentStore = tx.objectStore('appointments');
    for (const appointment of data.appointments) {
      await appointmentStore.put(appointment);
    }
  }

  // Import payments
  if (data.payments) {
    const paymentStore = tx.objectStore('payments');
    for (const payment of data.payments) {
      await paymentStore.put(payment);
    }
  }

  // Import reminders
  if (data.reminders) {
    const reminderStore = tx.objectStore('reminders');
    for (const reminder of data.reminders) {
      await reminderStore.put(reminder);
    }
  }

  await tx.done;
}
