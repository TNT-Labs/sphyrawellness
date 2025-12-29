/**
 * TypeScript type definitions for Sphyra SMS Reminder Mobile App
 */

export interface User {
  id: string;
  username: string;
  nome: string;
  email?: string;
  ruolo: 'RESPONSABILE' | 'UTENTE';
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  smsReminderConsent: boolean;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  reminderSent: boolean;
  customer: Customer;
  service: Service;
  staff: Staff;
}

export interface PendingReminder {
  appointment: Appointment;
  message: string;
}

export interface SMSResult {
  success: boolean;
  appointmentId: string;
  error?: string;
}

export interface SyncResult {
  total: number;
  sent: number;
  failed: number;
  results: SMSResult[];
}

export interface AppConfig {
  apiUrl: string;
  syncIntervalMinutes: number;
  autoSyncEnabled: boolean;
}

export interface AppState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  lastSync: Date | null;
  isSyncing: boolean;
  autoSyncEnabled: boolean;
}
