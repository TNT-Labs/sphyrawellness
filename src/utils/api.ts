import type { Settings, Appointment } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Settings API
 */
export const settingsApi = {
  async get(): Promise<Settings> {
    const response = await fetch(`${API_BASE_URL}/settings`);
    const result: ApiResponse<Settings> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch settings');
    }

    return result.data;
  },

  async update(settings: Partial<Settings>): Promise<Settings> {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    const result: ApiResponse<Settings> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update settings');
    }

    return result.data;
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
};

/**
 * Reminders API
 */
export const remindersApi = {
  async sendForAppointment(appointmentId: string): Promise<{ reminderId: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/reminders/send/${appointmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

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
      const response = await fetch(`${API_BASE_URL}/reminders/send-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

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
  return localStorage.getItem('authToken');
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
    const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const result: ApiResponse<Appointment> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to confirm appointment');
    }

    return result.data;
  },
};

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
