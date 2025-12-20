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
  confirmationToken?: string; // Token shown to user (for generating link)
  confirmationTokenHash?: string; // Hashed token stored in DB
  tokenExpiresAt?: string; // ISO date when token expires
  confirmedAt?: string; // ISO date when confirmed
  createdAt: string;
  updatedAt?: string;
}

// PouchDB document type for Appointment (includes _id and _rev)
export interface AppointmentDoc extends Omit<Appointment, 'id'> {
  _id: string;
  _rev?: string;
}

// GDPR Consent Management Types
export interface ConsentHistoryEntry {
  type: 'privacy' | 'emailReminder' | 'smsReminder' | 'healthData' | 'marketing';
  action: 'granted' | 'revoked' | 'updated';
  timestamp: string; // ISO timestamp
  ipAddress?: string; // Optional for audit trail
  userAgent?: string; // Optional for audit trail
}

export interface CustomerConsents {
  // Base privacy consent (Art. 6.1.b GDPR - Contract execution)
  privacyConsent: boolean;
  privacyConsentDate: string; // ISO timestamp
  privacyConsentVersion: string; // e.g., "1.0" - tracks which version of Privacy Policy was accepted

  // Email reminder consent (Art. 6.1.a GDPR - Consent)
  emailReminderConsent: boolean;
  emailReminderConsentDate?: string; // ISO timestamp

  // SMS reminder consent (Art. 6.1.a GDPR - Consent)
  smsReminderConsent: boolean;
  smsReminderConsentDate?: string; // ISO timestamp

  // Health data consent (Art. 9.2.a GDPR - Explicit consent for special categories)
  healthDataConsent: boolean;
  healthDataConsentDate?: string; // ISO timestamp

  // Marketing consent (optional for future use)
  marketingConsent?: boolean;
  marketingConsentDate?: string; // ISO timestamp

  // Audit trail of all consent changes
  consentHistory?: ConsentHistoryEntry[];
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate?: string;
  notes?: string;

  // GDPR Consents - Optional for backward compatibility with existing customers
  consents?: CustomerConsents;

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
  color?: string; // Service color for UI display
  imageUrl?: string; // URL or path to service image
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
  color: string; // Identifier color for calendar
  isActive: boolean; // Active/inactive status
  profileImageUrl?: string; // URL or path to profile image
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
  icsContent?: string; // .ics file content to attach to email
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
