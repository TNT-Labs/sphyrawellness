import { apiClient } from './client';
import type { Payment } from '../types';

export const paymentsApi = {
  /**
   * Get all payments
   */
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
    appointmentId?: string;
  }): Promise<Payment[]> => {
    const { data } = await apiClient.get<Payment[]>('/payments', { params });
    return data;
  },

  /**
   * Get payment by ID
   */
  getById: async (id: string): Promise<Payment> => {
    const { data } = await apiClient.get<Payment>(`/payments/${id}`);
    return data;
  },

  /**
   * Create new payment
   */
  create: async (payment: Partial<Payment>): Promise<Payment> => {
    const { data } = await apiClient.post<Payment>('/payments', payment);
    return data;
  },

  /**
   * Update payment
   */
  update: async (id: string, payment: Partial<Payment>): Promise<Payment> => {
    const { data } = await apiClient.put<Payment>(`/payments/${id}`, payment);
    return data;
  },

  /**
   * Delete payment
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/payments/${id}`);
  },

  /**
   * Get revenue statistics
   */
  getRevenueStats: async (startDate: string, endDate: string): Promise<{
    total: number;
    byMethod: Array<{ method: string; total: number; count: number }>;
  }> => {
    const { data } = await apiClient.get('/payments/stats/revenue', {
      params: { startDate, endDate },
    });
    return data;
  },
};
