import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Customer, Service, Staff, Appointment, Payment, Reminder, StaffRole, ServiceCategory } from '../types';
import { logger } from './logger';

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
  staffRoles: {
    key: string;
    value: StaffRole;
  };
  serviceCategories: {
    key: string;
    value: ServiceCategory;
  };
}

const DB_NAME = 'sphyra-wellness-db';
const DB_VERSION = 2;

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

        // Create staff roles store (v2)
        if (!db.objectStoreNames.contains('staffRoles')) {
          db.createObjectStore('staffRoles', { keyPath: 'id' });
        }

        // Create service categories store (v2)
        if (!db.objectStoreNames.contains('serviceCategories')) {
          db.createObjectStore('serviceCategories', { keyPath: 'id' });
        }
      },
    });

    return dbInstance;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
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
// Relationship Check Functions
// ============================================

/**
 * Check if a customer has appointments
 */
export async function getCustomerAppointments(customerId: string): Promise<Appointment[]> {
  const db = await getDB();
  const tx = db.transaction('appointments', 'readonly');
  const index = tx.store.index('by-customer');
  return await index.getAll(customerId);
}

/**
 * Check if staff has appointments
 */
export async function getStaffAppointments(staffId: string): Promise<Appointment[]> {
  const db = await getDB();
  const tx = db.transaction('appointments', 'readonly');
  const index = tx.store.index('by-staff');
  return await index.getAll(staffId);
}

/**
 * Check if service has appointments
 */
export async function getServiceAppointments(serviceId: string): Promise<{
  count: number;
  futureCount: number;
}> {
  const db = await getDB();
  const allAppointments = await db.getAll('appointments');
  const serviceAppointments = allAppointments.filter((apt) => apt.serviceId === serviceId);
  const today = new Date().toISOString().split('T')[0];
  const futureAppointments = serviceAppointments.filter((apt) => apt.date >= today);

  return {
    count: serviceAppointments.length,
    futureCount: futureAppointments.length,
  };
}

/**
 * Get future appointments for a customer
 */
export async function getCustomerFutureAppointments(customerId: string): Promise<Appointment[]> {
  const appointments = await getCustomerAppointments(customerId);
  const today = new Date().toISOString().split('T')[0];
  return appointments.filter((apt) => apt.date >= today && apt.status !== 'cancelled');
}

/**
 * Get future appointments for staff
 */
export async function getStaffFutureAppointments(staffId: string): Promise<Appointment[]> {
  const appointments = await getStaffAppointments(staffId);
  const today = new Date().toISOString().split('T')[0];
  return appointments.filter((apt) => apt.date >= today && apt.status !== 'cancelled');
}

/**
 * Get payments for an appointment
 */
export async function getAppointmentPayments(appointmentId: string): Promise<Payment[]> {
  const db = await getDB();
  const tx = db.transaction('payments', 'readonly');
  const index = tx.store.index('by-appointment');
  return await index.getAll(appointmentId);
}

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
      reason: `Il membro ha ${futureAppointments.length} appuntamento${futureAppointments.length > 1 ? 'i' : ''} futur${futureAppointments.length > 1 ? 'i' : 'o'}`,
      futureAppointments: futureAppointments.length,
    };
  }

  return {
    canDelete: true,
    futureAppointments: 0,
  };
}

/**
 * Check if it's safe to delete a service
 */
export async function canDeleteService(serviceId: string): Promise<{
  canDelete: boolean;
  reason?: string;
  futureAppointments: number;
}> {
  const { futureCount } = await getServiceAppointments(serviceId);

  if (futureCount > 0) {
    return {
      canDelete: false,
      reason: `Il servizio ha ${futureCount} appuntamento${futureCount > 1 ? 'i' : ''} futur${futureCount > 1 ? 'i' : 'o'}`,
      futureAppointments: futureCount,
    };
  }

  return {
    canDelete: true,
    futureAppointments: 0,
  };
}

// ============================================
// CRUD Operations for Staff Roles
// ============================================

export async function getAllStaffRoles(): Promise<StaffRole[]> {
  const db = await getDB();
  return await db.getAll('staffRoles');
}

export async function getStaffRole(id: string): Promise<StaffRole | undefined> {
  const db = await getDB();
  return await db.get('staffRoles', id);
}

export async function addStaffRole(role: StaffRole): Promise<void> {
  const db = await getDB();
  await db.add('staffRoles', role);
}

export async function updateStaffRole(role: StaffRole): Promise<void> {
  const db = await getDB();
  await db.put('staffRoles', role);
}

export async function deleteStaffRole(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('staffRoles', id);
}

// ============================================
// CRUD Operations for Service Categories
// ============================================

export async function getAllServiceCategories(): Promise<ServiceCategory[]> {
  const db = await getDB();
  return await db.getAll('serviceCategories');
}

export async function getServiceCategory(id: string): Promise<ServiceCategory | undefined> {
  const db = await getDB();
  return await db.get('serviceCategories', id);
}

export async function addServiceCategory(category: ServiceCategory): Promise<void> {
  const db = await getDB();
  await db.add('serviceCategories', category);
}

export async function updateServiceCategory(category: ServiceCategory): Promise<void> {
  const db = await getDB();
  await db.put('serviceCategories', category);
}

export async function deleteServiceCategory(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('serviceCategories', id);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Clear all data from the database
 * WARNING: This is a destructive operation that cannot be undone!
 * Use clearAllDataWithConfirmation() instead for UI operations
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['customers', 'services', 'staff', 'appointments', 'payments', 'reminders', 'staffRoles', 'serviceCategories'],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore('customers').clear(),
    tx.objectStore('services').clear(),
    tx.objectStore('staff').clear(),
    tx.objectStore('appointments').clear(),
    tx.objectStore('payments').clear(),
    tx.objectStore('reminders').clear(),
    tx.objectStore('staffRoles').clear(),
    tx.objectStore('serviceCategories').clear(),
  ]);

  await tx.done;
  logger.log('⚠️ All data cleared from database');
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
  staffRoles: number;
  serviceCategories: number;
}> {
  const db = await getDB();

  const [customers, services, staff, appointments, payments, reminders, staffRoles, serviceCategories] = await Promise.all([
    db.count('customers'),
    db.count('services'),
    db.count('staff'),
    db.count('appointments'),
    db.count('payments'),
    db.count('reminders'),
    db.count('staffRoles'),
    db.count('serviceCategories'),
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
  const [customers, services, staff, appointments, payments, reminders, staffRoles, serviceCategories] = await Promise.all([
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
  const db = await getDB();
  const tx = db.transaction(
    ['customers', 'services', 'staff', 'appointments', 'payments', 'reminders', 'staffRoles', 'serviceCategories'],
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

  // Import staff roles
  if (data.staffRoles) {
    const rolesStore = tx.objectStore('staffRoles');
    for (const role of data.staffRoles) {
      await rolesStore.put(role);
    }
  }

  // Import service categories
  if (data.serviceCategories) {
    const categoriesStore = tx.objectStore('serviceCategories');
    for (const category of data.serviceCategories) {
      await categoriesStore.put(category);
    }
  }

  await tx.done;
}
