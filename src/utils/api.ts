import type { Settings, Appointment, CustomerConsents, BusinessHours, VacationPeriod } from '../types';
import { safeSessionStorage } from './safeStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Get CSRF token from sessionStorage
 */
function getCsrfToken(): string | null {
  return safeSessionStorage.getItem('csrf_token');
}

/**
 * Store CSRF token in sessionStorage
 */
function storeCsrfToken(token: string): void {
  safeSessionStorage.setItem('csrf_token', token);
}

/**
 * Settings API
 */
export const settingsApi = {
  async get(): Promise<Settings> {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/settings`, { headers });

    // Extract and store CSRF token from response headers
    const csrfToken = response.headers.get('x-csrf-token');
    if (csrfToken) {
      storeCsrfToken(csrfToken);
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<Settings> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch settings');
    }

    return result.data;
  },

  async update(settings: Partial<Settings>): Promise<Settings> {
    const token = getAuthToken();
    const csrfToken = getCsrfToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(settings),
    });

    // Extract and store CSRF token from response headers
    const newCsrfToken = response.headers.get('x-csrf-token');
    if (newCsrfToken) {
      storeCsrfToken(newCsrfToken);
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<Settings> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update settings');
    }

    return result.data;
  },

  async getBusinessHours(): Promise<BusinessHours> {
    const response = await fetch(`${API_BASE_URL}/settings/business-hours`);

    // Extract and store CSRF token from response headers
    const csrfToken = response.headers.get('x-csrf-token');
    if (csrfToken) {
      storeCsrfToken(csrfToken);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<{ businessHours: BusinessHours }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch business hours');
    }

    return result.data.businessHours;
  },

  async updateBusinessHours(businessHours: BusinessHours): Promise<BusinessHours> {
    const token = getAuthToken();
    const csrfToken = getCsrfToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${API_BASE_URL}/settings/business-hours`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ businessHours }),
    });

    // Extract and store CSRF token from response headers
    const newCsrfToken = response.headers.get('x-csrf-token');
    if (newCsrfToken) {
      storeCsrfToken(newCsrfToken);
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<{ businessHours: BusinessHours }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update business hours');
    }

    return result.data.businessHours;
  },

  async isServer(): Promise<boolean> {
    try {
      // Include auth token if available (for admin override)
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/settings/is-server`, {
        headers,
      });
      const result: ApiResponse<{ isServer: boolean }> = await response.json();

      if (!result.success || result.data === undefined) {
        return false;
      }

      return result.data.isServer;
    } catch (error) {
      console.error('Failed to check if running on server:', error);
      return false;
    }
  },

  /**
   * Reset database (DANGER ZONE)
   * Requires strong confirmation
   */
  async resetDatabase(confirmation: string): Promise<{ success: boolean; message: string; data: any }> {
    const token = getAuthToken();
    const csrfToken = getCsrfToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${API_BASE_URL}/settings/reset-database`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ confirmation }),
    });

    // Extract and store CSRF token from response headers
    const newCsrfToken = response.headers.get('x-csrf-token');
    if (newCsrfToken) {
      storeCsrfToken(newCsrfToken);
    }

    if (!response.ok) {
      const result: ApiResponse = await response.json();
      throw new Error(result.error || `HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to reset database');
    }

    return result as { success: boolean; message: string; data: any };
  },

  async getVacationPeriods(): Promise<VacationPeriod[]> {
    const response = await fetch(`${API_BASE_URL}/settings/vacation-periods`);

    // Extract and store CSRF token from response headers
    const csrfToken = response.headers.get('x-csrf-token');
    if (csrfToken) {
      storeCsrfToken(csrfToken);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<{ vacationPeriods: VacationPeriod[] }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch vacation periods');
    }

    return result.data.vacationPeriods || [];
  },

  async updateVacationPeriods(vacationPeriods: VacationPeriod[]): Promise<VacationPeriod[]> {
    const token = getAuthToken();
    const csrfToken = getCsrfToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${API_BASE_URL}/settings/vacation-periods`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ vacationPeriods }),
    });

    // Extract and store CSRF token from response headers
    const newCsrfToken = response.headers.get('x-csrf-token');
    if (newCsrfToken) {
      storeCsrfToken(newCsrfToken);
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<{ vacationPeriods: VacationPeriod[] }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update vacation periods');
    }

    return result.data.vacationPeriods;
  },

  async getBookingWindowDays(): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/settings/booking-window-days`);

    // Extract and store CSRF token from response headers
    const csrfToken = response.headers.get('x-csrf-token');
    if (csrfToken) {
      storeCsrfToken(csrfToken);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<{ bookingWindowDays: number }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch booking window days');
    }

    return result.data.bookingWindowDays || 90; // Default to 90 days
  },

  async updateBookingWindowDays(days: number): Promise<number> {
    const token = getAuthToken();
    const csrfToken = getCsrfToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${API_BASE_URL}/settings/booking-window-days`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ bookingWindowDays: days }),
    });

    // Extract and store CSRF token from response headers
    const newCsrfToken = response.headers.get('x-csrf-token');
    if (newCsrfToken) {
      storeCsrfToken(newCsrfToken);
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<{ bookingWindowDays: number }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update booking window days');
    }

    return result.data.bookingWindowDays;
  },
};

/**
 * Reminders API
 */
export const remindersApi = {
  async sendForAppointment(appointmentId: string, type: 'email' | 'sms' = 'email'): Promise<{ reminderId: string }> {
    try {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch(`${API_BASE_URL}/reminders/send/${appointmentId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type }),
      });

      // Extract and store CSRF token from response headers
      const newCsrfToken = response.headers.get('x-csrf-token');
      if (newCsrfToken) {
        storeCsrfToken(newCsrfToken);
      }

      if (!response.ok) {
        const result: ApiResponse = await response.json();
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send reminder');
      }

      return result.data;
    } catch (error: any) {
      // Handle CORS and network errors with clearer messages
      if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
        const apiUrl = API_BASE_URL.replace('/api', '');
        throw new Error(
          `Impossibile connettersi al server backend.\n\n` +
          `Possibili cause:\n` +
          `• Il server backend non è in esecuzione\n` +
          `• Stai accedendo da un IP non autorizzato\n` +
          `• Problema di configurazione CORS\n\n` +
          `URL cercato: ${apiUrl}\n\n` +
          `Assicurati che il server backend sia avviato e che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.`
        );
      }
      if (error.message.includes('CORS')) {
        throw new Error('Errore di configurazione CORS. Verifica che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.');
      }
      throw error;
    }
  },

  async sendAll(): Promise<{
    total: number;
    sent: number;
    failed: number;
    results: Array<{ appointmentId: string; success: boolean; error?: string }>;
  }> {
    try {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch(`${API_BASE_URL}/reminders/send-all`, {
        method: 'POST',
        headers,
      });

      // Extract and store CSRF token from response headers
      const newCsrfToken = response.headers.get('x-csrf-token');
      if (newCsrfToken) {
        storeCsrfToken(newCsrfToken);
      }

      if (!response.ok) {
        const result: ApiResponse = await response.json();
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send reminders');
      }

      return result.data;
    } catch (error: any) {
      // Handle CORS and network errors with clearer messages
      if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
        const apiUrl = API_BASE_URL.replace('/api', '');
        throw new Error(
          `Impossibile connettersi al server backend.\n\n` +
          `Possibili cause:\n` +
          `• Il server backend non è in esecuzione\n` +
          `• Stai accedendo da un IP non autorizzato\n` +
          `• Problema di configurazione CORS\n\n` +
          `URL cercato: ${apiUrl}\n\n` +
          `Assicurati che il server backend sia avviato e che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.`
        );
      }
      if (error.message.includes('CORS')) {
        throw new Error('Errore di configurazione CORS. Verifica che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.');
      }
      throw error;
    }
  },

  async getAppointmentsNeedingReminders(): Promise<Appointment[]> {
    const response = await fetch(`${API_BASE_URL}/reminders/appointments-needing-reminders`);
    const result: ApiResponse<Appointment[]> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch appointments');
    }

    return result.data;
  },
};

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');  // Fixed: was 'authToken', should be 'auth_token'
}

/**
 * Appointments API
 */
export const appointmentsApi = {
  async getAll(): Promise<Appointment[]> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/appointments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const result: ApiResponse<Appointment[]> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch appointments');
    }

    return result.data;
  },

  async confirm(appointmentId: string, token: string): Promise<Appointment> {
    // Public endpoint - no authentication required, but CSRF token may be needed
    const csrfToken = getCsrfToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${API_BASE_URL}/public/appointments/${appointmentId}/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token }),
    });

    // Extract and store CSRF token from response headers
    const newCsrfToken = response.headers.get('x-csrf-token');
    if (newCsrfToken) {
      storeCsrfToken(newCsrfToken);
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to confirm appointment');
    }

    const appointment = await response.json();
    return appointment;
  },
};

/**
 * Customers API
 */
export const customersApi = {
  async updateConsents(customerId: string, consents: Partial<CustomerConsents>): Promise<void> {
    try {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/consents`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ consents }),
      });

      // Extract and store CSRF token from response headers
      const newCsrfToken = response.headers.get('x-csrf-token');
      if (newCsrfToken) {
        storeCsrfToken(newCsrfToken);
      }

      if (!response.ok) {
        const result: ApiResponse = await response.json();
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update consents');
      }
    } catch (error: any) {
      // Handle CORS and network errors with clearer messages
      if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
        const apiUrl = API_BASE_URL.replace('/api', '');
        throw new Error(
          `Impossibile connettersi al server backend.\n\n` +
          `Possibili cause:\n` +
          `• Il server backend non è in esecuzione\n` +
          `• Stai accedendo da un IP non autorizzato\n` +
          `• Problema di configurazione CORS\n\n` +
          `URL cercato: ${apiUrl}\n\n` +
          `Assicurati che il server backend sia avviato e che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.`
        );
      }
      if (error.message.includes('CORS')) {
        throw new Error('Errore di configurazione CORS. Verifica che tu stia accedendo tramite HTTPS da un indirizzo della rete privata.');
      }
      throw error;
    }
  },
};

/**
 * Export helper function for backward compatibility
 */
export const updateCustomerConsents = customersApi.updateConsents;

/**
 * Health check
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
      method: 'GET',
    });

    const result: ApiResponse = await response.json();
    return result.success;
  } catch (error) {
    console.error('Server health check failed:', error);
    return false;
  }
}
