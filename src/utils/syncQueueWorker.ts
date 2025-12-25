/**
 * FIX #2: Background Worker per Processare Queue Operazioni Sync
 *
 * Questo worker processa periodicamente le operazioni sync fallite,
 * prevenendo la perdita permanente di dati.
 */

import { logger } from './logger';
import {
  getPendingOperations,
  removePendingOperation,
  updatePendingOperation,
  getPendingOperationsCount,
  type PendingSyncOp,
} from './indexedDB';
import { syncAdd, syncUpdate, syncDelete } from './dbBridge';

// Configurazione
const WORKER_INTERVAL_MS = 60000; // 1 minuto
const MAX_RETRIES = 10; // Massimo 10 retry prima di abbandonare
const RETRY_BACKOFF_BASE_MS = 2000; // 2 secondi base per exponential backoff

let workerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

/**
 * Calcola delay per exponential backoff
 */
function getRetryDelay(retryCount: number): number {
  // Exponential backoff: 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 512s, 1024s (max ~17 min)
  return Math.min(RETRY_BACKOFF_BASE_MS * Math.pow(2, retryCount), 1024000);
}

/**
 * Riprova una singola operazione
 */
async function retryOperation(op: PendingSyncOp): Promise<boolean> {
  try {
    logger.info(`[SYNC-QUEUE] Retrying operation ${op.id}: ${op.operation} ${op.storeName} (attempt ${op.retryCount + 1}/${op.maxRetries})`);

    // Esegui l'operazione appropriata
    switch (op.operation) {
      case 'add':
        await syncAdd(op.storeName as any, op.data);
        break;
      case 'update':
        await syncUpdate(op.storeName as any, op.data);
        break;
      case 'delete':
        await syncDelete(op.storeName as any, op.data.id || op.data);
        break;
      default:
        logger.error(`[SYNC-QUEUE] Unknown operation type: ${op.operation}`);
        return false;
    }

    logger.info(`[SYNC-QUEUE] ✓ Operation ${op.id} completed successfully`);
    return true;
  } catch (error: any) {
    logger.warn(`[SYNC-QUEUE] Retry failed for operation ${op.id}:`, error.message);
    return false;
  }
}

/**
 * Processa tutte le operazioni pending nella queue
 */
async function processQueue(): Promise<void> {
  if (isProcessing) {
    logger.debug('[SYNC-QUEUE] Already processing queue, skipping');
    return;
  }

  isProcessing = true;

  try {
    const pendingOps = await getPendingOperations();

    if (pendingOps.length === 0) {
      logger.debug('[SYNC-QUEUE] No pending operations to process');
      return;
    }

    logger.info(`[SYNC-QUEUE] Processing ${pendingOps.length} pending operations`);

    let successCount = 0;
    let failedCount = 0;
    let abandonedCount = 0;

    for (const op of pendingOps) {
      // Check se è troppo presto per riprovare (exponential backoff)
      if (op.lastAttempt) {
        const timeSinceLastAttempt = Date.now() - new Date(op.lastAttempt).getTime();
        const requiredDelay = getRetryDelay(op.retryCount);

        if (timeSinceLastAttempt < requiredDelay) {
          logger.debug(`[SYNC-QUEUE] Skipping operation ${op.id} (backoff: ${requiredDelay - timeSinceLastAttempt}ms remaining)`);
          continue;
        }
      }

      // Check se ha superato il numero massimo di retry
      if (op.retryCount >= op.maxRetries) {
        logger.error(`[SYNC-QUEUE] Operation ${op.id} exceeded max retries (${op.maxRetries}), abandoning`);
        logger.error(`[SYNC-QUEUE] Lost operation: ${op.operation} ${op.storeName}`, op.data);

        // Rimuovi dalla queue (abbandonato)
        await removePendingOperation(op.id);
        abandonedCount++;
        continue;
      }

      // Riprova l'operazione
      const success = await retryOperation(op);

      if (success) {
        // Successo: rimuovi dalla queue
        await removePendingOperation(op.id);
        successCount++;
      } else {
        // Fallito: incrementa retry count e aggiorna lastAttempt
        op.retryCount++;
        op.lastAttempt = new Date().toISOString();
        op.lastError = 'Retry failed'; // Potremmo salvare il messaggio di errore specifico

        await updatePendingOperation(op);
        failedCount++;
      }
    }

    logger.info(`[SYNC-QUEUE] Queue processing complete: ${successCount} succeeded, ${failedCount} failed, ${abandonedCount} abandoned`);

    // Log alert se ci sono operazioni abbandonate
    if (abandonedCount > 0) {
      logger.error(`[SYNC-QUEUE] ⚠️ ${abandonedCount} operations were abandoned after max retries! DATA LOSS OCCURRED!`);
    }
  } catch (error) {
    logger.error('[SYNC-QUEUE] Error processing queue:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Avvia il worker in background
 */
export function startSyncQueueWorker(): void {
  if (workerInterval) {
    logger.warn('[SYNC-QUEUE] Worker already started');
    return;
  }

  logger.info(`[SYNC-QUEUE] Starting background worker (interval: ${WORKER_INTERVAL_MS}ms)`);

  // Esegui subito un check iniziale
  processQueue().catch(error => {
    logger.error('[SYNC-QUEUE] Initial queue processing failed:', error);
  });

  // Poi esegui periodicamente
  workerInterval = setInterval(() => {
    processQueue().catch(error => {
      logger.error('[SYNC-QUEUE] Queue processing failed:', error);
    });
  }, WORKER_INTERVAL_MS);
}

/**
 * Ferma il worker in background
 */
export function stopSyncQueueWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    logger.info('[SYNC-QUEUE] Background worker stopped');
  }
}

/**
 * Forza il processing immediato della queue (utile dopo connessione ripristinata)
 */
export function forceProcessQueue(): void {
  logger.info('[SYNC-QUEUE] Forcing immediate queue processing');
  processQueue().catch(error => {
    logger.error('[SYNC-QUEUE] Forced queue processing failed:', error);
  });
}

/**
 * Ottieni statistiche della queue
 */
export async function getQueueStats(): Promise<{
  pendingCount: number;
  operations: PendingSyncOp[];
}> {
  const operations = await getPendingOperations();
  return {
    pendingCount: operations.length,
    operations,
  };
}
