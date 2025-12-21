/**
 * dbBridge.ts
 * Gestisce la sincronizzazione tra IndexedDB e PouchDB
 * Aggiornato per supportare soft-delete (deleted: true)
 */

import PouchDB from 'pouchdb-browser';
import { logger } from './logger';

const remoteDBUrl = 'https://your-couchdb-server/dbname';
const pouchDB = new PouchDB('local-db');
const remoteDB = new PouchDB(remoteDBUrl);

// Sincronizzazione bidirezionale in background
pouchDB
  .sync(remoteDB, { live: true, retry: true })
  .on('change', (info) => logger.info('PouchDB sync change:', info))
  .on('paused', (err) => logger.info('PouchDB sync paused:', err))
  .on('active', () => logger.info('PouchDB sync resumed'))
  .on('error', (err) => logger.error('PouchDB sync error:', err));

/**
 * Aggiunge un documento a PouchDB
 */
export async function syncAdd(store: string, item: any): Promise<void> {
  try {
    const doc = { ...item, _id: `${store}:${item.id}` };
    await pouchDB.put(doc);
  } catch (err: any) {
    if (err.status === 409) {
      // Documento già presente, fare update invece
      await syncUpdate(store, item);
    } else {
      logger.error(`syncAdd failed for ${store} id=${item.id}:`, err);
    }
  }
}

/**
 * Aggiorna un documento su PouchDB
 */
export async function syncUpdate(store: string, item: any): Promise<void> {
  try {
    const docId = `${store}:${item.id}`;
    const existing = await pouchDB.get(docId).catch(() => null);
    const doc = { ...(existing || {}), ...item, _id: docId };
    if (existing?._rev) {
      doc._rev = existing._rev;
    }
    await pouchDB.put(doc);
  } catch (err) {
    logger.error(`syncUpdate failed for ${store} id=${item.id}:`, err);
  }
}

/**
 * Soft-delete su PouchDB: imposta deleted: true
 */
export async function syncDelete(store: string, id: string): Promise<void> {
  try {
    const docId = `${store}:${id}`;
    const existing = await pouchDB.get(docId);
    if (!existing.deleted) {
      const updated = { ...existing, deleted: true, updatedAt: new Date().toISOString() };
      await pouchDB.put(updated);
    }
  } catch (err: any) {
    if (err.status === 404) {
      logger.warn(`syncDelete: document ${docId} not found, skipping`);
    } else {
      logger.error(`syncDelete failed for ${store} id=${id}:`, err);
    }
  }
}
