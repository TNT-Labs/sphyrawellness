import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Customer,
  Service,
  Staff,
  Appointment,
  Payment,
  Reminder,
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
} from '../utils/db';
import { migrateFromLocalStorage } from '../utils/migration';
import { initializeDemoData } from '../utils/storage';

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

  // Initialize database and load data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);

        // Initialize IndexedDB
        await initDB();
        console.log('✓ IndexedDB initialized');

        // Migrate data from localStorage if needed
        const migrationResult = await migrateFromLocalStorage();
        if (migrationResult.success && migrationResult.itemsMigrated > 0) {
          console.log(`✓ Migrated ${migrationResult.itemsMigrated} items from localStorage`);
        }

        // Load all data from IndexedDB
        const [
          loadedCustomers,
          loadedServices,
          loadedStaff,
          loadedAppointments,
          loadedPayments,
          loadedReminders,
        ] = await Promise.all([
          getAllCustomers(),
          getAllServices(),
          getAllStaff(),
          getAllAppointments(),
          getAllPayments(),
          getAllReminders(),
        ]);

        // If no data exists, initialize with demo data
        if (
          loadedCustomers.length === 0 &&
          loadedServices.length === 0 &&
          loadedStaff.length === 0
        ) {
          console.log('No data found, initializing demo data...');
          initializeDemoData();

          // Trigger migration again to load demo data into IndexedDB
          await migrateFromLocalStorage();

          // Reload data
          const [demoCustomers, demoServices, demoStaff] = await Promise.all([
            getAllCustomers(),
            getAllServices(),
            getAllStaff(),
          ]);

          setCustomers(demoCustomers);
          setServices(demoServices);
          setStaff(demoStaff);
        } else {
          setCustomers(loadedCustomers);
          setServices(loadedServices);
          setStaff(loadedStaff);
        }

        setAppointments(loadedAppointments);
        setPayments(loadedPayments);
        setReminders(loadedReminders);

        console.log('✓ App data loaded successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Customers
  const addCustomer = async (customer: Customer) => {
    await dbAddCustomer(customer);
    setCustomers((prev) => [...prev, customer]);
  };

  const updateCustomer = async (customer: Customer) => {
    await dbUpdateCustomer(customer);
    setCustomers((prev) => prev.map((c) => (c.id === customer.id ? customer : c)));
  };

  const deleteCustomer = async (id: string) => {
    await dbDeleteCustomer(id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  // Services
  const addService = async (service: Service) => {
    await dbAddService(service);
    setServices((prev) => [...prev, service]);
  };

  const updateService = async (service: Service) => {
    await dbUpdateService(service);
    setServices((prev) => prev.map((s) => (s.id === service.id ? service : s)));
  };

  const deleteService = async (id: string) => {
    await dbDeleteService(id);
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  // Staff
  const addStaff = async (member: Staff) => {
    await dbAddStaff(member);
    setStaff((prev) => [...prev, member]);
  };

  const updateStaff = async (member: Staff) => {
    await dbUpdateStaff(member);
    setStaff((prev) => prev.map((s) => (s.id === member.id ? member : s)));
  };

  const deleteStaff = async (id: string) => {
    await dbDeleteStaff(id);
    setStaff((prev) => prev.filter((s) => s.id !== id));
  };

  // Appointments
  const addAppointment = async (appointment: Appointment) => {
    await dbAddAppointment(appointment);
    setAppointments((prev) => [...prev, appointment]);
  };

  const updateAppointment = async (appointment: Appointment) => {
    await dbUpdateAppointment(appointment);
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointment.id ? appointment : a))
    );
  };

  const deleteAppointment = async (id: string) => {
    await dbDeleteAppointment(id);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  // Payments
  const addPayment = async (payment: Payment) => {
    await dbAddPayment(payment);
    setPayments((prev) => [...prev, payment]);
  };

  // Reminders
  const addReminder = async (reminder: Reminder) => {
    await dbAddReminder(reminder);
    setReminders((prev) => [...prev, reminder]);
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
