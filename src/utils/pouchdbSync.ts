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
 */
async function ensureRemoteDatabaseExists(remoteUrl: string, dbName: string): Promise<boolean> {
  try {
    const remoteDB = new PouchDB(`${remoteUrl}/${dbName}`);

    // Try to get database info (this will fail if DB doesn't exist)
    await remoteDB.info();

    logger.log(`Remote database ${dbName} exists`);
    await remoteDB.close();
    return true;
  } catch (error: any) {
    // Database doesn't exist or other error
    if (error.status === 404 || error.name === 'not_found') {
      logger.log(`Remote database ${dbName} not found, attempting to create...`);

      try {
        // PouchDB will automatically create the database on first write
        const remoteDB = new PouchDB(`${remoteUrl}/${dbName}`);

        // Write a dummy document to ensure database creation
        await remoteDB.put({
          _id: '_design/init',
          views: {},
        });

        logger.log(`Remote database ${dbName} created successfully`);
        await remoteDB.close();
        return true;
      } catch (createError: any) {
        logger.error(`Failed to create remote database ${dbName}:`, createError);
        return false;
      }
    } else {
      // Other error (authentication, network, etc.)
      logger.error(`Error checking remote database ${dbName}:`, error);
      return false;
    }
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
    let remoteUrl = url;
    if (username && password) {
      const urlObj = new URL(remoteUrl);
      urlObj.username = username;
      urlObj.password = password;
      remoteUrl = urlObj.toString();
    }

    // Try to connect to a test database
    const testDB = new PouchDB(`${remoteUrl}/_users`);

    // Try to get info (this will test the connection)
    await testDB.info();

    // Close the test connection
    await testDB.close();

    return { success: true };
  } catch (error: unknown) {
    logger.error('CouchDB connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connessione fallita',
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
