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
  loadCustomers,
  saveCustomers,
  loadServices,
  saveServices,
  loadStaff,
  saveStaff,
  loadAppointments,
  saveAppointments,
  loadPayments,
  savePayments,
  loadReminders,
  saveReminders,
  initializeDemoData,
} from '../utils/storage';

interface AppContextType {
  // Customers
  customers: Customer[];
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;

  // Services
  services: Service[];
  addService: (service: Service) => void;
  updateService: (service: Service) => void;
  deleteService: (id: string) => void;

  // Staff
  staff: Staff[];
  addStaff: (member: Staff) => void;
  updateStaff: (member: Staff) => void;
  deleteStaff: (id: string) => void;

  // Appointments
  appointments: Appointment[];
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (appointment: Appointment) => void;
  deleteAppointment: (id: string) => void;

  // Payments
  payments: Payment[];
  addPayment: (payment: Payment) => void;

  // Reminders
  reminders: Reminder[];
  addReminder: (reminder: Reminder) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Initialize data on mount
  useEffect(() => {
    initializeDemoData();
    setCustomers(loadCustomers());
    setServices(loadServices());
    setStaff(loadStaff());
    setAppointments(loadAppointments());
    setPayments(loadPayments());
    setReminders(loadReminders());
  }, []);

  // Customers
  const addCustomer = (customer: Customer) => {
    const updated = [...customers, customer];
    setCustomers(updated);
    saveCustomers(updated);
  };

  const updateCustomer = (customer: Customer) => {
    const updated = customers.map((c) => (c.id === customer.id ? customer : c));
    setCustomers(updated);
    saveCustomers(updated);
  };

  const deleteCustomer = (id: string) => {
    const updated = customers.filter((c) => c.id !== id);
    setCustomers(updated);
    saveCustomers(updated);
  };

  // Services
  const addService = (service: Service) => {
    const updated = [...services, service];
    setServices(updated);
    saveServices(updated);
  };

  const updateService = (service: Service) => {
    const updated = services.map((s) => (s.id === service.id ? service : s));
    setServices(updated);
    saveServices(updated);
  };

  const deleteService = (id: string) => {
    const updated = services.filter((s) => s.id !== id);
    setServices(updated);
    saveServices(updated);
  };

  // Staff
  const addStaff = (member: Staff) => {
    const updated = [...staff, member];
    setStaff(updated);
    saveStaff(updated);
  };

  const updateStaff = (member: Staff) => {
    const updated = staff.map((s) => (s.id === member.id ? member : s));
    setStaff(updated);
    saveStaff(updated);
  };

  const deleteStaff = (id: string) => {
    const updated = staff.filter((s) => s.id !== id);
    setStaff(updated);
    saveStaff(updated);
  };

  // Appointments
  const addAppointment = (appointment: Appointment) => {
    const updated = [...appointments, appointment];
    setAppointments(updated);
    saveAppointments(updated);
  };

  const updateAppointment = (appointment: Appointment) => {
    const updated = appointments.map((a) =>
      a.id === appointment.id ? appointment : a
    );
    setAppointments(updated);
    saveAppointments(updated);
  };

  const deleteAppointment = (id: string) => {
    const updated = appointments.filter((a) => a.id !== id);
    setAppointments(updated);
    saveAppointments(updated);
  };

  // Payments
  const addPayment = (payment: Payment) => {
    const updated = [...payments, payment];
    setPayments(updated);
    savePayments(updated);
  };

  // Reminders
  const addReminder = (reminder: Reminder) => {
    const updated = [...reminders, reminder];
    setReminders(updated);
    saveReminders(updated);
  };

  const value: AppContextType = {
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

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
