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
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  notes?: string;
  allergies?: string;

  // GDPR Consents (direct fields matching Prisma schema)
  privacyConsent?: boolean;
  privacyConsentDate?: string;
  privacyConsentVersion?: string;
  emailReminderConsent?: boolean;
  emailReminderConsentDate?: string;
  smsReminderConsent?: boolean;
  smsReminderConsentDate?: string;
  healthDataConsent?: boolean;
  healthDataConsentDate?: string;
  marketingConsent?: boolean;

  // GDPR Consents - Optional for backward compatibility with existing customers
  consents?: CustomerConsents;

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
  imageUrl?: string; // URL or path to service image
  isVisibleToCustomers?: boolean; // Controls visibility in customer booking system (default: true)
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
  profileImageUrl?: string; // URL or path to profile image
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
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  reminderSent?: boolean;
  confirmationToken?: string; // Token shown to user (for generating link)
  confirmationTokenHash?: string; // Hashed token stored in DB (backend only)
  tokenExpiresAt?: string; // ISO date when token expires
  confirmedAt?: string; // ISO date when appointment was confirmed
  createdAt: string;
  updatedAt?: string; // ISO timestamp of last modification
}

export interface Payment {
  id: string;
  appointmentId: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer' | 'other';
  status?: 'paid' | 'refunded'; // Payment status (default: paid)
  date: string;
  notes?: string;

  // Refund tracking
  refundedAt?: string; // ISO timestamp when payment was refunded
  refundReason?: string; // Reason for refund
  refundedBy?: string; // User ID who performed the refund

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
  errorMessage?: string; // Error message if reminder failed to send
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

// Business hours configuration
export interface TimeSlot {
  start: string; // HH:mm format (es. "09:00")
  end: string;   // HH:mm format (es. "13:00")
}

export interface DaySchedule {
  enabled: boolean; // true = aperto, false = chiuso
  type: 'continuous' | 'split'; // continuous = orario continuato, split = mattina/pomeriggio
  morning: TimeSlot;
  afternoon?: TimeSlot; // Solo se type = 'split'
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type BusinessHours = Record<DayOfWeek, DaySchedule>;

export interface AppSettings {
  idleTimeout: number; // in minutes (0 = disabled)
  businessHours?: BusinessHours; // Orari di apertura per giorno della settimana
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
  initialSyncComplete?: boolean; // True when initial replication is complete
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
