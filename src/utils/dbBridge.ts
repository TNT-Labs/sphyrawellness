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
    const db = new PouchDB(dbName);
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
  try {
    const pouchDB = getPouchDB(storeName);
    if (!pouchDB) return;

    // Converti l'item in formato PouchDB (aggiunge _id e _rev se necessari)
    const pouchDoc = {
      _id: item.id,
      ...item,
    };

    // Inserisci in PouchDB usando put (sovrascrive se esiste)
    await pouchDB.put(pouchDoc);
    logger.debug(`Synced add to PouchDB for ${storeName}:`, item.id);
  } catch (error: any) {
    // Se l'errore è un conflitto di versione, prova a recuperare e fare merge
    if (error.status === 409) {
      try {
        const pouchDB = getPouchDB(storeName);
        if (!pouchDB) return;

        // Recupera il documento esistente per ottenere il _rev
        const existingDoc = await pouchDB.get(item.id);
        const pouchDoc = {
          ...existingDoc,
          ...item,
          _id: item.id,
          _rev: existingDoc._rev,
        };

        await pouchDB.put(pouchDoc);
        logger.debug(`Resolved conflict and synced to PouchDB for ${storeName}:`, item.id);
      } catch (retryError) {
        logger.error(`Failed to resolve conflict for ${storeName}:`, retryError);
      }
    } else {
      logger.error(`Failed to sync add to PouchDB for ${storeName}:`, error);
    }
  }
}

/**
 * Sincronizza un'operazione di aggiornamento con PouchDB
 */
export async function syncUpdate<T extends { id: string }>(
  storeName: StoreType,
  item: T
): Promise<void> {
  try {
    const pouchDB = getPouchDB(storeName);
    if (!pouchDB) return;

    // Recupera il documento esistente per ottenere il _rev
    const existingDoc = await pouchDB.get(item.id);
    const pouchDoc = {
      ...existingDoc,
      ...item,
      _id: item.id,
      _rev: existingDoc._rev,
    };

    await pouchDB.put(pouchDoc);
    logger.debug(`Synced update to PouchDB for ${storeName}:`, item.id);
  } catch (error: any) {
    if (error.status === 404) {
      // Il documento non esiste in PouchDB, crealo
      await syncAdd(storeName, item);
    } else {
      logger.error(`Failed to sync update to PouchDB for ${storeName}:`, error);
    }
  }
}

/**
 * Sincronizza un'operazione di cancellazione con PouchDB
 */
export async function syncDelete(
  storeName: StoreType,
  id: string
): Promise<void> {
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
}
