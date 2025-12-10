/**
 * Database Context
 * Handles IndexedDB initialization before other contexts
 * This ensures the database is ready before authentication and app data loading
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initIndexedDB } from '../utils/indexedDB';
import { logger } from '../utils/logger';

interface DBContextType {
  isDBReady: boolean;
  dbError: string | null;
}

const DBContext = createContext<DBContextType | undefined>(undefined);

export function useDB(): DBContextType {
  const context = useContext(DBContext);
  if (!context) {
    throw new Error('useDB must be used within a DBProvider');
  }
  return context;
}

interface DBProviderProps {
  children: ReactNode;
}

export function DBProvider({ children }: DBProviderProps): JSX.Element {
  const [isDBReady, setIsDBReady] = useState<boolean>(false);
  const [dbError, setDBError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDB = async () => {
      try {
        logger.info('Initializing IndexedDB...');
        await initIndexedDB();
        setIsDBReady(true);
        logger.info('IndexedDB initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize IndexedDB:', error);
        setDBError(
          error instanceof Error
            ? error.message
            : 'Errore durante l\'inizializzazione del database'
        );
        // Show error to user
        alert(
          'Errore durante l\'inizializzazione del database. ' +
          'Assicurati di non essere in modalità incognito e che il tuo browser supporti IndexedDB. ' +
          'Ricarica la pagina per riprovare.'
        );
      }
    };

    initializeDB();
  }, []);

  const value: DBContextType = {
    isDBReady,
    dbError,
  };

  return <DBContext.Provider value={value}>{children}</DBContext.Provider>;
}
