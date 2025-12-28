import { apiClient } from './client';
import type { Reminder } from '../types';

export const remindersApi = {
  /**
   * Get all reminders
   */
  getAll: async (): Promise<Reminder[]> => {
    const { data } = await apiClient.get<Reminder[]>('/reminders');
    return data;
  },

  /**
   * Send reminder for a specific appointment
   */
  sendForAppointment: async (
    appointmentId: string,
    type: 'email' | 'sms' = 'email'
  ): Promise<{ reminderId: string }> => {
    const { data } = await apiClient.post<{ reminderId: string }>(
      `/reminders/send/${appointmentId}`,
      { type }
    );
    return data;
  },

  /**
   * Send all due reminders
   */
  sendAll: async (): Promise<{
    total: number;
    sent: number;
    failed: number;
    results: Array<{ appointmentId: string; success: boolean; error?: string }>;
  }> => {
    const { data } = await apiClient.post<{
      total: number;
      sent: number;
      failed: number;
      results: Array<{ appointmentId: string; success: boolean; error?: string }>;
    }>('/reminders/send-all');
    return data;
  },
};
