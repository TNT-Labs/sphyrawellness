import { apiClient } from './client';
import { User } from '../types';

export const usersApi = {
  /**
   * Get all users
   */
  getAll: async (): Promise<User[]> => {
    const { data } = await apiClient.get('/users');
    return data;
  },

  /**
   * Create a new user
   */
  create: async (user: Partial<User>): Promise<User> => {
    const { data } = await apiClient.post('/users', user);
    return data;
  },

  /**
   * Update a user
   */
  update: async (id: string, user: Partial<User>): Promise<User> => {
    const { data } = await apiClient.put(`/users/${id}`, user);
    return data;
  },

  /**
   * Delete a user
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
