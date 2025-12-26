/**
 * PouchDB Sync stub
 *
 * ⚠️ DEPRECATED - This file contains compatibility stubs only
 *
 * This file provides temporary compatibility stubs for the deprecated PouchDB sync functionality.
 * The application now uses PostgreSQL with REST API instead of CouchDB/PouchDB.
 * All functions here return stub data or throw errors.
 *
 * ⚠️ ONLY USED BY:
 * - Settings.tsx (sync-related UI)
 *
 * TODO: Remove all sync-related UI from Settings.tsx, then DELETE this entire file.
 */

import { logger } from './logger';
import { SyncStatus } from '../types';

/**
 * Get current sync status
 * @deprecated Sync functionality has been removed
 */
export function getSyncStatus(): SyncStatus {
  return {
    isActive: false,
    isPaused: false,
    lastSync: null,
    error: null,
    docsProcessed: 0,
    pendingChanges: 0,
  };
}

/**
 * Subscribe to sync status changes
 * @deprecated Sync functionality has been removed
 */
export function onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
  logger.warn('Sync functionality is deprecated - application now uses REST API');
  // Return empty unsubscribe function
  return () => {};
}

/**
 * Start sync
 * @deprecated Sync functionality has been removed
 */
export async function startSync(url: string, username: string, password: string): Promise<void> {
  logger.error('Sync functionality is not available - application uses REST API');
  throw new Error('Sync is not available in this version. The application uses a PostgreSQL database with REST API.');
}

/**
 * Stop sync
 * @deprecated Sync functionality has been removed
 */
export async function stopSync(): Promise<void> {
  logger.warn('stopSync called but sync functionality has been removed');
  // No-op
}

/**
 * Test CouchDB connection
 * @deprecated CouchDB is no longer used
 */
export async function testCouchDBConnection(url: string, username: string, password: string): Promise<{ success: boolean; message: string }> {
  logger.error('CouchDB connection test not available - application uses PostgreSQL');
  return {
    success: false,
    message: 'CouchDB is no longer used. The application now uses PostgreSQL with REST API.',
  };
}

/**
 * Perform one-time sync
 * @deprecated Sync functionality has been removed
 */
export async function performOneTimeSync(): Promise<void> {
  logger.error('One-time sync not available - application uses REST API');
  throw new Error('Sync is not available in this version.');
}

/**
 * Delete all local databases
 * @deprecated Local databases are no longer used
 */
export async function deleteAllLocalDatabases(): Promise<void> {
  logger.warn('Local database deletion not needed - application uses server database');
  // No-op
}

/**
 * Delete all remote databases
 * @deprecated Remote CouchDB databases are no longer used
 */
export async function deleteAllRemoteDatabases(url: string, username: string, password: string): Promise<void> {
  logger.error('Remote database deletion not available - please use PostgreSQL admin tools');
  throw new Error('This operation is not available. Please use PostgreSQL administration tools.');
}
