import { apiClient } from './client';
import type { Customer } from '../types';

export const customersApi = {
  /**
   * Get all customers
   */
  getAll: async (search?: string): Promise<Customer[]> => {
    const { data } = await apiClient.get<Customer[]>('/customers', {
      params: { search },
    });
    return data;
  },

  /**
   * Get customer by ID
   */
  getById: async (id: string, includeAppointments = false): Promise<Customer> => {
    const { data } = await apiClient.get<Customer>(`/customers/${id}`, {
      params: { include: includeAppointments ? 'appointments' : undefined },
    });
    return data;
  },

  /**
   * Create new customer
   */
  create: async (customer: Partial<Customer>): Promise<Customer> => {
    const { data } = await apiClient.post<Customer>('/customers', customer);
    return data;
  },

  /**
   * Update customer
   */
  update: async (id: string, customer: Partial<Customer>): Promise<Customer> => {
    const { data } = await apiClient.put<Customer>(`/customers/${id}`, customer);
    return data;
  },

  /**
   * Update customer consents (GDPR)
   */
  updateConsents: async (
    id: string,
    consents: {
      privacyConsent?: boolean;
      emailReminderConsent?: boolean;
      smsReminderConsent?: boolean;
      healthDataConsent?: boolean;
      marketingConsent?: boolean;
    }
  ): Promise<Customer> => {
    const { data } = await apiClient.patch<Customer>(`/customers/${id}/consents`, consents);
    return data;
  },

  /**
   * Delete customer
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },
};
