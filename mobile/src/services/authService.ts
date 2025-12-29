/**
 * Authentication Service
 */
import apiClient from './apiClient';
import { Storage } from '@/utils/storage';
import { STORAGE_KEYS, ENDPOINTS } from '@/config/api';
import type { LoginResponse, User } from '@/types';

class AuthService {
  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>(ENDPOINTS.LOGIN, {
        username,
        password,
      });

      // Save token and user
      await apiClient.setToken(response.token);
      await Storage.set(STORAGE_KEYS.USER, response.user);

      return response;
    } catch (error: any) {
      console.error('Login error:', error);

      if (error.response?.status === 401) {
        throw new Error('Credenziali non valide');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Impossibile connettersi al server');
      } else {
        throw new Error('Errore durante il login');
      }
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await apiClient.clearToken();
      await Storage.remove(STORAGE_KEYS.USER);
      await Storage.remove(STORAGE_KEYS.LAST_SYNC);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Get current user from storage
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      return await Storage.get<User>(STORAGE_KEYS.USER);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await Storage.getString(STORAGE_KEYS.TOKEN);
      return !!token;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Verify token with server
   */
  async verifyToken(): Promise<{ valid: boolean; user?: User }> {
    try {
      if (!apiClient.hasToken()) {
        return { valid: false };
      }

      const user = await apiClient.get<User>(ENDPOINTS.ME);
      await Storage.set(STORAGE_KEYS.USER, user);

      return { valid: true, user };
    } catch (error) {
      console.error('Token verification error:', error);
      await this.logout();
      return { valid: false };
    }
  }
}

export const authService = new AuthService();
export default authService;
