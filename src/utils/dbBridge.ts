/**
 * Database Bridge - Sincronizza IndexedDB con PouchDB
 *
 * Questo modulo fornisce un bridge tra IndexedDB (database principale)
 * e PouchDB (database per sincronizzazione con CouchDB).
 * Quando si inseriscono/aggiornano dati in IndexedDB, vengono automaticamente
 * propagati a PouchDB se la sincronizzazione è attiva.
 * 
 * VERSIONE AGGIORNATA: Include coordinamento con pouchdbSync per prevenire loop
 */

import PouchDB from 'pouchdb-browser';
import { logger } from './logger';
import { wasItemDeleted } from './indexedDB';

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

// FIX #5: Reference counting invece di boolean flag per maggiore robustezza
// Questo previene problemi con chiamate nested di pause/resume
let syncPauseRefCount = 0;

/**
 * FIX #5: Disabilita temporaneamente la sincronizzazione verso PouchDB
 * Usato durante l'initial sync e quando riceviamo dati dal remoto
 * Usa reference counting per supportare chiamate nested
 */
export function pauseSyncToPouchDB(): void {
  syncPauseRefCount++;
  logger.debug(`[dbBridge] Sync to PouchDB PAUSED (refCount: ${syncPauseRefCount})`);
}

/**
 * FIX #5: Riabilita la sincronizzazione verso PouchDB
 * Decrementa il reference count, riabilita solo quando torna a 0
 */
export function resumeSyncToPouchDB(): void {
  if (syncPauseRefCount > 0) {
    syncPauseRefCount--;
  } else {
    logger.warn('[dbBridge] resumeSyncToPouchDB called but refCount is already 0');
  }
  logger.debug(`[dbBridge] Sync to PouchDB ${syncPauseRefCount === 0 ? 'RESUMED' : 'still PAUSED'} (refCount: ${syncPauseRefCount})`);
}

/**
 * FIX #5: Verifica se la sincronizzazione verso PouchDB è attiva
 */
export function isSyncToPouchDBActive(): boolean {
  return syncPauseRefCount === 0;
}

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
 * Confronta timestamp per determinare quale documento è più recente
 */
export function isLocalNewer(localDoc: any, remoteDoc: any): boolean {
  const localTime = new Date(localDoc.updatedAt || localDoc.createdAt || 0).getTime();
  const remoteTime = new Date(remoteDoc.updatedAt || remoteDoc.createdAt || 0).getTime();

  // Se i timestamp sono uguali, usa createdAt come tiebreaker
  if (localTime === remoteTime) {
    const localCreated = new Date(localDoc.createdAt || 0).getTime();
    const remoteCreated = new Date(remoteDoc.createdAt || 0).getTime();
    return localCreated >= remoteCreated;
  }

  return localTime > remoteTime;
}

/**
 * Verifica se un documento è stato eliminato (usa tracking permanente da IndexedDB)
 * AGGIORNATO: Sostituisce il vecchio sistema in-memory con tracking permanente
 */
async function wasDeleted(storeName: StoreType, id: string): Promise<boolean> {
  try {
    return await wasItemDeleted(storeName, id);
  } catch (error) {
    logger.error(`Error checking deletion status for ${storeName}:${id}:`, error);
    return false;
  }
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
 * Sincronizza un'operazione di inserimento con PouchDB
 * AGGIORNATO: Rispetta il flag isSyncFromRemoteActive
 */
export async function syncAdd<T extends { id: string }>(
  storeName: StoreType,
  item: T
): Promise<void> {
  // FIX #5: SKIP se stiamo ricevendo dati da remote sync (usa reference counting)
  if (!isSyncToPouchDBActive()) {
    logger.debug(`[dbBridge] Skipping syncAdd for ${storeName}:${item.id} (remote sync active, refCount: ${syncPauseRefCount})`);
    return;
  }

  // IMPORTANTE: Verifica se è stato eliminato permanentemente
  if (await wasDeleted(storeName, item.id)) {
    logger.warn(`[dbBridge] Skipping add for deleted document ${storeName}:${item.id} (permanent deletion)`);
    return;
  }

  const queueKey = `${storeName}:${item.id}`;

  // Queue the operation to avoid concurrent modifications
  queueOperation(queueKey, async () => {
    let retryCount = 0;
    const MAX_RETRIES = 3;

    while (retryCount <= MAX_RETRIES) {
      try {
        const pouchDB = getPouchDB(storeName);
        if (!pouchDB) return;

        // Rimuovi la proprietà 'id' da IndexedDB e usa solo '_id' per PouchDB
        const { id, ...itemWithoutId } = item;

        // Converti l'item in formato PouchDB
        const pouchDoc = {
          ...itemWithoutId,
          _id: id,
        };

        // Inserisci in PouchDB usando put (sovrascrive se esiste)
        await pouchDB.put(pouchDoc);
        logger.debug(`Synced add to PouchDB for ${storeName}:`, id);
        return; // Success, exit
      } catch (error: any) {
        // Gestione conflitti con timestamp
        if (error.status === 409 || error.name === 'conflict') {
          try {
            const pouchDB = getPouchDB(storeName);
            if (!pouchDB) return;

            const existingDoc = await pouchDB.get(item.id);
            const { id, ...itemWithoutId } = item;

            // Confronta timestamp per decidere quale versione mantenere
            if (isLocalNewer(item, existingDoc)) {
              // Il dato locale è più recente, sovrascrive
              const pouchDoc = {
                ...itemWithoutId,
                _id: id,
                _rev: existingDoc._rev,
              };
              await pouchDB.put(pouchDoc);
              logger.info(`Resolved conflict: local data is newer for ${storeName}:${id}`);
            } else {
              // Il dato remoto è più recente, skip
              logger.info(`Resolved conflict: remote data is newer for ${storeName}:${id}, skipping update`);
            }
            return;
          } catch (retryError) {
            logger.error(`Failed to resolve conflict for ${storeName}:`, retryError);
            retryCount++;
            if (retryCount > MAX_RETRIES) {
              throw retryError;
            }
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
        } else if (isNetworkError(error)) {
          retryCount++;
          if (retryCount > MAX_RETRIES) {
            logger.error(`Failed to sync add after ${MAX_RETRIES} retries for ${storeName}:`, error);
            throw error;
          }
          logger.warn(`Network error, retrying (${retryCount}/${MAX_RETRIES}) for ${storeName}:${item.id}`);
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
 * Sincronizza un'operazione di aggiornamento con PouchDB
 * AGGIORNATO: Rispetta il flag isSyncFromRemoteActive
 */
export async function syncUpdate<T extends { id: string }>(
  storeName: StoreType,
  item: T
): Promise<void> {
  // FIX #5: SKIP se stiamo ricevendo dati da remote sync (usa reference counting)
  if (!isSyncToPouchDBActive()) {
    logger.debug(`[dbBridge] Skipping syncUpdate for ${storeName}:${item.id} (remote sync active, refCount: ${syncPauseRefCount})`);
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

        // Recupera il documento esistente per ottenere il _rev
        const existingDoc = await pouchDB.get(item.id);
        const { id, ...itemWithoutId } = item;

        // Verifica timestamp prima di aggiornare
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
        return; // Success, exit
      } catch (error: any) {
        if (error.status === 404 || error.name === 'not_found') {
          // Il documento non esiste in PouchDB, crealo
          await syncAdd(storeName, item);
          return;
        } else if (error.status === 409 || error.name === 'conflict') {
          // Conflitto di versione, retry
          retryCount++;
          if (retryCount > MAX_RETRIES) {
            logger.error(`Failed to sync update after ${MAX_RETRIES} retries (conflict) for ${storeName}:`, error);
            throw error;
          }
          logger.warn(`Conflict error, retrying (${retryCount}/${MAX_RETRIES}) for ${storeName}:${item.id}`);
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        } else if (isNetworkError(error)) {
          // Errore di rete: retry con exponential backoff
          retryCount++;
          if (retryCount > MAX_RETRIES) {
            logger.error(`Failed to sync update after ${MAX_RETRIES} retries for ${storeName}:`, error);
            throw error;
          }
          logger.warn(`Network error, retrying (${retryCount}/${MAX_RETRIES}) for ${storeName}:${item.id}`);
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
 * Sincronizza un'operazione di cancellazione con PouchDB
 * AGGIORNATO: Rispetta il flag isSyncFromRemoteActive
 */
export async function syncDelete(
  storeName: StoreType,
  id: string
): Promise<void> {
  // FIX #5: SKIP se stiamo ricevendo dati da remote sync (usa reference counting)
  if (!isSyncToPouchDBActive()) {
    logger.debug(`[dbBridge] Skipping syncDelete for ${storeName}:${id} (remote sync active, refCount: ${syncPauseRefCount})`);
    return;
  }

  // NOTA: L'eliminazione viene già registrata in IndexedDB dalla funzione delete*() che chiama recordDeletion()

  const queueKey = `${storeName}:${id}`;

  queueOperation(queueKey, async () => {
    let retryCount = 0;
    const MAX_RETRIES = 3;

    while (retryCount <= MAX_RETRIES) {
      try {
        const pouchDB = getPouchDB(storeName);
        if (!pouchDB) return;

        // Recupera il documento esistente per ottenere il _rev
        const existingDoc = await pouchDB.get(id);

        // Elimina il documento
        await pouchDB.remove(existingDoc);
        logger.debug(`Synced delete to PouchDB for ${storeName}:`, id);
        return; // Success, exit
      } catch (error: any) {
        if (error.status === 404 || error.name === 'not_found') {
          // Il documento non esiste, non è un errore
          logger.debug(`Document already deleted from PouchDB for ${storeName}:`, id);
          return;
        } else if (isNetworkError(error)) {
          // Errore di rete: retry con exponential backoff
          retryCount++;
          if (retryCount > MAX_RETRIES) {
            logger.error(`Failed to sync delete after ${MAX_RETRIES} retries for ${storeName}:`, error);
            throw error;
          }
          logger.warn(`Network error, retrying (${retryCount}/${MAX_RETRIES}) for ${storeName}:${id}`);
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

  // NOTA: Non puliamo più il deletionLog perché ora è permanente in IndexedDB
  // Le cancellazioni sono gestite dal nuovo store 'deletedItems' in IndexedDB

  // Resume queue processing
  resumeQueueProcessing();
}
