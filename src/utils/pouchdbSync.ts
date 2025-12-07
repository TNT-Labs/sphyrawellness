/**
 * PouchDB/CouchDB Synchronization Service
 *
 * This module provides bidirectional synchronization between local PouchDB
 * and remote CouchDB for multi-device data consistency.
 */

import PouchDB from 'pouchdb-browser';
import PouchDBFind from 'pouchdb-find';
import { logger } from './logger';
import { loadSettingsWithPassword } from './storage';
import type { SyncStatus } from '../types';

// Enable PouchDB Find plugin for queries
PouchDB.plugin(PouchDBFind);

// Database names
const DB_NAMES = {
  CUSTOMERS: 'sphyra-customers',
  SERVICES: 'sphyra-services',
  STAFF: 'sphyra-staff',
  APPOINTMENTS: 'sphyra-appointments',
  PAYMENTS: 'sphyra-payments',
  REMINDERS: 'sphyra-reminders',
  STAFF_ROLES: 'sphyra-staff-roles',
  SERVICE_CATEGORIES: 'sphyra-service-categories',
} as const;

// PouchDB instances
let localDatabases: Record<string, PouchDB.Database> = {};
let syncHandlers: Record<string, PouchDB.Replication.Sync<any>> = {};

// Sync status
let syncStatus: SyncStatus = {
  isActive: false,
  status: 'idle',
};

// Sync status callbacks
const syncStatusCallbacks: Set<(status: SyncStatus) => void> = new Set();

/**
 * Subscribe to sync status changes
 */
export function onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
  syncStatusCallbacks.add(callback);
  // Return unsubscribe function
  return () => {
    syncStatusCallbacks.delete(callback);
  };
}

/**
 * Notify all subscribers of sync status change
 */
function notifySyncStatusChange(newStatus: Partial<SyncStatus>): void {
  syncStatus = { ...syncStatus, ...newStatus };
  syncStatusCallbacks.forEach(callback => {
    try {
      callback(syncStatus);
    } catch (error) {
      logger.error('Error in sync status callback:', error);
    }
  });
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

/**
 * Initialize local PouchDB databases
 */
function initializeLocalDatabases(): void {
  if (Object.keys(localDatabases).length > 0) {
    logger.log('Local databases already initialized');
    return;
  }

  Object.entries(DB_NAMES).forEach(([key, dbName]) => {
    try {
      localDatabases[key] = new PouchDB(dbName);
      logger.log(`Initialized local database: ${dbName}`);
    } catch (error) {
      logger.error(`Failed to initialize local database ${dbName}:`, error);
      throw error;
    }
  });
}

/**
 * Ensure remote database exists, create if it doesn't
 * Uses HTTP PUT to create databases, similar to the setup script
 */
async function ensureRemoteDatabaseExists(remoteUrl: string, dbName: string): Promise<boolean> {
  try {
    // Parse URL to extract credentials and base URL
    const urlObj = new URL(remoteUrl);
    const hasCredentials = urlObj.username && urlObj.password;

    // Build base URL without credentials
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const dbUrl = `${baseUrl}/${dbName}`;

    // Prepare headers with authentication
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (hasCredentials) {
      const authString = btoa(`${urlObj.username}:${urlObj.password}`);
      headers['Authorization'] = `Basic ${authString}`;
    }

    // First, check if database exists using HEAD request
    const headResponse = await fetch(dbUrl, {
      method: 'HEAD',
      headers,
    });

    if (headResponse.ok) {
      logger.log(`Remote database ${dbName} already exists`);
      return true;
    }

    // If 404, database doesn't exist - try to create it
    if (headResponse.status === 404) {
      logger.log(`Remote database ${dbName} not found, attempting to create...`);

      // Create database using HTTP PUT
      const createResponse = await fetch(dbUrl, {
        method: 'PUT',
        headers,
      });

      if (createResponse.status === 201) {
        logger.log(`Remote database ${dbName} created successfully`);
        return true;
      } else if (createResponse.status === 412) {
        // Database already exists (created by another process)
        logger.log(`Remote database ${dbName} already exists (412)`);
        return true;
      } else if (createResponse.status === 401) {
        logger.error(`Authentication failed when creating database ${dbName}. Check credentials.`);
        return false;
      } else if (createResponse.status === 403) {
        logger.error(`Access denied when creating database ${dbName}. User lacks permissions to create databases.`);
        return false;
      } else {
        // Failed to create
        const errorData = await createResponse.json().catch(() => ({ reason: 'Unknown error' }));
        logger.error(`Failed to create remote database ${dbName} (status ${createResponse.status}): ${errorData.reason || createResponse.statusText}`);
        return false;
      }
    }

    // Handle authentication errors on HEAD request
    if (headResponse.status === 401) {
      logger.error(`Authentication failed for database ${dbName}. Check credentials.`);
      return false;
    }

    if (headResponse.status === 403) {
      logger.error(`Access denied for database ${dbName}. User lacks permissions.`);
      return false;
    }

    // Other errors
    logger.error(`Unexpected status ${headResponse.status} when checking database ${dbName}`);
    return false;
  } catch (error: any) {
    // Network or CORS errors
    logger.error(`Error checking/creating remote database ${dbName}:`, error);

    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      logger.error(`Network error for ${dbName}. Possible CORS issue or server unreachable.`);
    }

    return false;
  }
}

/**
 * Start synchronization with CouchDB
 */
export async function startSync(): Promise<boolean> {
  try {
    const settings = await loadSettingsWithPassword();

    if (!settings.syncEnabled) {
      logger.warn('Sync is disabled in settings');
      return false;
    }

    if (!settings.couchdbUrl) {
      logger.error('CouchDB URL is not configured');
      notifySyncStatusChange({
        status: 'error',
        error: 'CouchDB URL non configurato',
        isActive: false,
      });
      return false;
    }

    // Initialize local databases if not already done
    initializeLocalDatabases();

    // Build remote URL with credentials
    let remoteUrl = settings.couchdbUrl;
    if (settings.couchdbUsername && settings.couchdbPassword) {
      const url = new URL(remoteUrl);
      url.username = settings.couchdbUsername;
      url.password = settings.couchdbPassword;
      remoteUrl = url.toString();
    }

    // Ensure all remote databases exist before starting sync
    logger.log('Verifying remote databases...');
    const dbCreationResults = await Promise.all(
      Object.values(DB_NAMES).map(dbName => ensureRemoteDatabaseExists(remoteUrl, dbName))
    );

    // Check if any database creation failed
    const allDatabasesReady = dbCreationResults.every(result => result === true);
    if (!allDatabasesReady) {
      logger.error('Some remote databases could not be created');
      notifySyncStatusChange({
        status: 'error',
        error: 'Impossibile creare alcuni database remoti. Verifica i permessi.',
        isActive: false,
      });
      return false;
    }

    logger.log('All remote databases verified/created successfully');

    // Stop existing sync handlers
    await stopSync();

    notifySyncStatusChange({
      status: 'syncing',
      isActive: true,
      direction: 'both',
    });

    // Start bidirectional sync for each database
    Object.entries(localDatabases).forEach(([key, localDB]) => {
      const remoteName = DB_NAMES[key as keyof typeof DB_NAMES];
      const remoteDB = new PouchDB(`${remoteUrl}/${remoteName}`);

      // Setup bidirectional sync with live updates
      const sync = PouchDB.sync(localDB, remoteDB, {
        live: true,
        retry: true,
      });

      // Handle sync events
      sync.on('change', (info) => {
        logger.log(`Sync change for ${remoteName}:`, info);
        notifySyncStatusChange({
          lastSync: new Date().toISOString(),
          status: 'syncing',
        });
      });

      sync.on('paused', () => {
        logger.log(`Sync paused for ${remoteName}`);
        notifySyncStatusChange({
          status: 'idle',
          lastSync: new Date().toISOString(),
        });
      });

      sync.on('active', () => {
        logger.log(`Sync active for ${remoteName}`);
        notifySyncStatusChange({
          status: 'syncing',
        });
      });

      sync.on('error', (err: unknown) => {
        logger.error(`Sync error for ${remoteName}:`, err);
        notifySyncStatusChange({
          status: 'error',
          error: err instanceof Error ? err.message : 'Errore di sincronizzazione',
        });
      });

      sync.on('denied', (err: unknown) => {
        logger.error(`Sync denied for ${remoteName}:`, err);
        notifySyncStatusChange({
          status: 'error',
          error: 'Accesso negato al server',
        });
      });

      syncHandlers[key] = sync;
    });

    logger.log('Synchronization started successfully');
    return true;
  } catch (error) {
    logger.error('Failed to start sync:', error);
    notifySyncStatusChange({
      status: 'error',
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
      isActive: false,
    });
    return false;
  }
}

/**
 * Stop synchronization
 */
export async function stopSync(): Promise<void> {
  try {
    // Cancel all sync handlers
    const cancelPromises = Object.values(syncHandlers).map(sync => {
      return sync.cancel();
    });

    await Promise.all(cancelPromises);
    syncHandlers = {};

    notifySyncStatusChange({
      status: 'idle',
      isActive: false,
      error: undefined,
    });

    logger.log('Synchronization stopped');
  } catch (error) {
    logger.error('Error stopping sync:', error);
  }
}

/**
 * Test connection to CouchDB server
 */
export async function testCouchDBConnection(
  url: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate URL format
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch (urlError) {
      return {
        success: false,
        error: 'URL non valido. Assicurati di includere il protocollo (http:// o https://)',
      };
    }

    // Check protocol
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return {
        success: false,
        error: 'Il protocollo deve essere http:// o https://',
      };
    }

    let remoteUrl = url;
    if (username && password) {
      urlObj.username = username;
      urlObj.password = password;
      remoteUrl = urlObj.toString();
    }

    // Try to connect to CouchDB root endpoint to verify server is reachable
    // We make a simple fetch to the root endpoint which returns server info
    const response = await fetch(remoteUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const serverInfo = await response.json();
    logger.log('CouchDB connection test succeeded:', serverInfo);

    // Verify it's actually a CouchDB server
    if (!serverInfo.couchdb || !serverInfo.version) {
      return {
        success: false,
        error: 'Il server non sembra essere un\'istanza CouchDB valida',
      };
    }

    return { success: true };
  } catch (error: any) {
    logger.error('CouchDB connection test failed:', error);

    // Provide more specific error messages
    let errorMessage = 'Connessione fallita';

    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      errorMessage = 'Impossibile raggiungere il server. Verifica che:\n' +
        '• L\'URL sia corretto e il server sia raggiungibile\n' +
        '• Il server CouchDB sia in esecuzione\n' +
        '• Le impostazioni CORS siano configurate correttamente sul server\n' +
        '• Non ci siano blocchi firewall';
    } else if (error.status === 401 || error.name === 'unauthorized') {
      errorMessage = 'Autenticazione fallita. Verifica username e password';
    } else if (error.status === 403 || error.name === 'forbidden') {
      errorMessage = 'Accesso negato. L\'utente non ha i permessi necessari';
    } else if (error.status === 404 || error.name === 'not_found') {
      errorMessage = 'Database non trovato. Il server CouchDB è raggiungibile ma il database non esiste';
    } else if (error.status === 0) {
      errorMessage = 'Errore di rete. Possibile problema CORS o server non raggiungibile';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Perform a one-time sync (pull and push)
 */
export async function performOneTimeSync(): Promise<boolean> {
  try {
    const settings = await loadSettingsWithPassword();

    if (!settings.couchdbUrl) {
      logger.error('CouchDB URL is not configured');
      return false;
    }

    // Initialize local databases if not already done
    initializeLocalDatabases();

    // Build remote URL with credentials
    let remoteUrl = settings.couchdbUrl;
    if (settings.couchdbUsername && settings.couchdbPassword) {
      const url = new URL(remoteUrl);
      url.username = settings.couchdbUsername;
      url.password = settings.couchdbPassword;
      remoteUrl = url.toString();
    }

    // Ensure all remote databases exist before syncing
    logger.log('Verifying remote databases for one-time sync...');
    const dbCreationResults = await Promise.all(
      Object.values(DB_NAMES).map(dbName => ensureRemoteDatabaseExists(remoteUrl, dbName))
    );

    const allDatabasesReady = dbCreationResults.every(result => result === true);
    if (!allDatabasesReady) {
      logger.error('Some remote databases could not be created for one-time sync');
      notifySyncStatusChange({
        status: 'error',
        error: 'Impossibile creare alcuni database remoti',
        isActive: false,
      });
      return false;
    }

    notifySyncStatusChange({
      status: 'syncing',
      isActive: true,
    });

    // Perform one-time sync for each database
    const syncPromises = Object.entries(localDatabases).map(async ([key, localDB]) => {
      const remoteName = DB_NAMES[key as keyof typeof DB_NAMES];
      const remoteDB = new PouchDB(`${remoteUrl}/${remoteName}`);

      // Perform bidirectional replication
      await PouchDB.sync(localDB, remoteDB);

      logger.log(`One-time sync completed for ${remoteName}`);
    });

    await Promise.all(syncPromises);

    notifySyncStatusChange({
      status: 'idle',
      isActive: false,
      lastSync: new Date().toISOString(),
    });

    logger.log('One-time synchronization completed successfully');
    return true;
  } catch (error) {
    logger.error('Failed to perform one-time sync:', error);
    notifySyncStatusChange({
      status: 'error',
      error: error instanceof Error ? error.message : 'Errore di sincronizzazione',
      isActive: false,
    });
    return false;
  }
}

/**
 * Close all database connections
 */
export async function closeDatabases(): Promise<void> {
  try {
    // Stop sync first
    await stopSync();

    // Close all local databases
    const closePromises = Object.values(localDatabases).map(db => db.close());
    await Promise.all(closePromises);

    localDatabases = {};
    logger.log('All databases closed');
  } catch (error) {
    logger.error('Error closing databases:', error);
  }
}

/**
 * Initialize sync based on settings
 */
export async function initializeSync(): Promise<void> {
  try {
    const settings = await loadSettingsWithPassword();

    if (settings.syncEnabled && settings.couchdbUrl) {
      logger.log('Auto-starting sync based on settings');
      await startSync();
    } else {
      logger.log('Sync is disabled or not configured');
    }
  } catch (error) {
    logger.error('Failed to initialize sync:', error);
  }
}
