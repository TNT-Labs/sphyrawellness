/**
 * Authentication Context
 * Manages user authentication, login, logout, and permissions
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { getUserByUsername } from '../utils/db';
import { verifyPassword, getStoredSession, storeSession, clearSession } from '../utils/auth';
import { logger } from '../utils/logger';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
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

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = getStoredSession();
        if (session) {
          // Verify user still exists in database
          const user = await getUserByUsername(session.username);
          if (user && user.isActive) {
            setCurrentUser(user);
            logger.info('Session restored for user:', session.username);
          } else {
            // User doesn't exist or is inactive, clear session
            clearSession();
            logger.warn('Session invalid, user not found or inactive');
          }
        }
      } catch (error) {
        logger.error('Failed to restore session:', error);
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

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
