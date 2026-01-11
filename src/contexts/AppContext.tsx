/**
 * App Context - PostgreSQL + REST API Version
 * Manages global application state and data
 *
 * COMPLETAMENTE RISCRITTO - Nessuna dipendenza da PouchDB/IndexedDB
 * Tutti i dati provengono da API REST
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import {
  Customer,
  Service,
  ServiceCategory,
  Staff,
  StaffRole,
  Appointment,
  Payment,
  User,
  Reminder,
  AppSettings,
} from '../types';
import {
  customersApi,
  servicesApi,
  staffApi,
  appointmentsApi,
  paymentsApi,
  settingsApi,
  usersApi,
  remindersApi,
} from '../api';
import { logger } from '../utils/logger';
import { useAuth } from './AuthContext';

interface AppContextType {
  // Data
  customers: Customer[];
  services: Service[];
  serviceCategories: ServiceCategory[];
  staff: Staff[];
  staffRoles: StaffRole[];
  appointments: Appointment[];
  payments: Payment[];
  users: User[];
  reminders: Reminder[];
  settings: AppSettings;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Customer operations
  addCustomer: (customer: Partial<Customer>) => Promise<Customer>;
  updateCustomer: (customer: Customer) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;

  // Service operations
  addService: (service: Partial<Service>) => Promise<Service>;
  updateService: (service: Service) => Promise<Service>;
  deleteService: (id: string) => Promise<void>;

  // Service category operations
  addServiceCategory: (category: Partial<ServiceCategory>) => Promise<ServiceCategory>;
  updateServiceCategory: (category: ServiceCategory) => Promise<ServiceCategory>;
  deleteServiceCategory: (id: string) => Promise<void>;

  // Staff operations
  addStaff: (staff: Partial<Staff>) => Promise<Staff>;
  updateStaff: (staff: Staff) => Promise<Staff>;
  deleteStaff: (id: string) => Promise<void>;

  // Staff role operations
  addStaffRole: (role: Partial<StaffRole>) => Promise<StaffRole>;
  updateStaffRole: (role: StaffRole) => Promise<StaffRole>;
  deleteStaffRole: (id: string) => Promise<void>;

  // Appointment operations
  addAppointment: (appointment: Partial<Appointment>) => Promise<Appointment>;
  updateAppointment: (appointment: Appointment) => Promise<Appointment>;
  deleteAppointment: (id: string) => Promise<void>;

  // Payment operations
  addPayment: (payment: Partial<Payment>) => Promise<Payment>;
  updatePayment: (payment: Payment) => Promise<Payment>;
  deletePayment: (id: string) => Promise<void>;
  refundPayment: (id: string, reason: string) => Promise<Payment>;

  // User operations
  addUser: (user: Partial<User>) => Promise<User>;
  updateUser: (user: User) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;

  // Settings operations
  updateSettings: (settings: AppSettings) => Promise<void>;

  // Refresh data
  refreshData: () => Promise<void>;
  refreshAppointments: () => Promise<void>;
  refreshReminders: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps): JSX.Element {
  const { isAuthenticated } = useAuth();

  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ idleTimeout: 5 });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refresh all data from API
   */
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [
        customersData,
        servicesData,
        categoriesData,
        staffData,
        rolesData,
        appointmentsData,
        paymentsData,
        settingsData,
        usersData,
        remindersData,
      ] = await Promise.all([
        customersApi.getAll(),
        servicesApi.getAll(),
        servicesApi.getCategories(),
        staffApi.getAll(),
        staffApi.getRoles(),
        appointmentsApi.getAll(),
        paymentsApi.getAll(),
        settingsApi.getAll(),
        usersApi.getAll(),
        remindersApi.getAll(),
      ]);

      setCustomers(customersData);
      setServices(servicesData);
      setServiceCategories(categoriesData);
      setStaff(staffData);
      setStaffRoles(rolesData);
      setAppointments(appointmentsData);
      setPayments(paymentsData);
      setSettings(settingsData);
      setUsers(usersData);
      setReminders(remindersData);

      logger.info('Data loaded successfully');
    } catch (err: unknown) {
      logger.error('Failed to load data:', err);
      setError('Errore durante il caricamento dei dati');
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty deps - only uses stable setState functions

  // Load all data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    } else {
      // User is not authenticated, stop loading
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshData]);

  // ============================================================================
  // CUSTOMER OPERATIONS
  // ============================================================================

  const addCustomer = async (customer: Partial<Customer>): Promise<Customer> => {
    const newCustomer = await customersApi.create(customer);
    setCustomers((prev) => [...prev, newCustomer]);
    return newCustomer;
  };

  const updateCustomer = async (customer: Customer): Promise<Customer> => {
    const { id, ...data } = customer;
    const updated = await customersApi.update(id, data);
    setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const deleteCustomer = async (id: string): Promise<void> => {
    await customersApi.delete(id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  // ============================================================================
  // SERVICE OPERATIONS
  // ============================================================================

  const addService = async (service: Partial<Service>): Promise<Service> => {
    const newService = await servicesApi.create(service);
    setServices((prev) => [...prev, newService]);
    return newService;
  };

  const updateService = async (service: Service): Promise<Service> => {
    const { id, ...data } = service;
    // Ensure price is a number (Prisma Decimal is serialized as string in JSON)
    const serviceData = {
      ...data,
      price: typeof data.price === 'string' ? parseFloat(data.price) : data.price,
    };
    const updated = await servicesApi.update(id, serviceData);
    setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  const deleteService = async (id: string): Promise<void> => {
    await servicesApi.delete(id);
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const addServiceCategory = async (category: Partial<ServiceCategory>): Promise<ServiceCategory> => {
    const newCategory = await servicesApi.createCategory(category);
    setServiceCategories((prev) => [...prev, newCategory]);
    return newCategory;
  };

  const updateServiceCategory = async (category: ServiceCategory): Promise<ServiceCategory> => {
    const { id, ...data } = category;
    const updated = await servicesApi.updateCategory(id, data);
    setServiceCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const deleteServiceCategory = async (id: string): Promise<void> => {
    await servicesApi.deleteCategory(id);
    setServiceCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // ============================================================================
  // STAFF OPERATIONS
  // ============================================================================

  const addStaff = async (staffMember: Partial<Staff>): Promise<Staff> => {
    const newStaff = await staffApi.create(staffMember);
    setStaff((prev) => [...prev, newStaff]);
    return newStaff;
  };

  const updateStaff = async (staffMember: Staff): Promise<Staff> => {
    const { id, ...data } = staffMember;
    const updated = await staffApi.update(id, data);
    setStaff((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  const deleteStaff = async (id: string): Promise<void> => {
    await staffApi.delete(id);
    setStaff((prev) => prev.filter((s) => s.id !== id));
  };

  const addStaffRole = async (role: Partial<StaffRole>): Promise<StaffRole> => {
    const newRole = await staffApi.createRole(role);
    setStaffRoles((prev) => [...prev, newRole]);
    return newRole;
  };

  const updateStaffRole = async (role: StaffRole): Promise<StaffRole> => {
    const { id, ...data } = role;
    const updated = await staffApi.updateRole(id, data);
    setStaffRoles((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

  const deleteStaffRole = async (id: string): Promise<void> => {
    await staffApi.deleteRole(id);
    setStaffRoles((prev) => prev.filter((r) => r.id !== id));
  };

  // ============================================================================
  // APPOINTMENT OPERATIONS
  // ============================================================================

  const addAppointment = async (appointment: Partial<Appointment>): Promise<Appointment> => {
    const newAppointment = await appointmentsApi.create(appointment);
    setAppointments((prev) => [...prev, newAppointment]);
    return newAppointment;
  };

  const updateAppointment = async (appointment: Appointment): Promise<Appointment> => {
    const { id, ...data } = appointment;
    const updated = await appointmentsApi.update(id, data);
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  };

  const deleteAppointment = async (id: string): Promise<void> => {
    await appointmentsApi.delete(id);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const refreshAppointments = useCallback(async (): Promise<void> => {
    try {
      const appointmentsData = await appointmentsApi.getAll();
      setAppointments(appointmentsData);
    } catch (err: unknown) {
      logger.error('Failed to refresh appointments:', err);
    }
  }, []);

  const refreshReminders = useCallback(async (): Promise<void> => {
    try {
      const fetchedReminders = await remindersApi.getAll();
      setReminders(fetchedReminders);
      logger.info('Reminders refreshed:', fetchedReminders.length);
    } catch (err: unknown) {
      logger.error('Failed to refresh reminders:', err);
      setReminders([]); // Set empty array on error
    }
  }, []);

  // ============================================================================
  // PAYMENT OPERATIONS
  // ============================================================================

  const addPayment = async (payment: Partial<Payment>): Promise<Payment> => {
    const newPayment = await paymentsApi.create(payment);
    setPayments((prev) => [...prev, newPayment]);
    return newPayment;
  };

  const updatePayment = async (payment: Payment): Promise<Payment> => {
    const { id, ...data } = payment;
    const updated = await paymentsApi.update(id, data);
    setPayments((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const deletePayment = async (id: string): Promise<void> => {
    await paymentsApi.delete(id);
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const refundPayment = async (id: string, reason: string): Promise<Payment> => {
    const result = await paymentsApi.refund(id, reason);
    // Update the payment in the state
    setPayments((prev) => prev.map((p) => (p.id === id ? result.payment : p)));
    return result.payment;
  };

  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  const addUser = async (user: Partial<User>): Promise<User> => {
    const newUser = await usersApi.create(user);
    setUsers((prev) => [...prev, newUser]);
    logger.info('User added:', newUser);
    return newUser;
  };

  const updateUser = async (user: User): Promise<User> => {
    const { id, ...data } = user;
    const updatedUser = await usersApi.update(id, data);
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    logger.info('User updated:', updatedUser);
    return updatedUser;
  };

  const deleteUser = async (id: string): Promise<void> => {
    await usersApi.delete(id);

    setUsers((prev) => prev.filter((u) => u.id !== id));
    logger.info('User deleted:', id);
  };

  // ============================================================================
  // SETTINGS OPERATIONS
  // ============================================================================

  const updateSettings = async (newSettings: AppSettings): Promise<void> => {
    const updated = await settingsApi.updateAll(newSettings);
    setSettings(updated);
  };

  // ============================================================================
  // CONTEXT VALUE - Memoized to prevent unnecessary re-renders
  // ============================================================================

  const value: AppContextType = useMemo(
    () => ({
      customers,
      services,
      serviceCategories,
      staff,
      staffRoles,
      appointments,
      payments,
      users,
      reminders,
      settings,
      isLoading,
      error,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addService,
      updateService,
      deleteService,
      addServiceCategory,
      updateServiceCategory,
      deleteServiceCategory,
      addStaff,
      updateStaff,
      deleteStaff,
      addStaffRole,
      updateStaffRole,
      deleteStaffRole,
      addAppointment,
      updateAppointment,
      deleteAppointment,
      addPayment,
      updatePayment,
      deletePayment,
      refundPayment,
      addUser,
      updateUser,
      deleteUser,
      updateSettings,
      refreshData,
      refreshAppointments,
      refreshReminders,
    }),
    [
      customers,
      services,
      serviceCategories,
      staff,
      staffRoles,
      appointments,
      payments,
      users,
      reminders,
      settings,
      isLoading,
      error,
      refreshData,
      refreshAppointments,
      refreshReminders,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
