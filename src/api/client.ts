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
 * Request interceptor - Add JWT token and CSRF token to all requests
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add JWT token
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token for state-changing requests (if available)
    if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
      const csrfToken = sessionStorage.getItem('csrf_token');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Extract CSRF token and handle errors globally
 */
apiClient.interceptors.response.use(
  (response) => {
    // Extract and store CSRF token from response headers (if present)
    const csrfToken = response.headers['x-csrf-token'];
    if (csrfToken) {
      sessionStorage.setItem('csrf_token', csrfToken);
    }
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401) {
      console.error('Authentication error - redirecting to login');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');

      // Dispatch custom event for SPA navigation (React Router compatible)
      // The App component should listen to this event and navigate programmatically
      if (window.location.pathname !== '/login') {
        const authErrorEvent = new CustomEvent('auth:unauthorized', {
          detail: { redirectTo: '/login' }
        });
        window.dispatchEvent(authErrorEvent);

        // Fallback to hard redirect after delay if SPA doesn't handle it
        // This ensures navigation even if the event listener isn't registered
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }, 100);
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
