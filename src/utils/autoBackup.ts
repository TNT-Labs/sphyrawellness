import { exportAllData } from './db';
import { logger } from './logger';
import { handleError, hasEnoughStorage, safeJsonParse } from './errorHandling';

const BACKUP_KEY_PREFIX = 'sphyra_backup_';
const LAST_BACKUP_KEY = 'sphyra_last_backup_date';
const MAX_BACKUPS = 7; // Keep last 7 days of backups

interface BackupMetadata {
  date: string;
  timestamp: number;
  itemsCount: {
    customers: number;
    services: number;
    staff: number;
    appointments: number;
    payments: number;
    reminders: number;
    staffRoles: number;
    serviceCategories: number;
  };
}

/**
 * Check if a backup is needed today
 */
function shouldCreateBackup(): boolean {
  const lastBackupDate = localStorage.getItem(LAST_BACKUP_KEY);
  const today = new Date().toISOString().split('T')[0];

  if (!lastBackupDate || lastBackupDate !== today) {
    return true;
  }

  return false;
}

/**
 * Validate backup data integrity
 */
function validateBackupData(data: any): boolean {
  try {
    // Check if all required fields exist
    const requiredFields = [
      'customers',
      'services',
      'staff',
      'appointments',
      'payments',
      'reminders',
      'staffRoles',
      'serviceCategories',
    ];

    for (const field of requiredFields) {
      if (!Array.isArray(data[field])) {
        logger.error(`Backup validation failed: ${field} is not an array`);
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Backup validation error:', error);
    return false;
  }
}

/**
 * Create a backup of all data with enhanced error handling
 */
export async function createAutoBackup(): Promise<void> {
  try {
    if (!shouldCreateBackup()) {
      logger.log('Backup already created today, skipping...');
      return;
    }

    const data = await exportAllData();

    // Validate data before creating backup
    if (!validateBackupData(data)) {
      throw new Error('Backup data validation failed');
    }

    const today = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();

    const backup: BackupMetadata = {
      date: today,
      timestamp,
      itemsCount: {
        customers: data.customers.length,
        services: data.services.length,
        staff: data.staff.length,
        appointments: data.appointments.length,
        payments: data.payments.length,
        reminders: data.reminders.length,
        staffRoles: data.staffRoles.length,
        serviceCategories: data.serviceCategories.length,
      },
    };

    const backupKey = `${BACKUP_KEY_PREFIX}${today}`;
    const serializedData = JSON.stringify(data);
    const serializedMeta = JSON.stringify(backup);

    // Estimate required storage space (rough estimate)
    const requiredBytes = serializedData.length + serializedMeta.length;

    // Check if we have enough storage
    const hasSpace = await hasEnoughStorage(requiredBytes);
    if (!hasSpace) {
      logger.warn('Low storage space detected, cleaning old backups first');
      cleanOldBackups();
    }

    // Save backup data
    try {
      localStorage.setItem(backupKey, serializedData);
      localStorage.setItem(`${backupKey}_meta`, serializedMeta);

      // Verify backup was saved correctly
      const savedData = localStorage.getItem(backupKey);
      if (!savedData || savedData !== serializedData) {
        throw new Error('Backup verification failed');
      }

      localStorage.setItem(LAST_BACKUP_KEY, today);
      logger.log(`✓ Auto-backup created and verified for ${today}`);

      // Clean old backups after successful save
      cleanOldBackups();
    } catch (storageError) {
      if (storageError instanceof Error && storageError.name === 'QuotaExceededError') {
        logger.error('Cannot create backup: localStorage quota exceeded');

        // Try to free space by removing old backups
        cleanOldBackups();

        // Retry once after cleanup
        try {
          localStorage.setItem(backupKey, serializedData);
          localStorage.setItem(`${backupKey}_meta`, serializedMeta);

          // Verify backup again
          const savedData = localStorage.getItem(backupKey);
          if (!savedData || savedData !== serializedData) {
            throw new Error('Backup verification failed after retry');
          }

          localStorage.setItem(LAST_BACKUP_KEY, today);
          logger.log(`✓ Auto-backup created for ${today} (after cleanup)`);
        } catch (retryError) {
          handleError(retryError, {
            context: 'Backup non riuscito',
          });
          throw retryError;
        }
      } else {
        throw storageError;
      }
    }
  } catch (error) {
    handleError(error, {
      context: 'Creazione backup automatico',
    });
    throw error;
  }
}

/**
 * Remove backups older than MAX_BACKUPS days
 */
function cleanOldBackups(): void {
  try {
    const backups = getAvailableBackups();

    if (backups.length > MAX_BACKUPS) {
      // Sort by date (oldest first)
      backups.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest backups
      const toRemove = backups.slice(0, backups.length - MAX_BACKUPS);
      toRemove.forEach((backup) => {
        const backupKey = `${BACKUP_KEY_PREFIX}${backup.date}`;
        localStorage.removeItem(backupKey);
        localStorage.removeItem(`${backupKey}_meta`);
        logger.log(`Removed old backup: ${backup.date}`);
      });
    }
  } catch (error) {
    logger.error('Failed to clean old backups:', error);
  }
}

/**
 * Get list of available backups
 */
export function getAvailableBackups(): BackupMetadata[] {
  const backups: BackupMetadata[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BACKUP_KEY_PREFIX) && key.endsWith('_meta')) {
      try {
        const metaData = localStorage.getItem(key);
        if (metaData) {
          backups.push(JSON.parse(metaData));
        }
      } catch (error) {
        logger.error(`Failed to parse backup metadata for ${key}:`, error);
      }
    }
  }

  // Sort by date (newest first)
  return backups.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Restore data from a backup with validation
 */
export function restoreFromBackup(date: string): any {
  const backupKey = `${BACKUP_KEY_PREFIX}${date}`;
  const backupData = localStorage.getItem(backupKey);

  if (!backupData) {
    throw new Error(`Backup not found for date: ${date}`);
  }

  // Safely parse backup data
  const parsed = safeJsonParse(backupData);
  if (!parsed) {
    throw new Error('Failed to parse backup data - possibly corrupted');
  }

  // Validate backup structure
  if (!validateBackupData(parsed)) {
    throw new Error('Backup data validation failed - backup may be corrupted');
  }

  logger.log(`✓ Successfully restored backup from ${date}`);
  return parsed;
}

/**
 * Delete a specific backup
 */
export function deleteBackup(date: string): void {
  const backupKey = `${BACKUP_KEY_PREFIX}${date}`;
  localStorage.removeItem(backupKey);
  localStorage.removeItem(`${backupKey}_meta`);
  logger.log(`Deleted backup: ${date}`);
}

// Store interval ID for cleanup
let backupIntervalId: ReturnType<typeof setInterval> | null = null;

// Backup interval constant (6 hours)
const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Initialize auto-backup system
 * Should be called when app starts
 */
export async function initAutoBackup(): Promise<void> {
  logger.log('Initializing auto-backup system...');

  // Create backup if needed
  await createAutoBackup();

  // Clear existing interval if any
  if (backupIntervalId) {
    clearInterval(backupIntervalId);
  }

  // Set up daily check (every 6 hours)
  backupIntervalId = setInterval(async () => {
    await createAutoBackup();
  }, BACKUP_INTERVAL_MS);
}

/**
 * Stop auto-backup system
 * Should be called when app is being torn down
 */
export function stopAutoBackup(): void {
  if (backupIntervalId) {
    clearInterval(backupIntervalId);
    backupIntervalId = null;
    logger.log('Auto-backup system stopped');
  }
}
