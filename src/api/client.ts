import axios from 'axios';

// API base URL from environment or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Axios instance configured for API calls
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

/**
 * Request interceptor - Add JWT token to all requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors globally
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401) {
      console.error('Authentication error - redirecting to login');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');

      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Handle 403 Forbidden - Insufficient permissions
    if (error.response?.status === 403) {
      console.error('Insufficient permissions');
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error - check if backend is running');
    }

    // Extract error message from backend response
    if (error.response?.data?.error) {
      // Create a new Error with the backend message
      const backendError: any = new Error(error.response.data.error);
      backendError.name = error.name;
      backendError.response = error.response;
      backendError.config = error.config;
      return Promise.reject(backendError);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
