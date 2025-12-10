// Shared types with frontend
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
  confirmationToken?: string; // Added for email confirmation
  createdAt: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number; // minutes
  price: number;
  category?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  specializations?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Reminder {
  id: string;
  appointmentId: string;
  type: 'email' | 'sms' | 'whatsapp' | 'notification';
  scheduledFor: string;
  sent: boolean;
  sentAt?: string;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Settings {
  _id: string;
  reminderSendHour: number; // 0-23
  reminderSendMinute: number; // 0-59
  enableAutoReminders: boolean;
  reminderDaysBefore: number; // Default: 1 (send 1 day before)
  updatedAt?: string;
}

// Email template data
export interface ReminderEmailData {
  customerName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  staffName: string;
  confirmationUrl: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
