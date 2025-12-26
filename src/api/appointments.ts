import { apiClient } from './client';
import type { Appointment } from '../types';

export const appointmentsApi = {
  /**
   * Get all appointments
   */
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
    customerId?: string;
    staffId?: string;
    serviceId?: string;
    status?: string;
  }): Promise<Appointment[]> => {
    const { data } = await apiClient.get<Appointment[]>('/appointments', { params });
    return data;
  },

  /**
   * Get appointment by ID
   */
  getById: async (id: string): Promise<Appointment> => {
    const { data } = await apiClient.get<Appointment>(`/appointments/${id}`);
    return data;
  },

  /**
   * Create new appointment
   */
  create: async (appointment: Partial<Appointment>): Promise<Appointment> => {
    const { data } = await apiClient.post<Appointment>('/appointments', appointment);
    return data;
  },

  /**
   * Update appointment
   */
  update: async (id: string, appointment: Partial<Appointment>): Promise<Appointment> => {
    const { data } = await apiClient.put<Appointment>(`/appointments/${id}`, appointment);
    return data;
  },

  /**
   * Update appointment status
   */
  updateStatus: async (id: string, status: string): Promise<Appointment> => {
    const { data } = await apiClient.patch<Appointment>(`/appointments/${id}/status`, { status });
    return data;
  },

  /**
   * Delete appointment
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/appointments/${id}`);
  },
};
