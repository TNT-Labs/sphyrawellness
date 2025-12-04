/**
 * Validation schemas using Zod
 * Provides type-safe validation for all forms
 */

import { z } from 'zod';

// ============================================
// Customer Validation
// ============================================

export const customerSchema = z.object({
  id: z.string().min(1, 'ID richiesto'),
  firstName: z.string()
    .min(2, 'Il nome deve contenere almeno 2 caratteri')
    .max(50, 'Il nome non può superare 50 caratteri')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Il nome contiene caratteri non validi'),
  lastName: z.string()
    .min(2, 'Il cognome deve contenere almeno 2 caratteri')
    .max(50, 'Il cognome non può superare 50 caratteri')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Il cognome contiene caratteri non validi'),
  email: z.string()
    .email('Email non valida')
    .toLowerCase()
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(/^[\d\s\-\+\(\)]+$/, 'Numero di telefono non valido')
    .min(8, 'Numero di telefono troppo corto')
    .max(20, 'Numero di telefono troppo lungo'),
  dateOfBirth: z.string().optional(),
  notes: z.string().max(1000, 'Le note non possono superare 1000 caratteri').optional(),
  allergies: z.string().max(500, 'Le allergie non possono superare 500 caratteri').optional(),
  createdAt: z.string(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

// ============================================
// Service Validation
// ============================================

export const serviceSchema = z.object({
  id: z.string().min(1, 'ID richiesto'),
  name: z.string()
    .min(2, 'Il nome del servizio deve contenere almeno 2 caratteri')
    .max(100, 'Il nome del servizio non può superare 100 caratteri'),
  description: z.string()
    .max(500, 'La descrizione non può superare 500 caratteri')
    .optional()
    .or(z.literal('')),
  duration: z.number()
    .int('La durata deve essere un numero intero')
    .min(5, 'La durata minima è 5 minuti')
    .max(480, 'La durata massima è 8 ore (480 minuti)'),
  price: z.number()
    .min(0, 'Il prezzo non può essere negativo')
    .max(10000, 'Il prezzo non può superare 10000€'),
  category: z.string().min(1, 'Categoria richiesta'),
  color: z.string().optional(),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

// ============================================
// Staff Validation
// ============================================

export const staffSchema = z.object({
  id: z.string().min(1, 'ID richiesto'),
  firstName: z.string()
    .min(2, 'Il nome deve contenere almeno 2 caratteri')
    .max(50, 'Il nome non può superare 50 caratteri'),
  lastName: z.string()
    .min(2, 'Il cognome deve contenere almeno 2 caratteri')
    .max(50, 'Il cognome non può superare 50 caratteri'),
  email: z.string()
    .email('Email non valida')
    .toLowerCase()
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(/^[\d\s\-\+\(\)]+$/, 'Numero di telefono non valido')
    .min(8, 'Numero di telefono troppo corto')
    .max(20, 'Numero di telefono troppo lungo'),
  role: z.string().min(1, 'Ruolo richiesto'),
  specializations: z.array(z.string()),
  color: z.string(),
  isActive: z.boolean(),
});

export type StaffFormData = z.infer<typeof staffSchema>;

// ============================================
// Appointment Validation
// ============================================

export const appointmentSchema = z.object({
  id: z.string().min(1, 'ID richiesto'),
  customerId: z.string().min(1, 'Cliente richiesto'),
  serviceId: z.string().min(1, 'Servizio richiesto'),
  staffId: z.string().min(1, 'Operatore richiesto'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida (formato: YYYY-MM-DD)'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Ora di inizio non valida (formato: HH:mm)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Ora di fine non valida (formato: HH:mm)'),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show']),
  notes: z.string().max(1000, 'Le note non possono superare 1000 caratteri').optional(),
  reminderSent: z.boolean().optional(),
  createdAt: z.string(),
}).refine(
  (data) => {
    // Validate that endTime is after startTime
    if (data.startTime && data.endTime) {
      const [startHours, startMinutes] = data.startTime.split(':').map(Number);
      const [endHours, endMinutes] = data.endTime.split(':').map(Number);
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;
      return endTotalMinutes > startTotalMinutes;
    }
    return true;
  },
  {
    message: "L'ora di fine deve essere successiva all'ora di inizio",
    path: ['endTime'],
  }
);

export type AppointmentFormData = z.infer<typeof appointmentSchema>;

// ============================================
// Payment Validation
// ============================================

export const paymentSchema = z.object({
  id: z.string().min(1, 'ID richiesto'),
  appointmentId: z.string().min(1, 'Appuntamento richiesto'),
  amount: z.number()
    .min(0, "L'importo non può essere negativo")
    .max(10000, "L'importo non può superare 10000€"),
  method: z.enum(['cash', 'card', 'transfer', 'other']),
  date: z.string(),
  notes: z.string().max(500, 'Le note non possono superare 500 caratteri').optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// ============================================
// Settings Validation
// ============================================

export const settingsSchema = z.object({
  idleTimeout: z.number()
    .int('Il timeout deve essere un numero intero')
    .min(0, 'Il timeout non può essere negativo')
    .max(120, 'Il timeout massimo è 120 minuti'),
  syncEnabled: z.boolean(),
  couchdbUrl: z.string()
    .url('URL non valido')
    .optional()
    .or(z.literal('')),
  couchdbUsername: z.string()
    .max(100, 'Username troppo lungo')
    .optional()
    .or(z.literal('')),
  couchdbPassword: z.string()
    .max(100, 'Password troppo lunga')
    .optional()
    .or(z.literal('')),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

// ============================================
// Staff Role Validation
// ============================================

export const staffRoleSchema = z.object({
  id: z.string().min(1, 'ID richiesto'),
  name: z.string()
    .min(2, 'Il nome del ruolo deve contenere almeno 2 caratteri')
    .max(50, 'Il nome del ruolo non può superare 50 caratteri'),
  isActive: z.boolean(),
});

export type StaffRoleFormData = z.infer<typeof staffRoleSchema>;

// ============================================
// Service Category Validation
// ============================================

export const serviceCategorySchema = z.object({
  id: z.string().min(1, 'ID richiesto'),
  name: z.string()
    .min(2, 'Il nome della categoria deve contenere almeno 2 caratteri')
    .max(50, 'Il nome della categoria non può superare 50 caratteri'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Colore non valido (formato: #RRGGBB)'),
  isActive: z.boolean(),
});

export type ServiceCategoryFormData = z.infer<typeof serviceCategorySchema>;

// ============================================
// Validation Helper Functions
// ============================================

/**
 * Validate data against a schema and return formatted errors
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format errors for easy display
  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.') || 'root';
    errors[path] = issue.message;
  });

  return { success: false, errors };
}

/**
 * Sanitize string input (trim whitespace, remove control characters)
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Sanitize phone number (remove non-numeric characters except +)
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d\s\-\+\(\)]/g, '');
}

/**
 * Sanitize email (lowercase, trim)
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
