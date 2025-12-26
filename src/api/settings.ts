import { apiClient } from './client';

export const settingsApi = {
  /**
   * Get all settings
   */
  getAll: async (): Promise<Record<string, any>> => {
    const { data } = await apiClient.get('/settings');
    return data;
  },

  /**
   * Update settings (bulk)
   */
  updateAll: async (settings: Record<string, any>): Promise<Record<string, any>> => {
    const { data } = await apiClient.put('/settings', settings);
    return data;
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
};
