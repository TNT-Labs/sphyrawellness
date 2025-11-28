import { exportAllData } from './db';
import { logger } from './logger';

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
 * Create a backup of all data
 */
export async function createAutoBackup(): Promise<void> {
  try {
    if (!shouldCreateBackup()) {
      logger.log('Backup already created today, skipping...');
      return;
    }

    const data = await exportAllData();
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
      },
    };

    // Save backup data
    const backupKey = `${BACKUP_KEY_PREFIX}${today}`;
    localStorage.setItem(backupKey, JSON.stringify(data));
    localStorage.setItem(`${backupKey}_meta`, JSON.stringify(backup));
    localStorage.setItem(LAST_BACKUP_KEY, today);

    logger.log(`✓ Auto-backup created for ${today}`);

    // Clean old backups
    cleanOldBackups();
  } catch (error) {
    logger.error('Failed to create auto-backup:', error);
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
 * Restore data from a backup
 */
export function restoreFromBackup(date: string): any {
  const backupKey = `${BACKUP_KEY_PREFIX}${date}`;
  const backupData = localStorage.getItem(backupKey);

  if (!backupData) {
    throw new Error(`Backup not found for date: ${date}`);
  }

  return JSON.parse(backupData);
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

/**
 * Initialize auto-backup system
 * Should be called when app starts
 */
export async function initAutoBackup(): Promise<void> {
  logger.log('Initializing auto-backup system...');

  // Create backup if needed
  await createAutoBackup();

  // Set up daily check (every 6 hours)
  setInterval(async () => {
    await createAutoBackup();
  }, 6 * 60 * 60 * 1000); // Check every 6 hours
}
