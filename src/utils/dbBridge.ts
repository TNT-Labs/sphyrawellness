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
    } catch (error: any) {
      // Se l'errore è un conflitto di versione, prova a recuperare e fare merge
      if (error.status === 409 || error.name === 'conflict') {
        try {
          const pouchDB = getPouchDB(storeName);
          if (!pouchDB) return;

          // Recupera il documento esistente per ottenere il _rev
          const existingDoc = await pouchDB.get(item.id);

          // Rimuovi 'id' dall'item e mantieni _id e _rev dal documento esistente
          const { id, ...itemWithoutId } = item;
          const pouchDoc = {
            ...itemWithoutId,
            _id: id,
            _rev: existingDoc._rev,
          };

          await pouchDB.put(pouchDoc);
          logger.debug(`Resolved conflict and synced to PouchDB for ${storeName}:`, id);
        } catch (retryError) {
          logger.error(`Failed to resolve conflict for ${storeName}:`, retryError);
        }
      } else {
        logger.error(`Failed to sync add to PouchDB for ${storeName}:`, error);
      }
    }
  });
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
    try {
      const pouchDB = getPouchDB(storeName);
      if (!pouchDB) return;

      // Recupera il documento esistente per ottenere il _rev
      const existingDoc = await pouchDB.get(item.id);

      // Rimuovi 'id' dall'item e usa solo '_id' per PouchDB
      const { id, ...itemWithoutId } = item;
      const pouchDoc = {
        ...itemWithoutId,
        _id: id,
        _rev: existingDoc._rev,
      };

      await pouchDB.put(pouchDoc);
      logger.debug(`Synced update to PouchDB for ${storeName}:`, id);
    } catch (error: any) {
      if (error.status === 404 || error.name === 'not_found') {
        // Il documento non esiste in PouchDB, crealo
        // NOTE: This will also be queued, ensuring serialization
        await syncAdd(storeName, item);
      } else {
        logger.error(`Failed to sync update to PouchDB for ${storeName}:`, error);
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
    try {
      const pouchDB = getPouchDB(storeName);
      if (!pouchDB) return;

      // Recupera il documento esistente per ottenere il _rev
      const existingDoc = await pouchDB.get(id);

      // Elimina il documento
      await pouchDB.remove(existingDoc);
      logger.debug(`Synced delete to PouchDB for ${storeName}:`, id);
    } catch (error: any) {
      if (error.status === 404) {
        // Il documento non esiste, non è un errore
        logger.debug(`Document already deleted from PouchDB for ${storeName}:`, id);
      } else {
        logger.error(`Failed to sync delete to PouchDB for ${storeName}:`, error);
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
