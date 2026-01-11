import { apiClient } from './client';
import { AppSettings } from '../types';

export const settingsApi = {
  /**
   * Get all settings
   */
  getAll: async (): Promise<AppSettings> => {
    const { data } = await apiClient.get('/settings');
    return data as AppSettings;
  },

  /**
   * Update settings (bulk)
   */
  updateAll: async (settings: AppSettings): Promise<AppSettings> => {
    const { data } = await apiClient.put('/settings', settings);
    return data as AppSettings;
  },

  /**
   * Get single setting by key
   */
  getByKey: async (key: string): Promise<any> => {
    const { data } = await apiClient.get(`/settings/${key}`);
    return data.value;
  },

  /**
   * Update single setting
   */
  updateByKey: async (key: string, value: any): Promise<void> => {
    await apiClient.put(`/settings/${key}`, { value });
  },

  /**
   * Reset database (DANGER ZONE)
   * Requires strong confirmation
   */
  resetDatabase: async (confirmation: string): Promise<{ success: boolean; message: string; data: any }> => {
    const { data } = await apiClient.post('/settings/reset-database', { confirmation });
    return data;
  },
};
