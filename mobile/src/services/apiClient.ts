/**
 * API Client for communicating with Sphyra backend
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import { Storage } from '@/utils/storage';
import { STORAGE_KEYS, DEFAULT_API_URL, API_TIMEOUT } from '@/config/api';

class APIClient {
  private client: AxiosInstance;
  private apiUrl: string = DEFAULT_API_URL;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken();
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Initialize client with stored configuration
   */
  async initialize(): Promise<void> {
    try {
      // Load API URL
      const storedApiUrl = await Storage.getString(STORAGE_KEYS.API_URL);
      if (storedApiUrl) {
        this.apiUrl = storedApiUrl;
        this.client.defaults.baseURL = this.apiUrl;
      }

      // Load token
      const storedToken = await Storage.getString(STORAGE_KEYS.TOKEN);
      if (storedToken) {
        this.token = storedToken;
      }

      console.log('API Client initialized:', this.apiUrl);
    } catch (error) {
      console.error('Error initializing API client:', error);
    }
  }

  /**
   * Set API URL
   */
  async setApiUrl(url: string): Promise<void> {
    this.apiUrl = url;
    this.client.defaults.baseURL = url;
    await Storage.setString(STORAGE_KEYS.API_URL, url);
  }

  /**
   * Get current API URL
   */
  getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * Set authentication token
   */
  async setToken(token: string): Promise<void> {
    this.token = token;
    await Storage.setString(STORAGE_KEYS.TOKEN, token);
  }

  /**
   * Clear authentication token
   */
  async clearToken(): Promise<void> {
    this.token = null;
    await Storage.remove(STORAGE_KEYS.TOKEN);
  }

  /**
   * Check if client has token
   */
  hasToken(): boolean {
    return !!this.token;
  }

  /**
   * Make GET request
   */
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  /**
   * Make POST request
   */
  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  /**
   * Make PUT request
   */
  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  /**
   * Make DELETE request
   */
  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  /**
   * Test connection to API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Health endpoint is at /health (not /api/health)
      // So we need to call it from the base URL without /api
      const baseUrl = this.apiUrl.replace('/api', '');
      await axios.get(`${baseUrl}/health`, { timeout: 5000 });
      return { success: true };
    } catch (error: any) {
      let errorMessage = 'Unknown error';

      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused - check if server is running';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timeout - check network and URL';
      } else if (error.response?.status) {
        errorMessage = `Server error: ${error.response.status}`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { success: false, error: errorMessage };
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient();
export default apiClient;
