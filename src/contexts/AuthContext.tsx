/**
 * Authentication Context
 * Manages user authentication, login, logout, and permissions
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { getUserByUsername } from '../utils/db';
import { verifyPassword, getStoredSession, storeSession, clearSession } from '../utils/auth';
import { logger } from '../utils/logger';
import { useDB } from './DBContext';

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
  const { isDBReady } = useDB();

  // Restore session only after database is ready
  useEffect(() => {
    // Wait for database to be initialized
    if (!isDBReady) {
      return;
    }

    const restoreSession = async () => {
      try {
        const session = getStoredSession();
        if (session) {
          // Verify user still exists in database
          const user = await getUserByUsername(session.username);
          if (user && user.isActive) {
            setCurrentUser(user);
            logger.info('Session restored for user:', session.username);

            // Check if we have a backend JWT token, if not, fetch one
            const existingToken = localStorage.getItem('authToken');
            if (!existingToken) {
              logger.info('No backend token found, fetching new one...');
              try {
                const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                const response = await fetch(`${API_BASE_URL}/auth/token`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    userId: user.id,
                    username: user.username,
                    role: user.role
                  }),
                });

                if (response.ok) {
                  const result = await response.json();
                  if (result.success && result.data?.token) {
                    localStorage.setItem('authToken', result.data.token);
                    logger.info('Backend JWT token obtained on session restore');
                  }
                }
              } catch (tokenError) {
                logger.warn('Failed to fetch backend token on restore:', tokenError);
              }
            }
          } else {
            // User doesn't exist or is inactive, clear session
            clearSession();
            localStorage.removeItem('authToken');
            logger.warn('Session invalid, user not found or inactive');
          }
        }
      } catch (error) {
        logger.error('Failed to restore session:', error);
        clearSession();
        localStorage.removeItem('authToken');
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [isDBReady]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Find user by username
      const user = await getUserByUsername(username);

      if (!user) {
        return { success: false, error: 'Username o password non corretti' };
      }

      if (!user.isActive) {
        return { success: false, error: 'Utente disattivato. Contatta un responsabile.' };
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.passwordHash);

      if (!isPasswordValid) {
        return { success: false, error: 'Username o password non corretti' };
      }

      // Set current user and store session
      setCurrentUser(user);
      storeSession(user.id, user.username, user.role);

      // Get JWT token from backend for API operations
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_BASE_URL}/auth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            username: user.username,
            role: user.role
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.token) {
            // Store JWT token for backend API calls
            localStorage.setItem('authToken', result.data.token);
            logger.info('Backend JWT token obtained successfully');
          } else {
            logger.warn('Failed to get JWT token from backend:', result.error);
          }
        } else {
          logger.warn('Backend auth endpoint returned error:', response.status);
        }
      } catch (tokenError) {
        // Don't fail login if backend token fetch fails
        // User can still use the app with local data
        logger.warn('Failed to fetch backend token, continuing with local-only mode:', tokenError);
      }

      logger.info('User logged in successfully:', user.username);
      return { success: true };
    } catch (error) {
      logger.error('Login error:', error);
      return { success: false, error: 'Errore durante il login. Riprova.' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    clearSession();
    // Clear backend JWT token
    localStorage.removeItem('authToken');
    logger.info('User logged out');
  };

  const hasRole = (role: UserRole): boolean => {
    return currentUser?.role === role;
  };

  const canModifySettings = (): boolean => {
    // Only RESPONSABILE can modify settings
    return currentUser?.role === 'RESPONSABILE';
  };

  const value: AuthContextType = {
    currentUser,
    isAuthenticated: currentUser !== null,
    isLoading,
    login,
    logout,
    hasRole,
    canModifySettings,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
