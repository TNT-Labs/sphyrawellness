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
  documentsSynced: 0,
  syncErrors: [],
};

// Monitoring
let syncStartTime: number | null = null;

// Online/Offline detection
let isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
let autoSyncEnabled: boolean = false;

// Sync status callbacks
const syncStatusCallbacks: Set<(status: SyncStatus) => void> = new Set();

// Throttling for sync status notifications
let lastNotificationTime = 0;
const NOTIFICATION_THROTTLE_MS = 1000; // Max 1 notification per second

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
 * Notify all subscribers of sync status change (with throttling)
 */
function notifySyncStatusChange(newStatus: Partial<SyncStatus>, force: boolean = false): void {
  syncStatus = { ...syncStatus, ...newStatus };

  // Throttle notifications unless forced (e.g., for errors or state changes)
  const now = Date.now();
  if (!force && (now - lastNotificationTime) < NOTIFICATION_THROTTLE_MS) {
    return;
  }

  lastNotificationTime = now;

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
      localDatabases[key] = new PouchDB(dbName, {
        auto_compaction: false,
        revs_limit: 1,
      });
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
    // Check if online
    if (!isOnline) {
      logger.warn('Cannot start sync: device is offline');
      notifySyncStatusChange({
        status: 'paused',
        error: 'Nessuna connessione internet',
        isActive: false,
      }, true);
      return false;
    }

    const settings = await loadSettingsWithPassword();

    if (!settings.syncEnabled) {
      logger.warn('Sync is disabled in settings');
      autoSyncEnabled = false;
      return false;
    }

    if (!settings.couchdbUrl) {
      logger.error('CouchDB URL is not configured');
      notifySyncStatusChange({
        status: 'error',
        error: 'CouchDB URL non configurato',
        isActive: false,
      }, true); // Force notification
      return false;
    }

    // Mark auto-sync as enabled
    autoSyncEnabled = true;

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
      }, true); // Force notification
      return false;
    }

    logger.log('All remote databases verified/created successfully');

    // Stop existing sync handlers
    await stopSync();

    // Reset monitoring counters
    syncStartTime = Date.now();

    // Update status to syncing before starting
    notifySyncStatusChange({
      status: 'syncing',
      isActive: true,
      direction: 'both',
      documentsSynced: 0,
    }, true); // Force notification

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

        // Count documents synced
        const docsChanged = (info.change?.docs?.length || 0);
        const currentCount = syncStatus.documentsSynced || 0;

        // Throttled notification (not forced)
        notifySyncStatusChange({
          lastSync: new Date().toISOString(),
          status: 'syncing',
          documentsSynced: currentCount + docsChanged,
        }, false);
      });

      sync.on('paused', () => {
        logger.log(`Sync paused for ${remoteName}`);

        // Calculate sync duration
        const duration = syncStartTime ? Date.now() - syncStartTime : undefined;
        syncStartTime = null;

        // Force notification for state change
        notifySyncStatusChange({
          status: 'idle',
          lastSync: new Date().toISOString(),
          lastSyncDuration: duration,
        }, true);
      });

      sync.on('active', () => {
        logger.log(`Sync active for ${remoteName}`);

        // Mark sync start time
        if (!syncStartTime) {
          syncStartTime = Date.now();
        }

        // Force notification for state change
        notifySyncStatusChange({
          status: 'syncing',
        }, true);
      });

      sync.on('error', (err: unknown) => {
        logger.error(`Sync error for ${remoteName}:`, err);

        // Add error to history (keep last 10)
        const errorMsg = err instanceof Error ? err.message : 'Errore di sincronizzazione';
        const errors = syncStatus.syncErrors || [];
        errors.unshift(`${new Date().toISOString()}: ${errorMsg}`);
        if (errors.length > 10) errors.pop();

        // Force notification for errors
        notifySyncStatusChange({
          status: 'error',
          error: errorMsg,
          syncErrors: errors,
        }, true);
      });

      sync.on('denied', (err: unknown) => {
        logger.error(`Sync denied for ${remoteName}:`, err);

        // Add error to history (keep last 10)
        const errorMsg = 'Accesso negato al server';
        const errors = syncStatus.syncErrors || [];
        errors.unshift(`${new Date().toISOString()}: ${errorMsg}`);
        if (errors.length > 10) errors.pop();

        // Force notification for errors
        notifySyncStatusChange({
          status: 'error',
          error: errorMsg,
          syncErrors: errors,
        }, true);
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
    }, true); // Force notification
    return false;
  }
}

/**
 * Stop synchronization
 */
export async function stopSync(): Promise<void> {
  try {
    // Disable auto-sync
    autoSyncEnabled = false;

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
    }, true); // Force notification

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

    // Test connection by trying to access the root endpoint
    // This is safer than using _users which might be restricted
    const testDB = new PouchDB(`${remoteUrl}/sphyra-test-connection`);

    // Try to get info (this will test the connection and create the DB if needed)
    await testDB.info();

    // Try to clean up the test database
    try {
      await testDB.destroy();
      logger.log('Test database cleaned up successfully');
    } catch (cleanupError) {
      logger.warn('Could not cleanup test database (may not have permissions):', cleanupError);
      // Not a critical error, just close the connection
      await testDB.close();
    }

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
      }, true); // Force notification
      return false;
    }

    notifySyncStatusChange({
      status: 'syncing',
      isActive: true,
    }, true); // Force notification

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
    }, true); // Force notification

    logger.log('One-time synchronization completed successfully');
    return true;
  } catch (error) {
    logger.error('Failed to perform one-time sync:', error);
    notifySyncStatusChange({
      status: 'error',
      error: error instanceof Error ? error.message : 'Errore di sincronizzazione',
      isActive: false,
    }, true); // Force notification
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
 * Cleanup on page unload - closes all connections gracefully
 */
function cleanupOnUnload(): void {
  try {
    logger.log('Page unload detected, cleaning up sync...');
    // Synchronously close databases (we can't use async here)
    Object.values(syncHandlers).forEach(sync => {
      try {
        sync.cancel();
      } catch (e) {
        logger.warn('Error canceling sync on unload:', e);
      }
    });
    Object.values(localDatabases).forEach(db => {
      try {
        db.close();
      } catch (e) {
        logger.warn('Error closing database on unload:', e);
      }
    });
    logger.log('Cleanup completed');
  } catch (error) {
    logger.error('Error during cleanup on unload:', error);
  }
}

/**
 * Handle online event - restart sync if it was enabled
 */
function handleOnlineEvent(): void {
  logger.log('Network connection restored');
  isOnline = true;

  if (autoSyncEnabled) {
    logger.log('Auto-restarting sync after connection restored');
    startSync().catch(err =>
      logger.error('Failed to restart sync after going online:', err)
    );
  }
}

/**
 * Handle offline event - log and update status
 */
function handleOfflineEvent(): void {
  logger.warn('Network connection lost');
  isOnline = false;

  // Update status to reflect offline state
  if (syncStatus.isActive) {
    notifySyncStatusChange({
      status: 'paused',
      error: 'Nessuna connessione internet',
    }, true);
  }
}

/**
 * Check if device is online
 */
export function getOnlineStatus(): boolean {
  return isOnline;
}

/**
 * Initialize sync based on settings
 */
export async function initializeSync(): Promise<void> {
  try {
    const settings = await loadSettingsWithPassword();

    if (settings.syncEnabled && settings.couchdbUrl) {
      logger.log('Auto-starting sync based on settings');
      autoSyncEnabled = true;

      if (isOnline) {
        await startSync();
      } else {
        logger.warn('Device is offline, sync will start when online');
        notifySyncStatusChange({
          status: 'paused',
          error: 'In attesa di connessione internet',
          isActive: false,
        }, true);
      }
    } else {
      logger.log('Sync is disabled or not configured');
      autoSyncEnabled = false;
    }

    // Setup cleanup handlers for page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', cleanupOnUnload);
      window.addEventListener('pagehide', cleanupOnUnload);

      // Setup online/offline detection
      window.addEventListener('online', handleOnlineEvent);
      window.addEventListener('offline', handleOfflineEvent);

      logger.log('Cleanup and network handlers registered');
    }
  } catch (error) {
    logger.error('Failed to initialize sync:', error);
  }
}
