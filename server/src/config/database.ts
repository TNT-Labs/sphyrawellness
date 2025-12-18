import PouchDB from 'pouchdb-node';
import PouchDBFind from 'pouchdb-find';
import dotenv from 'dotenv';

dotenv.config();

// Add find plugin
PouchDB.plugin(PouchDBFind);

const COUCHDB_URL = process.env.COUCHDB_URL || 'http://localhost:5984';
const COUCHDB_USERNAME = process.env.COUCHDB_USERNAME;
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD;

// Database names (must match frontend)
const DB_NAMES = {
  APPOINTMENTS: 'sphyra-appointments',
  CUSTOMERS: 'sphyra-customers',
  SERVICES: 'sphyra-services',
  STAFF: 'sphyra-staff',
  REMINDERS: 'sphyra-reminders',
  PAYMENTS: 'sphyra-payments',
  STAFF_ROLES: 'sphyra-staff-roles',
  SERVICE_CATEGORIES: 'sphyra-service-categories',
  USERS: 'sphyra-users',
  SETTINGS: 'sphyra-settings'
};

// Create database connections
function createDB(dbName: string) {
  const auth = COUCHDB_USERNAME && COUCHDB_PASSWORD
    ? `${COUCHDB_USERNAME}:${COUCHDB_PASSWORD}@`
    : '';

  const url = COUCHDB_URL.replace('://', `://${auth}`);
  const fullUrl = `${url}/${dbName}`;

  return new PouchDB(fullUrl);
}

export const db = {
  appointments: createDB(DB_NAMES.APPOINTMENTS),
  customers: createDB(DB_NAMES.CUSTOMERS),
  services: createDB(DB_NAMES.SERVICES),
  staff: createDB(DB_NAMES.STAFF),
  reminders: createDB(DB_NAMES.REMINDERS),
  payments: createDB(DB_NAMES.PAYMENTS),
  staffRoles: createDB(DB_NAMES.STAFF_ROLES),
  serviceCategories: createDB(DB_NAMES.SERVICE_CATEGORIES),
  users: createDB(DB_NAMES.USERS),
  settings: createDB(DB_NAMES.SETTINGS)
};

// Create indexes for efficient queries
export async function initializeIndexes() {
  try {
    // === EXISTING INDEXES ===

    // Index for appointments by date and status
    await db.appointments.createIndex({
      index: {
        fields: ['date', 'status']
      }
    });

    // Index for reminders by appointment and sent status
    await db.reminders.createIndex({
      index: {
        fields: ['appointmentId', 'sent']
      }
    });

    // === NEW OPTIMIZED INDEXES ===

    // Customer search optimization - email lookup
    await db.customers.createIndex({
      index: {
        fields: ['email']
      }
    });

    // Customer search optimization - phone lookup
    await db.customers.createIndex({
      index: {
        fields: ['phone']
      }
    });

    // Appointment queries optimization - by customer and date
    await db.appointments.createIndex({
      index: {
        fields: ['customerId', 'date']
      }
    });

    // Appointment queries optimization - by staff and date
    await db.appointments.createIndex({
      index: {
        fields: ['staffId', 'date']
      }
    });

    // Appointment queries optimization - by service and status
    await db.appointments.createIndex({
      index: {
        fields: ['serviceId', 'status']
      }
    });

    // Payment queries optimization - by date for revenue reports
    await db.payments.createIndex({
      index: {
        fields: ['date']
      }
    });

    console.log('✅ Database indexes created successfully (8 indexes total)');
  } catch (error) {
    console.error('❌ Error creating database indexes:', error);
    // Don't throw - indexes might already exist
  }
}

export default db;
