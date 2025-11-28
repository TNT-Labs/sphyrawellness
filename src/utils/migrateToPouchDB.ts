import { openDB, IDBPDatabase } from 'idb';
import * as PouchDBSync from './pouchdbSync';
import { logger } from './logger';

interface SphyraDB {
  customers: any;
  services: any;
  staff: any;
  appointments: any;
  payments: any;
  reminders: any;
  staffRoles: any;
  serviceCategories: any;
}

const MIGRATION_FLAG_KEY = 'sphyra_migrated_to_pouchdb';
const OLD_DB_NAME = 'sphyra-wellness-db';

/**
 * Check if migration has already been completed
 */
export function isMigrationCompleted(): boolean {
  return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
}

/**
 * Mark migration as completed
 */
function setMigrationCompleted(): void {
  localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
}

/**
 * Migrate data from IndexedDB to PouchDB
 */
export async function migrateIndexedDBToPouchDB(): Promise<void> {
  // Check if migration already done
  if (isMigrationCompleted()) {
    logger.info('Migration to PouchDB already completed, skipping');
    return;
  }

  try {
    logger.info('Starting migration from IndexedDB to PouchDB...');

    // Try to open the old IndexedDB database
    let oldDB: IDBPDatabase | null = null;
    try {
      oldDB = await openDB(OLD_DB_NAME, 2);
    } catch (error) {
      logger.info('Old IndexedDB database not found, nothing to migrate');
      setMigrationCompleted();
      return;
    }

    // Check if old DB has any data
    const storeNames = ['customers', 'services', 'staff', 'appointments', 'payments', 'reminders', 'staffRoles', 'serviceCategories'];
    let hasData = false;

    for (const storeName of storeNames) {
      try {
        const count = await oldDB.count(storeName as any);
        if (count > 0) {
          hasData = true;
          break;
        }
      } catch (error) {
        // Store might not exist in older versions
        logger.warn(`Store ${storeName} not found in old database`);
      }
    }

    if (!hasData) {
      logger.info('Old IndexedDB database is empty, nothing to migrate');
      setMigrationCompleted();
      return;
    }

    // Initialize PouchDB
    await PouchDBSync.initPouchDB();

    // Migrate each store
    const migrationPromises = [];

    // Migrate customers
    try {
      const customers = await oldDB.getAll('customers' as any);
      logger.info(`Migrating ${customers.length} customers...`);
      for (const customer of customers) {
        migrationPromises.push(PouchDBSync.addCustomer(customer));
      }
    } catch (error) {
      logger.warn('Error migrating customers:', error);
    }

    // Migrate services
    try {
      const services = await oldDB.getAll('services' as any);
      logger.info(`Migrating ${services.length} services...`);
      for (const service of services) {
        migrationPromises.push(PouchDBSync.addService(service));
      }
    } catch (error) {
      logger.warn('Error migrating services:', error);
    }

    // Migrate staff
    try {
      const staff = await oldDB.getAll('staff' as any);
      logger.info(`Migrating ${staff.length} staff members...`);
      for (const member of staff) {
        migrationPromises.push(PouchDBSync.addStaff(member));
      }
    } catch (error) {
      logger.warn('Error migrating staff:', error);
    }

    // Migrate appointments
    try {
      const appointments = await oldDB.getAll('appointments' as any);
      logger.info(`Migrating ${appointments.length} appointments...`);
      for (const appointment of appointments) {
        migrationPromises.push(PouchDBSync.addAppointment(appointment));
      }
    } catch (error) {
      logger.warn('Error migrating appointments:', error);
    }

    // Migrate payments
    try {
      const payments = await oldDB.getAll('payments' as any);
      logger.info(`Migrating ${payments.length} payments...`);
      for (const payment of payments) {
        migrationPromises.push(PouchDBSync.addPayment(payment));
      }
    } catch (error) {
      logger.warn('Error migrating payments:', error);
    }

    // Migrate reminders
    try {
      const reminders = await oldDB.getAll('reminders' as any);
      logger.info(`Migrating ${reminders.length} reminders...`);
      for (const reminder of reminders) {
        migrationPromises.push(PouchDBSync.addReminder(reminder));
      }
    } catch (error) {
      logger.warn('Error migrating reminders:', error);
    }

    // Migrate staff roles
    try {
      const staffRoles = await oldDB.getAll('staffRoles' as any);
      logger.info(`Migrating ${staffRoles.length} staff roles...`);
      for (const role of staffRoles) {
        migrationPromises.push(PouchDBSync.addStaffRole(role));
      }
    } catch (error) {
      logger.warn('Error migrating staff roles:', error);
    }

    // Migrate service categories
    try {
      const serviceCategories = await oldDB.getAll('serviceCategories' as any);
      logger.info(`Migrating ${serviceCategories.length} service categories...`);
      for (const category of serviceCategories) {
        migrationPromises.push(PouchDBSync.addServiceCategory(category));
      }
    } catch (error) {
      logger.warn('Error migrating service categories:', error);
    }

    // Wait for all migrations to complete
    await Promise.all(migrationPromises);

    // Close old database
    oldDB.close();

    // Mark migration as completed
    setMigrationCompleted();

    logger.info('Migration to PouchDB completed successfully!');
  } catch (error) {
    logger.error('Migration to PouchDB failed:', error);
    throw error;
  }
}
