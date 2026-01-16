/**
 * Safe localStorage and sessionStorage wrapper
 * Provides try-catch protection for storage operations
 * Handles cases where storage is disabled, unavailable, or quota exceeded
 */

/**
 * Safe localStorage wrapper with try-catch
 * Handles cases where localStorage is disabled or unavailable
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`localStorage.getItem failed for key "${key}":`, error);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`localStorage.setItem failed for key "${key}":`, error);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`localStorage.removeItem failed for key "${key}":`, error);
      return false;
    }
  },

  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('localStorage.clear failed:', error);
      return false;
    }
  },

  /**
   * Check if localStorage is available
   */
  isAvailable: (): boolean => {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Safe sessionStorage wrapper with try-catch
 * Handles cases where sessionStorage is disabled or unavailable
 */
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.warn(`sessionStorage.getItem failed for key "${key}":`, error);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`sessionStorage.setItem failed for key "${key}":`, error);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`sessionStorage.removeItem failed for key "${key}":`, error);
      return false;
    }
  },

  clear: (): boolean => {
    try {
      sessionStorage.clear();
      return true;
    } catch (error) {
      console.warn('sessionStorage.clear failed:', error);
      return false;
    }
  },

  /**
   * Check if sessionStorage is available
   */
  isAvailable: (): boolean => {
    try {
      const testKey = '__sessionStorage_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },
};
