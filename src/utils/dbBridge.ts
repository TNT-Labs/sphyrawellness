/**
 * Database Bridge - Sincronizza IndexedDB con PouchDB
 *
 * FIX:
 * - Impedisce la ricreazione di documenti eliminati (_deleted)
 * - Allinea il comportamento a CouchDB/PouchDB semantics
 */

import PouchDB from 'pouchdb-browser';
import { logger } from './logger';

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

const pouchDBCache: Map<string, PouchDB.Database> = new Map();

type QueuedOperation = () => Promise<void>;
const operationQueues: Map<string, QueuedOperation[]> = new Map();
const processingQueues: Map<string, boolean> = new Map();

let isCleanupInProgress = false;

/**
 * Utility: verifica se un documento è cancellato
 */
function isDeleted(doc: any): boolean {
  return !!doc && doc._deleted === true;
}

function getPouchDB(storeName: StoreType): PouchDB.Database | null {
  try {
    const dbName = DB_NAME_MAPPING[storeName];

    if (pouchDBCache.has(dbName)) {
      return pouchDBCache.get(dbName)!;
    }

    const db = new PouchDB(dbName, {
      auto_compaction: false,
      revs_limit: 1,
    });

    pouchDBCache.set(dbName, db);
    return db;
  } catch (error) {
    logger.warn(`Could not access PouchDB for ${storeName}:`, error);
    return null;
  }
}

/**
 * ADD
 */
export async function syncAdd<T extends { id: string }>(
  storeName: StoreType,
  item: T
): Promise<void> {
  const queueKey = `${storeName}:${item.id}`;

  queueOperation(queueKey, async () => {
    const pouchDB = getPouchDB(storeName);
    if (!pouchDB) return;

    try {
      const existing = await pouchDB.get(item.id).catch(() => null);

      // 🔒 FIX: non ricreare documenti eliminati
      if (isDeleted(existing)) {
        logger.info(`Skip syncAdd: ${storeName}:${item.id} is deleted`);
        return;
      }

      const { id, ...itemWithoutId } = item;

      await pouchDB.put({
        ...itemWithoutId,
        _id: id,
        _rev: existing?._rev,
      });

      logger.debug(`Synced add to PouchDB for ${storeName}:`, id);
    } catch (error) {
      logger.error(`Failed to sync add for ${storeName}:${item.id}`, error);
      throw error;
    }
  });
}

/**
 * UPDATE
 */
export async function syncUpdate<T extends { id: string }>(
  storeName: StoreType,
  item: T
): Promise<void> {
  const queueKey = `${storeName}:${item.id}`;

  queueOperation(queueKey, async () => {
    const pouchDB = getPouchDB(storeName);
    if (!pouchDB) return;

    try {
      const existing = await pouchDB.get(item.id);

      // 🔒 FIX: non aggiornare documenti eliminati
      if (isDeleted(existing)) {
        logger.info(`Skip syncUpdate: ${storeName}:${item.id} is deleted`);
        return;
      }

      const { id, ...itemWithoutId } = item;

      await pouchDB.put({
        ...itemWithoutId,
        _id: id,
        _rev: existing._rev,
      });

      logger.debug(`Synced update to PouchDB for ${storeName}:`, id);
    } catch (error: any) {
      if (error.status === 404) {
        await syncAdd(storeName, item);
      } else {
        logger.error(`Failed to sync update for ${storeName}:${item.id}`, error);
        throw error;
      }
    }
  });
}

/**
 * DELETE
 */
export async function syncDelete(
  storeName: StoreType,
  id: string
): Promise<void> {
  const queueKey = `${storeName}:${id}`;

  queueOperation(queueKey, async () => {
    const pouchDB = getPouchDB(storeName);
    if (!pouchDB) return;

    try {
      const existing = await pouchDB.get(id);

      if (isDeleted(existing)) {
        logger.debug(`Already deleted: ${storeName}:${id}`);
        return;
      }

      await pouchDB.remove(existing);
      logger.debug(`Synced delete to PouchDB for ${storeName}:`, id);
    } catch (error: any) {
      if (error.status === 404) {
        logger.debug(`Document not found (already deleted): ${storeName}:${id}`);
        return;
      }
      logger.error(`Failed to sync delete for ${storeName}:${id}`, error);
      throw error;
    }
  });
}

/**
 * Queue handling
 */
async function processQueue(queueKey: string): Promise<void> {
  if (processingQueues.get(queueKey) || isCleanupInProgress) return;

  processingQueues.set(queueKey, true);

  const queue = operationQueues.get(queueKey);
  if (!queue) {
    processingQueues.set(queueKey, false);
    return;
  }

  while (queue.length > 0) {
    if (isCleanupInProgress) break;
    const op = queue.shift();
    if (op) await op();
  }

  processingQueues.set(queueKey, false);
  operationQueues.delete(queueKey);
}

function queueOperation(queueKey: string, operation: QueuedOperation): void {
  if (!operationQueues.has(queueKey)) {
    operationQueues.set(queueKey, []);
  }
  operationQueues.get(queueKey)!.push(operation);
  processQueue(queueKey).catch(err =>
    logger.error('Queue processing error:', err)
  );
}
/**
 * Pause queue processing (used during shutdown / cleanup)
 */
export function pauseQueueProcessing(): void {
  isCleanupInProgress = true;
  logger.debug('Queue processing paused');
}

/**
 * Resume queue processing
 */
export function resumeQueueProcessing(): void {
  isCleanupInProgress = false;
  logger.debug('Queue processing resumed');
}

/**
 * Wait for all pending operations to complete
 */
export async function waitForPendingOperations(
  timeoutMs: number = 5000
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    let anyProcessing = false;

    for (const processing of processingQueues.values()) {
      if (processing) {
        anyProcessing = true;
        break;
      }
    }

    if (!anyProcessing) {
      logger.debug('All pending queue operations completed');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  logger.warn('Timeout while waiting for pending queue operations');
}
