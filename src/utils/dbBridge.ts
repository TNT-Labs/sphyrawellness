/**
 * Database Bridge - Sincronizza IndexedDB con PouchDB
 *
 * Questo modulo fornisce un bridge tra IndexedDB (database principale)
 * e PouchDB (database per sincronizzazione con CouchDB).
 * Quando si inseriscono/aggiornano dati in IndexedDB, vengono automaticamente
 * propagati a PouchDB se la sincronizzazione è attiva.
 */

import PouchDB from 'pouchdb-browser';
import { logger } from './logger';

// Mapping tra object stores IndexedDB e database PouchDB
const DB_NAME_MAPPING = {
  customers: 'sphyra-customers',
  services: 'sphyra-services',
  staff: 'sphyra-staff',
  appointments: 'sphyra-appointments',
  payments: 'sphyra-payments',
  reminders: 'sphyra-reminders',
  staffRoles: 'sphyra-staff-roles',
  serviceCategories: 'sphyra-service-categories',
  users: 'sphyra-users',
} as const;

type StoreType = keyof typeof DB_NAME_MAPPING;

// Cache per i database PouchDB
const pouchDBCache: Map<string, PouchDB.Database> = new Map();

// Queue per operazioni per documento (evita race conditions)
type QueuedOperation = () => Promise<void>;
const operationQueues: Map<string, QueuedOperation[]> = new Map();
const processingQueues: Map<string, boolean> = new Map();

// Flag to pause queue processing during cleanup operations
let isCleanupInProgress = false;
let isSyncFromRemoteActive = false;

/**
 * Ottieni un database PouchDB (con cache)
 */
function getPouchDB(storeName: StoreType): PouchDB.Database | null {
  try {
    const dbName = DB_NAME_MAPPING[storeName];

    // Verifica se esiste già in cache
    if (pouchDBCache.has(dbName)) {
      return pouchDBCache.get(dbName)!;
    }

    // Crea nuovo database e mettilo in cache
    const db = new PouchDB(dbName, {
      auto_compaction: false,
      revs_limit: 1,
    });
    pouchDBCache.set(dbName, db);
    return db;
  } catch (error) {
    // Se PouchDB non è disponibile o fallisce, ritorna null
    logger.warn(`Could not access PouchDB for ${storeName}:`, error);
    return null;
  }
}

/**
 * Sincronizza un'operazione di inserimento con PouchDB
 */
export async function syncAdd<T extends { id: string }>(
  storeName: StoreType,
  item: T
): Promise<void> {
  // SKIP se stiamo ricevendo dati da remote sync
  if (isSyncFromRemoteActive) {
    logger.debug(`[dbBridge] Skipping syncAdd for ${storeName}:${item.id} (remote sync active)`);
    return;
  }

  // Verifica se è stato eliminato di recente
  if (wasRecentlyDeleted(storeName, item.id)) {
    logger.warn(`Skipping add for recently deleted document ${storeName}:${item.id}`);
    return;
  }

  const queueKey = `${storeName}:${item.id}`;

  queueOperation(queueKey, async () => {
    let retryCount = 0;
    const MAX_RETRIES = 3;

    while (retryCount <= MAX_RETRIES) {
      try {
        const pouchDB = getPouchDB(storeName);
        if (!pouchDB) return;

        const { id, ...itemWithoutId } = item;
        const pouchDoc = { ...itemWithoutId, _id: id };

        await pouchDB.put(pouchDoc);
        logger.debug(`Synced add to PouchDB for ${storeName}:`, id);
        return;
      } catch (error: any) {
        if (error.status === 409 || error.name === 'conflict') {
          try {
            const pouchDB = getPouchDB(storeName);
            if (!pouchDB) return;

            const existingDoc = await pouchDB.get(item.id);
            const { id, ...itemWithoutId } = item;

            // Confronta timestamp
            if (isLocalNewer(item, existingDoc)) {
              const pouchDoc = {
                ...itemWithoutId,
                _id: id,
                _rev: existingDoc._rev,
              };
              await pouchDB.put(pouchDoc);
              logger.info(`Resolved conflict: local data is newer for ${storeName}:${id}`);
            } else {
              logger.info(`Resolved conflict: remote data is newer for ${storeName}:${id}, skipping`);
            }
            return;
          } catch (retryError) {
            logger.error(`Failed to resolve conflict for ${storeName}:`, retryError);
            retryCount++;
            if (retryCount > MAX_RETRIES) throw retryError;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
        } else if (isNetworkError(error)) {
          retryCount++;
          if (retryCount > MAX_RETRIES) {
            logger.error(`Failed to sync add after ${MAX_RETRIES} retries`, error);
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        } else {
          logger.error(`Failed to sync add to PouchDB for ${storeName}:`, error);
          throw error;
        }
      }
    }
  });
}

/**
 * Verifica se l'errore è un errore di rete
 */
function isNetworkError(error: any): boolean {
  return (
    error.status === 0 || // Network error
    error.status === 408 || // Request timeout
    error.status === 504 || // Gateway timeout
    error.name === 'NetworkError' ||
    error.name === 'TimeoutError' ||
    (error.message && error.message.includes('network')) ||
    (error.message && error.message.includes('timeout'))
  );
}

/**
 * Versione modificata di syncUpdate che rispetta il flag
 */
export async function syncUpdate<T extends { id: string }>(
  storeName: StoreType,
  item: T
): Promise<void> {
  // SKIP se stiamo ricevendo dati da remote sync
  if (isSyncFromRemoteActive) {
    logger.debug(`[dbBridge] Skipping syncUpdate for ${storeName}:${item.id} (remote sync active)`);
    return;
  }

  const queueKey = `${storeName}:${item.id}`;

  queueOperation(queueKey, async () => {
    let retryCount = 0;
    const MAX_RETRIES = 3;

    while (retryCount <= MAX_RETRIES) {
      try {
        const pouchDB = getPouchDB(storeName);
        if (!pouchDB) return;

        const existingDoc = await pouchDB.get(item.id);
        const { id, ...itemWithoutId } = item;

        // Verifica timestamp
        if (!isLocalNewer(item, existingDoc)) {
          logger.info(`Skipping update: remote data is newer for ${storeName}:${id}`);
          return;
        }

        const pouchDoc = {
          ...itemWithoutId,
          _id: id,
          _rev: existingDoc._rev,
        };

        await pouchDB.put(pouchDoc);
        logger.debug(`Synced update to PouchDB for ${storeName}:`, id);
        return;
      } catch (error: any) {
        if (error.status === 404 || error.name === 'not_found') {
          await syncAdd(storeName, item);
          return;
        } else if (error.status === 409 || error.name === 'conflict') {
          retryCount++;
          if (retryCount > MAX_RETRIES) {
            logger.error(`Failed to sync update after ${MAX_RETRIES} retries`, error);
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        } else if (isNetworkError(error)) {
          retryCount++;
          if (retryCount > MAX_RETRIES) {
            logger.error(`Failed to sync update after ${MAX_RETRIES} retries`, error);
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        } else {
          logger.error(`Failed to sync update to PouchDB for ${storeName}:`, error);
          throw error;
        }
      }
    }
  });
}

/**
 * Versione modificata di syncDelete che rispetta il flag
 */
export async function syncDelete(
  storeName: StoreType,
  id: string
): Promise<void> {
  // SKIP se stiamo ricevendo dati da remote sync
  if (isSyncFromRemoteActive) {
    logger.debug(`[dbBridge] Skipping syncDelete for ${storeName}:${id} (remote sync active)`);
    return;
  }

  logDeletion(storeName, id);

  const queueKey = `${storeName}:${id}`;

  queueOperation(queueKey, async () => {
    let retryCount = 0;
    const MAX_RETRIES = 3;

    while (retryCount <= MAX_RETRIES) {
      try {
        const pouchDB = getPouchDB(storeName);
        if (!pouchDB) return;

        const existingDoc = await pouchDB.get(id);
        await pouchDB.remove(existingDoc);
        logger.debug(`Synced delete to PouchDB for ${storeName}:`, id);
        return;
      } catch (error: any) {
        if (error.status === 404 || error.name === 'not_found') {
          logger.debug(`Document already deleted from PouchDB for ${storeName}:`, id);
          return;
        } else if (isNetworkError(error)) {
          retryCount++;
          if (retryCount > MAX_RETRIES) {
            logger.error(`Failed to sync delete after ${MAX_RETRIES} retries`, error);
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        } else {
          logger.error(`Failed to sync delete to PouchDB for ${storeName}:`, error);
          throw error;
        }
      }
    }
  });
}

/**
 * Process queued operations for a specific document
 */
async function processQueue(queueKey: string): Promise<void> {
  // If already processing, skip
  if (processingQueues.get(queueKey)) {
    return;
  }

  // If cleanup is in progress, don't start new queue processing
  if (isCleanupInProgress) {
    logger.debug(`Queue processing paused for ${queueKey} due to cleanup`);
    return;
  }

  processingQueues.set(queueKey, true);

  const queue = operationQueues.get(queueKey);
  if (!queue || queue.length === 0) {
    processingQueues.set(queueKey, false);
    return;
  }

  // Process operations one by one
  while (queue.length > 0) {
    // Check again if cleanup started while processing
    if (isCleanupInProgress) {
      logger.debug(`Queue processing interrupted for ${queueKey} due to cleanup`);
      processingQueues.set(queueKey, false);
      return;
    }

    const operation = queue.shift();
    if (operation) {
      try {
        await operation();
      } catch (error) {
        logger.error('Error processing queued operation:', error);
      }
    }
  }

  processingQueues.set(queueKey, false);

  // Clean up empty queues
  if (queue.length === 0) {
    operationQueues.delete(queueKey);
  }
}

/**
 * Add operation to queue and process
 */
function queueOperation(queueKey: string, operation: QueuedOperation): void {
  if (!operationQueues.has(queueKey)) {
    operationQueues.set(queueKey, []);
  }

  operationQueues.get(queueKey)!.push(operation);

  // Start processing (non-blocking)
  processQueue(queueKey).catch(err =>
    logger.error('Error in queue processing:', err)
  );
}

/**
 * Pause queue processing (called before cleanup operations)
 */
export function pauseQueueProcessing(): void {
  isCleanupInProgress = true;
  logger.debug('Queue processing paused for cleanup');
}

/**
 * Resume queue processing (called after cleanup operations)
 */
export function resumeQueueProcessing(): void {
  isCleanupInProgress = false;
  logger.debug('Queue processing resumed after cleanup');
}

/**
 * Wait for all currently processing queues to complete
 */
export async function waitForPendingOperations(timeoutMs: number = 5000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Check if any queue is still processing
    let anyProcessing = false;
    for (const isProcessing of processingQueues.values()) {
      if (isProcessing) {
        anyProcessing = true;
        break;
      }
    }

    if (!anyProcessing) {
      logger.debug('All pending operations completed');
      return;
    }

    // Wait a bit before checking again
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  logger.warn('Timeout waiting for pending operations to complete');
}

/**
 * Pulisci la cache dei database PouchDB
 */
export async function clearPouchDBCache(): Promise<void> {
  // Pause new queue processing
  pauseQueueProcessing();

  // Wait for pending operations to complete
  await waitForPendingOperations();

  // Now safe to close databases
  pouchDBCache.forEach((db) => {
    try {
      db.close();
    } catch (error) {
      logger.warn('Error closing PouchDB:', error);
    }
  });
  pouchDBCache.clear();

  // Clear operation queues
  operationQueues.clear();
  processingQueues.clear();

  // Resume queue processing
  resumeQueueProcessing();
}

/**
 * Disabilita temporaneamente la sincronizzazione verso PouchDB
 * Usato durante l'initial sync e quando riceviamo dati dal remoto
 */
export function pauseSyncToPouchDB(): void {
  isSyncFromRemoteActive = true;
  logger.debug('[dbBridge] Sync to PouchDB PAUSED');
}

/**
 * Riabilita la sincronizzazione verso PouchDB
 */
export function resumeSyncToPouchDB(): void {
  isSyncFromRemoteActive = false;
  logger.debug('[dbBridge] Sync to PouchDB RESUMED');
}

/**
 * Verifica se la sincronizzazione verso PouchDB è attiva
 */
export function isSyncToPouchDBActive(): boolean {
  return !isSyncFromRemoteActive;
}