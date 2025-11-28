import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Customer,
  Service,
  Staff,
  Appointment,
  Payment,
  Reminder,
  StaffRole,
  ServiceCategory,
} from '../types';
import {
  initDB,
  getAllCustomers,
  addCustomer as dbAddCustomer,
  updateCustomer as dbUpdateCustomer,
  deleteCustomer as dbDeleteCustomer,
  getAllServices,
  addService as dbAddService,
  updateService as dbUpdateService,
  deleteService as dbDeleteService,
  getAllStaff,
  addStaff as dbAddStaff,
  updateStaff as dbUpdateStaff,
  deleteStaff as dbDeleteStaff,
  getAllAppointments,
  addAppointment as dbAddAppointment,
  updateAppointment as dbUpdateAppointment,
  deleteAppointment as dbDeleteAppointment,
  getAllPayments,
  addPayment as dbAddPayment,
  getAllReminders,
  addReminder as dbAddReminder,
  getAllStaffRoles,
  addStaffRole as dbAddStaffRole,
  updateStaffRole as dbUpdateStaffRole,
  deleteStaffRole as dbDeleteStaffRole,
  getAllServiceCategories,
  addServiceCategory as dbAddServiceCategory,
  updateServiceCategory as dbUpdateServiceCategory,
  deleteServiceCategory as dbDeleteServiceCategory,
  startSync,
} from '../utils/db';
import { loadSettings } from '../utils/storage';
import { migrateFromLocalStorage } from '../utils/migration';
import { initializeDemoData } from '../utils/storage';
import { logger } from '../utils/logger';
import { initAutoBackup } from '../utils/autoBackup';
import { initStoragePersistence } from '../utils/storagePersistence';

interface AppContextType {
  // Loading state
  isLoading: boolean;

  // Customers
  customers: Customer[];
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  // Services
  services: Service[];
  addService: (service: Service) => Promise<void>;
  updateService: (service: Service) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  // Staff
  staff: Staff[];
  addStaff: (member: Staff) => Promise<void>;
  updateStaff: (member: Staff) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;

  // Appointments
  appointments: Appointment[];
  addAppointment: (appointment: Appointment) => Promise<void>;
  updateAppointment: (appointment: Appointment) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;

  // Payments
  payments: Payment[];
  addPayment: (payment: Payment) => Promise<void>;

  // Reminders
  reminders: Reminder[];
  addReminder: (reminder: Reminder) => Promise<void>;

  // Staff Roles
  staffRoles: StaffRole[];
  addStaffRole: (role: StaffRole) => Promise<void>;
  updateStaffRole: (role: StaffRole) => Promise<void>;
  deleteStaffRole: (id: string) => Promise<void>;

  // Service Categories
  serviceCategories: ServiceCategory[];
  addServiceCategory: (category: ServiceCategory) => Promise<void>;
  updateServiceCategory: (category: ServiceCategory) => Promise<void>;
  deleteServiceCategory: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode | ((isLoading: boolean) => ReactNode) }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);

  // Initialize database and load data
  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        setIsLoading(true);

        // Step 1: Initialize database infrastructure
        await initDB();
        if (!isMounted) return;
        logger.log('✓ IndexedDB initialized');

        // Step 2: Request storage persistence to prevent data loss
        await initStoragePersistence();
        if (!isMounted) return;

        // Step 3: Migrate data from localStorage if needed (sequential to avoid race)
        const migrationResult = await migrateFromLocalStorage();
        if (!isMounted) return;
        if (migrationResult.success && migrationResult.itemsMigrated > 0) {
          logger.log(`✓ Migrated ${migrationResult.itemsMigrated} items from localStorage`);
        }

        // Step 4: Load all data from IndexedDB
        const [
          loadedCustomers,
          loadedServices,
          loadedStaff,
          loadedAppointments,
          loadedPayments,
          loadedReminders,
          loadedStaffRoles,
          loadedServiceCategories,
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

        if (!isMounted) return;

        // Step 5: Initialize demo data if database is empty
        if (
          loadedCustomers.length === 0 &&
          loadedServices.length === 0 &&
          loadedStaff.length === 0
        ) {
          logger.log('No data found, initializing demo data...');
          initializeDemoData();

          // Trigger migration again to load demo data into IndexedDB
          await migrateFromLocalStorage();
          if (!isMounted) return;

          // Reload data after demo initialization
          const [demoCustomers, demoServices, demoStaff, demoRoles, demoCategories] = await Promise.all([
            getAllCustomers(),
            getAllServices(),
            getAllStaff(),
            getAllStaffRoles(),
            getAllServiceCategories(),
          ]);

          if (!isMounted) return;

          setCustomers(demoCustomers);
          setServices(demoServices);
          setStaff(demoStaff);
          setStaffRoles(demoRoles);
          setServiceCategories(demoCategories);
        } else {
          setCustomers(loadedCustomers);
          setServices(loadedServices);
          setStaff(loadedStaff);
          setStaffRoles(loadedStaffRoles);
          setServiceCategories(loadedServiceCategories);
        }

        setAppointments(loadedAppointments);
        setPayments(loadedPayments);
        setReminders(loadedReminders);

        logger.log('✓ App data loaded successfully');

        // Step 6: Initialize auto-backup system (non-blocking)
        if (isMounted) {
          initAutoBackup().catch((error) => {
            logger.error('Failed to initialize auto-backup:', error);
          });
        }

        // Step 7: Initialize sync if enabled (non-blocking)
        const settings = loadSettings();
        if (settings.sync.enabled && isMounted) {
          startSync(settings.sync)
            .then(() => {
              if (isMounted) {
                logger.log('✓ Database sync started');
              }
            })
            .catch((error) => {
              logger.error('Failed to start sync:', error);
              // Don't throw - app should still work without sync
            });
        }
      } catch (error) {
        logger.error('Failed to initialize app:', error);
        // TODO: Show user-friendly error message instead of silent failure
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeApp();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, []);

  // Customers
  const addCustomer = async (customer: Customer) => {
    try {
      await dbAddCustomer(customer);
      setCustomers((prev) => [...prev, customer]);
    } catch (error) {
      logger.error('Failed to add customer:', error);
      throw error;
    }
  };

  const updateCustomer = async (customer: Customer) => {
    try {
      await dbUpdateCustomer(customer);
      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? customer : c)));
    } catch (error) {
      logger.error('Failed to update customer:', error);
      throw error;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await dbDeleteCustomer(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      logger.error('Failed to delete customer:', error);
      throw error;
    }
  };

  // Services
  const addService = async (service: Service) => {
    try {
      await dbAddService(service);
      setServices((prev) => [...prev, service]);
    } catch (error) {
      logger.error('Failed to add service:', error);
      throw error;
    }
  };

  const updateService = async (service: Service) => {
    try {
      await dbUpdateService(service);
      setServices((prev) => prev.map((s) => (s.id === service.id ? service : s)));
    } catch (error) {
      logger.error('Failed to update service:', error);
      throw error;
    }
  };

  const deleteService = async (id: string) => {
    try {
      await dbDeleteService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      logger.error('Failed to delete service:', error);
      throw error;
    }
  };

  // Staff
  const addStaff = async (member: Staff) => {
    try {
      await dbAddStaff(member);
      setStaff((prev) => [...prev, member]);
    } catch (error) {
      logger.error('Failed to add staff:', error);
      throw error;
    }
  };

  const updateStaff = async (member: Staff) => {
    try {
      await dbUpdateStaff(member);
      setStaff((prev) => prev.map((s) => (s.id === member.id ? member : s)));
    } catch (error) {
      logger.error('Failed to update staff:', error);
      throw error;
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      await dbDeleteStaff(id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      logger.error('Failed to delete staff:', error);
      throw error;
    }
  };

  // Appointments
  const addAppointment = async (appointment: Appointment) => {
    try {
      await dbAddAppointment(appointment);
      setAppointments((prev) => [...prev, appointment]);
    } catch (error) {
      logger.error('Failed to add appointment:', error);
      throw error;
    }
  };

  const updateAppointment = async (appointment: Appointment) => {
    try {
      await dbUpdateAppointment(appointment);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointment.id ? appointment : a))
      );
    } catch (error) {
      logger.error('Failed to update appointment:', error);
      throw error;
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      await dbDeleteAppointment(id);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      logger.error('Failed to delete appointment:', error);
      throw error;
    }
  };

  // Payments
  const addPayment = async (payment: Payment) => {
    try {
      await dbAddPayment(payment);
      setPayments((prev) => [...prev, payment]);
    } catch (error) {
      logger.error('Failed to add payment:', error);
      throw error;
    }
  };

  // Reminders
  const addReminder = async (reminder: Reminder) => {
    try {
      await dbAddReminder(reminder);
      setReminders((prev) => [...prev, reminder]);
    } catch (error) {
      logger.error('Failed to add reminder:', error);
      throw error;
    }
  };

  // Staff Roles
  const addStaffRole = async (role: StaffRole) => {
    try {
      await dbAddStaffRole(role);
      setStaffRoles((prev) => [...prev, role]);
    } catch (error) {
      logger.error('Failed to add staff role:', error);
      throw error;
    }
  };

  const updateStaffRole = async (role: StaffRole) => {
    try {
      await dbUpdateStaffRole(role);
      setStaffRoles((prev) => prev.map((r) => (r.id === role.id ? role : r)));
    } catch (error) {
      logger.error('Failed to update staff role:', error);
      throw error;
    }
  };

  const deleteStaffRole = async (id: string) => {
    try {
      await dbDeleteStaffRole(id);
      setStaffRoles((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      logger.error('Failed to delete staff role:', error);
      throw error;
    }
  };

  // Service Categories
  const addServiceCategory = async (category: ServiceCategory) => {
    try {
      await dbAddServiceCategory(category);
      setServiceCategories((prev) => [...prev, category]);
    } catch (error) {
      logger.error('Failed to add service category:', error);
      throw error;
    }
  };

  const updateServiceCategory = async (category: ServiceCategory) => {
    try {
      await dbUpdateServiceCategory(category);
      setServiceCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
    } catch (error) {
      logger.error('Failed to update service category:', error);
      throw error;
    }
  };

  const deleteServiceCategory = async (id: string) => {
    try {
      await dbDeleteServiceCategory(id);
      setServiceCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      logger.error('Failed to delete service category:', error);
      throw error;
    }
  };

  const value: AppContextType = {
    isLoading,
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    services,
    addService,
    updateService,
    deleteService,
    staff,
    addStaff,
    updateStaff,
    deleteStaff,
    appointments,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    payments,
    addPayment,
    reminders,
    addReminder,
    staffRoles,
    addStaffRole,
    updateStaffRole,
    deleteStaffRole,
    serviceCategories,
    addServiceCategory,
    updateServiceCategory,
    deleteServiceCategory,
  };

  return (
    <AppContext.Provider value={value}>
      {typeof children === 'function' ? children(isLoading) : children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
