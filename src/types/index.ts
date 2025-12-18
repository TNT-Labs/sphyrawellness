export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  notes?: string;
  allergies?: string;
  createdAt: string;
  updatedAt?: string; // ISO timestamp of last modification
}

export interface StaffRole {
  id: string;
  name: string;
  isActive: boolean;
  createdAt?: string; // ISO timestamp of creation
  updatedAt?: string; // ISO timestamp of last modification
}

export interface ServiceCategory {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  createdAt?: string; // ISO timestamp of creation
  updatedAt?: string; // ISO timestamp of last modification
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  category: string;
  color?: string;
  createdAt?: string; // ISO timestamp of creation
  updatedAt?: string; // ISO timestamp of last modification
}

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  specializations: string[]; // Array of category IDs
  color: string;
  isActive: boolean;
  createdAt?: string; // ISO timestamp of creation
  updatedAt?: string; // ISO timestamp of last modification
}

export interface Appointment {
  id: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  date: string; // ISO format
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  reminderSent?: boolean;
  confirmationToken?: string; // Token for email confirmation
  createdAt: string;
  updatedAt?: string; // ISO timestamp of last modification
}

export interface Payment {
  id: string;
  appointmentId: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer' | 'other';
  date: string;
  notes?: string;
  createdAt?: string; // ISO timestamp of creation
  updatedAt?: string; // ISO timestamp of last modification
}

export interface Reminder {
  id: string;
  appointmentId: string;
  type: 'email' | 'sms' | 'whatsapp' | 'notification';
  scheduledFor: string;
  sent: boolean;
  sentAt?: string;
  createdAt?: string; // ISO timestamp of creation
  updatedAt?: string; // ISO timestamp of last modification
}

export interface Settings {
  _id: string;
  reminderSendHour: number; // 0-23
  reminderSendMinute: number; // 0-59
  enableAutoReminders: boolean;
  reminderDaysBefore: number; // Default: 1 (send 1 day before)
  updatedAt?: string;
}

export interface Statistics {
  totalRevenue: number;
  appointmentsCount: number;
  customersCount: number;
  popularServices: { serviceId: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}

export interface AppSettings {
  idleTimeout: number; // in minutes (0 = disabled)
  syncEnabled: boolean; // enable/disable CouchDB sync
  couchdbUrl?: string; // CouchDB server URL
  couchdbUsername?: string; // CouchDB username
  couchdbPassword?: string; // CouchDB password
}

export interface SyncStatus {
  isActive: boolean;
  lastSync?: string; // ISO timestamp
  status: 'idle' | 'syncing' | 'error' | 'paused';
  error?: string;
  direction?: 'push' | 'pull' | 'both';
  // Monitoring fields
  documentsSynced?: number; // Total documents synced in current session
  lastSyncDuration?: number; // Last sync duration in ms
  syncErrors?: string[]; // Recent errors (max 10)
}

export type UserRole = 'RESPONSABILE' | 'UTENTE';

export interface User {
  id: string;
  username: string;
  passwordHash: string; // bcrypt hash (SALT_ROUNDS: 12)
  role: UserRole;
  firstName: string;
  lastName: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string; // ISO timestamp of last modification
}
