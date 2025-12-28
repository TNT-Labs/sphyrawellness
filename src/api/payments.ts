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
    // Convert Decimal amounts from strings to numbers
    return data.map(payment => ({
      ...payment,
      amount: typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount,
    }));
  },

  /**
   * Get payment by ID
   */
  getById: async (id: string): Promise<Payment> => {
    const { data } = await apiClient.get<Payment>(`/payments/${id}`);
    // Convert Decimal amount from string to number
    return {
      ...data,
      amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
    };
  },

  /**
   * Create new payment
   */
  create: async (payment: Partial<Payment>): Promise<Payment> => {
    const { data } = await apiClient.post<Payment>('/payments', payment);
    // Convert Decimal amount from string to number
    return {
      ...data,
      amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
    };
  },

  /**
   * Update payment
   */
  update: async (id: string, payment: Partial<Payment>): Promise<Payment> => {
    const { data } = await apiClient.put<Payment>(`/payments/${id}`, payment);
    // Convert Decimal amount from string to number
    return {
      ...data,
      amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
    };
  },

  /**
   * Refund/Storno payment
   */
  refund: async (
    id: string,
    reason: string
  ): Promise<{ success: boolean; message: string; payment: Payment }> => {
    const { data } = await apiClient.post(`/payments/${id}/refund`, { reason });
    return data;
  },

  /**
   * Delete payment (only for refunded payments)
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
