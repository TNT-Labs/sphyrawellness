import { importAllData } from './db';
import {
  loadCustomers,
  loadServices,
  loadStaff,
  loadAppointments,
  loadPayments,
  loadReminders,
} from './storage';

const MIGRATION_KEY = 'sphyra_migrated_to_indexeddb';

/**
 * Check if migration has already been completed
 */
export function isMigrationComplete(): boolean {
  return localStorage.getItem(MIGRATION_KEY) === 'true';
}

/**
 * Mark migration as complete
 */
function markMigrationComplete(): void {
  localStorage.setItem(MIGRATION_KEY, 'true');
}

/**
 * Migrate data from localStorage to IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<{
  success: boolean;
  itemsMigrated: number;
  error?: string;
}> {
  try {
    // Check if already migrated
    if (isMigrationComplete()) {
      console.log('Migration already completed, skipping...');
      return { success: true, itemsMigrated: 0 };
    }

    console.log('Starting migration from localStorage to IndexedDB...');

    // Load all data from localStorage
    const customers = loadCustomers();
    const services = loadServices();
    const staff = loadStaff();
    const appointments = loadAppointments();
    const payments = loadPayments();
    const reminders = loadReminders();

    const totalItems =
      customers.length +
      services.length +
      staff.length +
      appointments.length +
      payments.length +
      reminders.length;

    if (totalItems === 0) {
      console.log('No data to migrate from localStorage');
      markMigrationComplete();
      return { success: true, itemsMigrated: 0 };
    }

    console.log(`Found ${totalItems} items to migrate`);

    // Import all data into IndexedDB
    await importAllData({
      customers,
      services,
      staff,
      appointments,
      payments,
      reminders,
    });

    console.log('Migration completed successfully!');
    markMigrationComplete();

    return {
      success: true,
      itemsMigrated: totalItems,
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      itemsMigrated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reset migration status (for testing purposes)
 */
export function resetMigrationStatus(): void {
  localStorage.removeItem(MIGRATION_KEY);
  console.log('Migration status reset');
}
