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
} as const;

type StoreType = keyof typeof DB_NAME_MAPPING;

// Cache per i database PouchDB
const pouchDBCache: Map<string, PouchDB.Database> = new Map();

// Queue per operazioni per documento (evita race conditions)
type QueuedOperation = () => Promise<void>;
const operationQueues: Map<string, QueuedOperation[]> = new Map();
const processingQueues: Map<string, boolean> = new Map();

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
        // Questo evita conflitti tra le due chiavi primarie
        const { id, ...itemWithoutId } = item;

        // Converti l'item in formato PouchDB (aggiunge _id e _rev se necessari)
        const pouchDoc = {
          ...itemWithoutId,
          _id: id,
        };

        // Inserisci in PouchDB usando put (sovrascrive se esiste)
        await pouchDB.put(pouchDoc);
        logger.debug(`Synced add to PouchDB for ${storeName}:`, id);
        return; // Success, exit
      } catch (error: any) {
        // Se l'errore è un conflitto di versione, prova a recuperare e fare merge intelligente
        if (error.status === 409 || error.name === 'conflict') {
          try {
            const pouchDB = getPouchDB(storeName);
            if (!pouchDB) return;

            // Recupera il documento esistente per ottenere il _rev
            const existingDoc = await pouchDB.get(item.id);

            // Merge intelligente: confronta timestamp se disponibili
            const { id, ...itemWithoutId } = item;
            const mergedData = smartMerge(itemWithoutId, existingDoc);

            const pouchDoc = {
              ...mergedData,
              _id: id,
              _rev: existingDoc._rev,
            };

            await pouchDB.put(pouchDoc);
            logger.info(`Resolved conflict with smart merge for ${storeName}:${id}`);
            return; // Success after merge
          } catch (retryError) {
            logger.error(`Failed to resolve conflict for ${storeName}:`, retryError);
            retryCount++;
            if (retryCount > MAX_RETRIES) {
              throw retryError;
            }
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
        } else if (isNetworkError(error)) {
          // Errore di rete: retry con exponential backoff
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
 * Smart merge: confronta timestamp e mantiene la versione più recente
 */
function smartMerge(localData: any, remoteDoc: any): any {
  // Rimuovi campi interni PouchDB
  const { _id, _rev, ...remoteData } = remoteDoc;

  // Se entrambi hanno updatedAt, usa il più recente
  if (localData.updatedAt && remoteData.updatedAt) {
    const localTime = new Date(localData.updatedAt).getTime();
    const remoteTime = new Date(remoteData.updatedAt).getTime();

    if (localTime > remoteTime) {
      logger.debug('Local data is newer, using local version');
      return localData;
    } else {
      logger.debug('Remote data is newer, using remote version');
      return remoteData;
    }
  }

  // Se solo locale ha updatedAt, probabilmente è più recente
  if (localData.updatedAt && !remoteData.updatedAt) {
    return localData;
  }

  // Default: usa dati remoti (comportamento precedente)
  return remoteData;
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
 * Sincronizza un'operazione di aggiornamento con PouchDB
 */
export async function syncUpdate<T extends { id: string }>(
  storeName: StoreType,
  item: T
): Promise<void> {
  const queueKey = `${storeName}:${item.id}`;

  // Queue the operation to avoid concurrent modifications
  queueOperation(queueKey, async () => {
    let retryCount = 0;
    const MAX_RETRIES = 3;

    while (retryCount <= MAX_RETRIES) {
      try {
        const pouchDB = getPouchDB(storeName);
        if (!pouchDB) return;

        // Recupera il documento esistente per ottenere il _rev
        const existingDoc = await pouchDB.get(item.id);

        // Merge intelligente: confronta timestamp se disponibili
        const { id, ...itemWithoutId } = item;
        const mergedData = smartMerge(itemWithoutId, existingDoc);

        const pouchDoc = {
          ...mergedData,
          _id: id,
          _rev: existingDoc._rev,
        };

        await pouchDB.put(pouchDoc);
        logger.debug(`Synced update to PouchDB for ${storeName}:`, id);
        return; // Success, exit
      } catch (error: any) {
        if (error.status === 404 || error.name === 'not_found') {
          // Il documento non esiste in PouchDB, crealo
          // NOTE: This will also be queued, ensuring serialization
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
 */
export async function syncDelete(
  storeName: StoreType,
  id: string
): Promise<void> {
  const queueKey = `${storeName}:${id}`;

  // Queue the operation to avoid concurrent modifications
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

  processingQueues.set(queueKey, true);

  const queue = operationQueues.get(queueKey);
  if (!queue || queue.length === 0) {
    processingQueues.set(queueKey, false);
    return;
  }

  // Process operations one by one
  while (queue.length > 0) {
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
 * Pulisci la cache dei database PouchDB
 */
export function clearPouchDBCache(): void {
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
}
