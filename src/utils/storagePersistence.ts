import { logger } from './logger';

const PERSISTENCE_REQUESTED_KEY = 'sphyra_persistence_requested';

/**
 * Check if storage persistence is supported
 */
export function isStoragePersistenceSupported(): boolean {
  return 'storage' in navigator && 'persist' in navigator.storage;
}

/**
 * Check if storage is already persisted
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (!isStoragePersistenceSupported()) {
    return false;
  }

  return await navigator.storage.persisted();
}

/**
 * Request storage persistence
 */
export async function requestStoragePersistence(): Promise<boolean> {
  if (!isStoragePersistenceSupported()) {
    logger.warn('Storage persistence is not supported in this browser');
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persist();

    if (isPersisted) {
      logger.log('✓ Storage persistence granted');
      localStorage.setItem(PERSISTENCE_REQUESTED_KEY, 'true');
    } else {
      logger.warn('Storage persistence was denied');
    }

    return isPersisted;
  } catch (error) {
    logger.error('Failed to request storage persistence:', error);
    return false;
  }
}

/**
 * Get storage usage estimate
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  usagePercent: number;
  usageMB: number;
  quotaMB: number;
} | null> {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      usage,
      quota,
      usagePercent,
      usageMB: usage / (1024 * 1024),
      quotaMB: quota / (1024 * 1024),
    };
  } catch (error) {
    logger.error('Failed to get storage estimate:', error);
    return null;
  }
}

/**
 * Check if user has already been asked for persistence
 */
export function hasRequestedPersistence(): boolean {
  return localStorage.getItem(PERSISTENCE_REQUESTED_KEY) === 'true';
}

/**
 * Initialize storage persistence
 * Automatically requests persistence if not already granted
 */
export async function initStoragePersistence(): Promise<void> {
  if (!isStoragePersistenceSupported()) {
    logger.warn('Storage persistence not supported');
    return;
  }

  const isPersisted = await isStoragePersisted();

  if (isPersisted) {
    logger.log('✓ Storage is already persisted');
    return;
  }

  // Don't auto-request if already asked before
  if (hasRequestedPersistence()) {
    logger.log('Storage persistence already requested, user denied');
    return;
  }

  // Auto-request persistence
  await requestStoragePersistence();
}

/**
 * Get persistence status info
 */
export async function getStoragePersistenceInfo(): Promise<{
  supported: boolean;
  persisted: boolean;
  estimate: Awaited<ReturnType<typeof getStorageEstimate>>;
}> {
  const supported = isStoragePersistenceSupported();
  const persisted = supported ? await isStoragePersisted() : false;
  const estimate = await getStorageEstimate();

  return {
    supported,
    persisted,
    estimate,
  };
}
