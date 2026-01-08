/**
 * Authentication Context - PostgreSQL + REST API Version
 * Manages user authentication with JWT tokens
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../api';
import { logger } from '../utils/logger';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (_username: string, _password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasRole: (_role: UserRole) => boolean;
  canModifySettings: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Verify existing token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const user = await authApi.verify();
        setCurrentUser(user);
        logger.info('Session restored for user:', user.username);
      } catch (error) {
        logger.warn('Token verification failed:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  /**
   * Login with username and password
   */
  const login = useCallback(async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { token, user } = await authApi.login(username, password);

      // Store token and user
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));

      setCurrentUser(user);
      logger.info('User logged in:', username);

      return { success: true };
    } catch (error: any) {
      logger.error('Login failed:', error);

      const errorMessage =
        error.response?.status === 401
          ? 'Nome utente o password non corretti'
          : 'Errore di connessione al server';

      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(() => {
    try {
      // Call logout endpoint (optional - just clears server-side if needed)
      authApi.logout().catch(() => {
        // Ignore errors
      });
    } finally {
      // Clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');

      setCurrentUser(null);
      logger.info('User logged out');
    }
  }, []);

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback((role: UserRole): boolean => {
    return currentUser?.role === role;
  }, [currentUser]);

  /**
   * Check if user can modify settings
   */
  const canModifySettings = useCallback((): boolean => {
    return currentUser?.role === 'RESPONSABILE';
  }, [currentUser]);

  const value: AuthContextType = useMemo(
    () => ({
      currentUser,
      isAuthenticated: !!currentUser,
      isLoading,
      login,
      logout,
      hasRole,
      canModifySettings,
    }),
    [currentUser, isLoading, login, logout, hasRole, canModifySettings]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
