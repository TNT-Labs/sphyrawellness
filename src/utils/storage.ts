import { Customer, Service, Staff, Appointment, Payment, Reminder, AppSettings, StaffRole, ServiceCategory } from '../types';
import { logger } from './logger';

const STORAGE_KEYS = {
  CUSTOMERS: 'sphyra_customers',
  SERVICES: 'sphyra_services',
  STAFF: 'sphyra_staff',
  APPOINTMENTS: 'sphyra_appointments',
  PAYMENTS: 'sphyra_payments',
  REMINDERS: 'sphyra_reminders',
  SETTINGS: 'sphyra_settings',
  STAFF_ROLES: 'sphyra_staff_roles',
  SERVICE_CATEGORIES: 'sphyra_service_categories',
};

// Generic storage functions
export const saveToStorage = <T>(key: string, data: T): boolean => {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'QuotaExceededError') {
        logger.error('LocalStorage quota exceeded. Cannot save data.');
        // In a real app, notify user to clear data or upgrade
      } else {
        logger.error('Error saving to storage:', error.message);
      }
    }
    return false;
  }
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return defaultValue;
    }

    const parsed = JSON.parse(item);

    // Basic validation: ensure parsed data has expected structure
    if (parsed === null || parsed === undefined) {
      logger.warn(`Invalid data in localStorage for key: ${key}`);
      return defaultValue;
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.error(`Corrupted data in localStorage for key: ${key}. Returning default.`);
      // Clear corrupted data
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore if we can't remove
      }
    } else {
      logger.error('Error loading from storage:', error);
    }
    return defaultValue;
  }
};

// Customers
export const saveCustomers = (customers: Customer[]): void => {
  saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
};

export const loadCustomers = (): Customer[] => {
  return loadFromStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
};

// Services
export const saveServices = (services: Service[]): void => {
  saveToStorage(STORAGE_KEYS.SERVICES, services);
};

export const loadServices = (): Service[] => {
  return loadFromStorage<Service[]>(STORAGE_KEYS.SERVICES, []);
};

// Staff
export const saveStaff = (staff: Staff[]): void => {
  saveToStorage(STORAGE_KEYS.STAFF, staff);
};

export const loadStaff = (): Staff[] => {
  return loadFromStorage<Staff[]>(STORAGE_KEYS.STAFF, []);
};

// Appointments
export const saveAppointments = (appointments: Appointment[]): void => {
  saveToStorage(STORAGE_KEYS.APPOINTMENTS, appointments);
};

export const loadAppointments = (): Appointment[] => {
  return loadFromStorage<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
};

// Payments
export const savePayments = (payments: Payment[]): void => {
  saveToStorage(STORAGE_KEYS.PAYMENTS, payments);
};

export const loadPayments = (): Payment[] => {
  return loadFromStorage<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
};

// Reminders
export const saveReminders = (reminders: Reminder[]): void => {
  saveToStorage(STORAGE_KEYS.REMINDERS, reminders);
};

export const loadReminders = (): Reminder[] => {
  return loadFromStorage<Reminder[]>(STORAGE_KEYS.REMINDERS, []);
};

// Settings
const DEFAULT_SETTINGS: AppSettings = {
  idleTimeout: 5, // 5 minutes by default
  sync: {
    enabled: false,
    serverUrl: '',
    username: '',
    password: '',
    databaseName: 'sphyra-wellness',
    syncMode: 'continuous',
    retryOnError: true,
  },
};

export const saveSettings = (settings: AppSettings): void => {
  saveToStorage(STORAGE_KEYS.SETTINGS, settings);
};

export const loadSettings = (): AppSettings => {
  return loadFromStorage<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
};

// Staff Roles
export const saveStaffRoles = (roles: StaffRole[]): void => {
  saveToStorage(STORAGE_KEYS.STAFF_ROLES, roles);
};

export const loadStaffRoles = (): StaffRole[] => {
  return loadFromStorage<StaffRole[]>(STORAGE_KEYS.STAFF_ROLES, []);
};

// Service Categories
export const saveServiceCategories = (categories: ServiceCategory[]): void => {
  saveToStorage(STORAGE_KEYS.SERVICE_CATEGORIES, categories);
};

export const loadServiceCategories = (): ServiceCategory[] => {
  return loadFromStorage<ServiceCategory[]>(STORAGE_KEYS.SERVICE_CATEGORIES, []);
};

// Initialize with demo data if empty
export const initializeDemoData = (): void => {
  const customers = loadCustomers();
  const services = loadServices();
  const staff = loadStaff();
  const roles = loadStaffRoles();
  const categories = loadServiceCategories();

  // Initialize staff roles
  if (roles.length === 0) {
    const demoRoles: StaffRole[] = [
      { id: 'role-1', name: 'Estetista Senior', isActive: true },
      { id: 'role-2', name: 'Estetista', isActive: true },
      { id: 'role-3', name: 'Massaggiatrice', isActive: true },
      { id: 'role-4', name: 'Manicurista', isActive: true },
      { id: 'role-5', name: 'Truccatrice', isActive: true },
      { id: 'role-6', name: 'Receptionist', isActive: true },
      { id: 'role-7', name: 'Manager', isActive: true },
    ];
    saveStaffRoles(demoRoles);
  }

  // Initialize service categories
  if (categories.length === 0) {
    const demoCategories: ServiceCategory[] = [
      { id: 'cat-1', name: 'Mani', color: '#ec4899', isActive: true },
      { id: 'cat-2', name: 'Piedi', color: '#8b5cf6', isActive: true },
      { id: 'cat-3', name: 'Viso', color: '#10b981', isActive: true },
      { id: 'cat-4', name: 'Corpo', color: '#3b82f6', isActive: true },
      { id: 'cat-5', name: 'Massaggi', color: '#06b6d4', isActive: true },
      { id: 'cat-6', name: 'Epilazione', color: '#f59e0b', isActive: true },
      { id: 'cat-7', name: 'Trattamenti Speciali', color: '#a855f7', isActive: true },
      { id: 'cat-8', name: 'Altro', color: '#6b7280', isActive: true },
    ];
    saveServiceCategories(demoCategories);
  }

  if (customers.length === 0) {
    const demoCustomers: Customer[] = [
      {
        id: '1',
        firstName: 'Maria',
        lastName: 'Rossi',
        email: 'maria.rossi@email.com',
        phone: '+39 333 1234567',
        dateOfBirth: '1990-05-15',
        notes: 'Cliente abituale',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        firstName: 'Giulia',
        lastName: 'Bianchi',
        email: 'giulia.bianchi@email.com',
        phone: '+39 333 7654321',
        allergies: 'Nichel',
        createdAt: new Date().toISOString(),
      },
    ];
    saveCustomers(demoCustomers);
  }

  if (services.length === 0) {
    const demoServices: Service[] = [
      {
        id: '1',
        name: 'Manicure',
        description: 'Manicure completa con smalto semipermanente',
        duration: 60,
        price: 35,
        category: 'cat-1', // Mani
        color: '#ec4899',
      },
      {
        id: '2',
        name: 'Pedicure',
        description: 'Pedicure estetico completo',
        duration: 60,
        price: 40,
        category: 'cat-2', // Piedi
        color: '#8b5cf6',
      },
      {
        id: '3',
        name: 'Massaggio Rilassante',
        description: 'Massaggio corpo completo 60 minuti',
        duration: 60,
        price: 60,
        category: 'cat-5', // Massaggi
        color: '#06b6d4',
      },
      {
        id: '4',
        name: 'Trattamento Viso',
        description: 'Pulizia viso profonda con maschera',
        duration: 90,
        price: 70,
        category: 'cat-3', // Viso
        color: '#10b981',
      },
      {
        id: '5',
        name: 'Ceretta',
        description: 'Ceretta gambe complete',
        duration: 45,
        price: 30,
        category: 'cat-6', // Epilazione
        color: '#f59e0b',
      },
    ];
    saveServices(demoServices);
  }

  if (staff.length === 0) {
    const demoStaff: Staff[] = [
      {
        id: '1',
        firstName: 'Laura',
        lastName: 'Verdi',
        email: 'laura@sphyra.com',
        phone: '+39 333 1111111',
        role: 'role-1', // Estetista Senior
        specializations: ['cat-1', 'cat-2', 'cat-3'], // Mani, Piedi, Viso
        color: '#ec4899',
        isActive: true,
      },
      {
        id: '2',
        firstName: 'Sofia',
        lastName: 'Neri',
        email: 'sofia@sphyra.com',
        phone: '+39 333 2222222',
        role: 'role-3', // Massaggiatrice
        specializations: ['cat-5', 'cat-4'], // Massaggi, Corpo
        color: '#8b5cf6',
        isActive: true,
      },
    ];
    saveStaff(demoStaff);
  }
};
