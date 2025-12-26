import { apiClient } from './client';
import type { User } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export interface VerifyResponse {
  valid: boolean;
  user: User;
}

export const authApi = {
  /**
   * Login with username and password
   */
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', {
      username,
      password,
    });
    return data;
  },

  /**
   * Verify JWT token
   */
  verify: async (): Promise<User> => {
    const { data } = await apiClient.post<VerifyResponse>('/auth/verify');
    return data.user;
  },

  /**
   * Logout (client-side only)
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};
