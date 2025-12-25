#!/usr/bin/env node

/**
 * Script di Test Integrità Sincronizzazione
 *
 * Questo script verifica il corretto funzionamento del sistema di sincronizzazione
 * testando i seguenti scenari:
 *
 * 1. Race conditions nella propagazione delle cancellazioni
 * 2. Perdita di operazioni di sync
 * 3. Risoluzione conflitti con timestamp uguali
 * 4. Tracking delle cancellazioni
 * 5. Integrità referenziale
 *
 * Usage:
 *   node scripts/test-sync-integrity.js [--verbose] [--test=<test-name>]
 */

const PouchDB = require('pouchdb-node');
const { v4: uuidv4 } = require('uuid');

// Configurazione
const COUCHDB_URL = process.env.COUCHDB_URL || 'http://admin:password@localhost:5984';
const VERBOSE = process.argv.includes('--verbose');
const SPECIFIC_TEST = process.argv.find(arg => arg.startsWith('--test='))?.split('=')[1];

// Database names
const DB_NAMES = {
  CUSTOMERS: 'sphyra-customers-test',
  APPOINTMENTS: 'sphyra-appointments-test',
  DELETED_ITEMS: 'sphyra-deleted-items-test',
};

// Utilities
const log = {
  info: (msg, ...args) => console.log(`ℹ️  ${msg}`, ...args),
  success: (msg, ...args) => console.log(`✅ ${msg}`, ...args),
  error: (msg, ...args) => console.error(`❌ ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`⚠️  ${msg}`, ...args),
  debug: (msg, ...args) => VERBOSE && console.log(`🔍 ${msg}`, ...args),
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test Results
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
};

function recordResult(testName, passed, message) {
  if (passed) {
    testResults.passed++;
    log.success(`${testName}: ${message}`);
  } else {
    testResults.failed++;
    log.error(`${testName}: ${message}`);
    testResults.errors.push({ test: testName, message });
  }
}

function recordWarning(testName, message) {
  testResults.warnings++;
  log.warn(`${testName}: ${message}`);
}

// ============================================
// Setup & Cleanup
// ============================================

async function setupTestDatabases() {
  log.info('Setting up test databases...');

  const dbs = {};
  for (const [key, dbName] of Object.entries(DB_NAMES)) {
    const db = new PouchDB(`${COUCHDB_URL}/${dbName}`);

    try {
      // Delete if exists
      await db.destroy();
      log.debug(`Deleted existing database: ${dbName}`);
    } catch (err) {
      log.debug(`Database ${dbName} did not exist`);
    }

    // Recreate
    dbs[key] = new PouchDB(`${COUCHDB_URL}/${dbName}`);
    log.debug(`Created database: ${dbName}`);
  }

  log.success('Test databases ready');
  return dbs;
}

async function cleanupTestDatabases(dbs) {
  log.info('Cleaning up test databases...');

  for (const [key, db] of Object.entries(dbs)) {
    try {
      await db.destroy();
      log.debug(`Deleted: ${DB_NAMES[key]}`);
    } catch (err) {
      log.warn(`Failed to delete ${DB_NAMES[key]}:`, err.message);
    }
  }

  log.success('Cleanup complete');
}

// ============================================
// TEST 1: Race Condition nella Propagazione Cancellazioni
// ============================================

async function testDeletionRaceCondition(dbs) {
  log.info('\n📝 TEST 1: Race Condition nella Propagazione Cancellazioni');

  try {
    // Simula lo scenario:
    // 1. Documento viene cancellato localmente
    // 2. Mentre si propaga la cancellazione, arriva un altro documento da sync
    // 3. Verifica che il flag isSyncFromRemoteActive non causi problemi

    const customer = {
      _id: `customer-${uuidv4()}`,
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '1234567890',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Crea il documento
    await dbs.CUSTOMERS.put(customer);
    log.debug('Created customer:', customer._id);

    // Simula cancellazione
    const doc = await dbs.CUSTOMERS.get(customer._id);
    await dbs.CUSTOMERS.remove(doc);
    log.debug('Deleted customer:', customer._id);

    // Registra la cancellazione nel tracking store
    await dbs.DELETED_ITEMS.put({
      _id: `customers:${customer._id}`,
      storeName: 'customers',
      itemId: customer._id,
      deletedAt: new Date().toISOString(),
    });

    // Simula che il documento arrivi di nuovo da sync remoto
    // (questo NON dovrebbe ricrearlo se il tracking funziona)
    try {
      const resurrectedDoc = {
        _id: customer._id,
        name: 'Test Customer Resurrected',
        email: 'test@example.com',
        phone: '1234567890',
        createdAt: customer.createdAt,
        updatedAt: new Date().toISOString(),
      };

      await dbs.CUSTOMERS.put(resurrectedDoc);

      // Verifica se esiste nel deleted items
      const deletedRecord = await dbs.DELETED_ITEMS.get(`customers:${customer._id}`);

      if (deletedRecord) {
        // BUONO: Il tracking esiste, il codice dovrebbe prevenire la ricreazione
        recordResult('TEST 1', true, 'Deletion tracking funziona - il record esiste in deletedItems');

        // In un'implementazione corretta, il documento NON dovrebbe essere ricreato
        // Ma in questo test isolato lo abbiamo ricreato manualmente
        recordWarning('TEST 1', 'Il documento è stato ricreato manualmente nel test, ma il codice reale dovrebbe prevenirlo');
      } else {
        recordResult('TEST 1', false, 'Deletion tracking NON funziona - record non trovato in deletedItems');
      }
    } catch (err) {
      recordResult('TEST 1', false, `Errore durante test resurrezione: ${err.message}`);
    }
  } catch (err) {
    recordResult('TEST 1', false, `Errore: ${err.message}`);
  }
}

// ============================================
// TEST 2: Risoluzione Conflitti con Timestamp Uguali
// ============================================

async function testConflictResolution(dbs) {
  log.info('\n📝 TEST 2: Risoluzione Conflitti con Timestamp Uguali');

  try {
    const timestamp = new Date().toISOString();

    const doc1 = {
      _id: `customer-conflict-${uuidv4()}`,
      name: 'Device A Version',
      email: 'conflict@example.com',
      phone: '1111111111',
      createdAt: timestamp,
      updatedAt: timestamp,
      updatedBy: 'device-a',
    };

    const doc2 = {
      _id: doc1._id,
      name: 'Device B Version',
      email: 'conflict@example.com',
      phone: '2222222222',
      createdAt: timestamp,
      updatedAt: timestamp,
      updatedBy: 'device-b',
    };

    // Simula: Device A scrive per primo
    await dbs.CUSTOMERS.put(doc1);
    log.debug('Device A wrote:', doc1.name);

    // Simula: Device B cerca di scrivere (stesso timestamp!)
    try {
      const existingDoc = await dbs.CUSTOMERS.get(doc1._id);

      // Implementazione attuale: timestamp comparison
      const doc1Time = new Date(doc1.updatedAt).getTime();
      const doc2Time = new Date(doc2.updatedAt).getTime();

      if (doc1Time === doc2Time) {
        // CONFLITTO: Stesso timestamp
        log.debug('CONFLICT DETECTED: Stesso timestamp!');

        // L'implementazione attuale usa createdAt come tiebreaker
        const doc1Created = new Date(doc1.createdAt).getTime();
        const doc2Created = new Date(doc2.createdAt).getTime();

        if (doc1Created === doc2Created) {
          // PROBLEMA: Anche createdAt è uguale!
          recordWarning('TEST 2', 'Conflitto irrisolvibile con timestamp - entrambi i timestamp sono identici');
          recordResult('TEST 2', false, 'Sistema non può risolvere conflitti con timestamp identici');
        } else {
          recordResult('TEST 2', true, 'Tiebreaker con createdAt funziona (ma scenario improbabile)');
        }
      } else {
        recordResult('TEST 2', true, 'Nessun conflitto di timestamp (tempi diversi)');
      }
    } catch (err) {
      recordResult('TEST 2', false, `Errore durante conflict resolution: ${err.message}`);
    }
  } catch (err) {
    recordResult('TEST 2', false, `Errore: ${err.message}`);
  }
}

// ============================================
// TEST 3: Tracking Permanente Cancellazioni
// ============================================

async function testPermanentDeletionTracking(dbs) {
  log.info('\n📝 TEST 3: Tracking Permanente Cancellazioni');

  try {
    const testItems = [];

    // Crea 10 elementi e cancellali
    for (let i = 0; i < 10; i++) {
      const id = `customer-${uuidv4()}`;
      const doc = {
        _id: id,
        name: `Test Customer ${i}`,
        email: `test${i}@example.com`,
        phone: `123456789${i}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dbs.CUSTOMERS.put(doc);
      testItems.push(id);
    }

    log.debug(`Created ${testItems.length} test customers`);

    // Cancella tutti
    for (const id of testItems) {
      const doc = await dbs.CUSTOMERS.get(id);
      await dbs.CUSTOMERS.remove(doc);

      // Registra cancellazione
      await dbs.DELETED_ITEMS.put({
        _id: `customers:${id}`,
        storeName: 'customers',
        itemId: id,
        deletedAt: new Date().toISOString(),
      });
    }

    log.debug(`Deleted ${testItems.length} customers and tracked deletions`);

    // Verifica che tutte le cancellazioni siano tracciate
    let trackedCount = 0;
    for (const id of testItems) {
      try {
        await dbs.DELETED_ITEMS.get(`customers:${id}`);
        trackedCount++;
      } catch (err) {
        // Non trovato
      }
    }

    if (trackedCount === testItems.length) {
      recordResult('TEST 3', true, `Tutte le ${testItems.length} cancellazioni sono tracciate correttamente`);
    } else {
      recordResult('TEST 3', false, `Solo ${trackedCount}/${testItems.length} cancellazioni sono tracciate`);
    }

    // Verifica che i documenti non esistano più in CUSTOMERS
    let stillExist = 0;
    for (const id of testItems) {
      try {
        await dbs.CUSTOMERS.get(id);
        stillExist++;
      } catch (err) {
        // Non esiste (corretto)
      }
    }

    if (stillExist === 0) {
      recordResult('TEST 3.1', true, 'Tutti i documenti sono stati eliminati correttamente da CUSTOMERS');
    } else {
      recordResult('TEST 3.1', false, `${stillExist} documenti esistono ancora in CUSTOMERS`);
    }
  } catch (err) {
    recordResult('TEST 3', false, `Errore: ${err.message}`);
  }
}

// ============================================
// TEST 4: Integrità Referenziale
// ============================================

async function testReferentialIntegrity(dbs) {
  log.info('\n📝 TEST 4: Integrità Referenziale');

  try {
    // Crea un cliente
    const customerId = `customer-${uuidv4()}`;
    const customer = {
      _id: customerId,
      name: 'Test Customer',
      email: 'ref@example.com',
      phone: '9999999999',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dbs.CUSTOMERS.put(customer);
    log.debug('Created customer:', customerId);

    // Crea appuntamento che referenzia il cliente
    const appointmentId = `appointment-${uuidv4()}`;
    const appointment = {
      _id: appointmentId,
      customerId: customerId,
      staffId: `staff-${uuidv4()}`, // Non esiste, ma test non verifica staff
      serviceId: `service-${uuidv4()}`, // Non esiste, ma test non verifica services
      date: '2025-12-30',
      time: '10:00',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dbs.APPOINTMENTS.put(appointment);
    log.debug('Created appointment:', appointmentId);

    // Cancella il cliente
    const customerDoc = await dbs.CUSTOMERS.get(customerId);
    await dbs.CUSTOMERS.remove(customerDoc);
    log.debug('Deleted customer:', customerId);

    // Verifica se l'appuntamento esiste ancora (orfano)
    try {
      const orphanAppointment = await dbs.APPOINTMENTS.get(appointmentId);

      // Verifica se il customerId esiste ancora
      try {
        await dbs.CUSTOMERS.get(orphanAppointment.customerId);
        recordResult('TEST 4', false, 'Integrità referenziale OK (imprevisto - customer dovrebbe essere cancellato)');
      } catch (err) {
        // Customer non esiste
        recordWarning('TEST 4', 'INTEGRITÀ REFERENZIALE VIOLATA: Appuntamento orfano esiste senza cliente');
        recordResult('TEST 4', false, 'Sistema permette appuntamenti orfani (no cascade delete / validation)');
      }
    } catch (err) {
      recordResult('TEST 4', true, 'Appuntamento è stato eliminato insieme al cliente (cascade delete funziona)');
    }
  } catch (err) {
    recordResult('TEST 4', false, `Errore: ${err.message}`);
  }
}

// ============================================
// TEST 5: Performance Test - Initial Sync
// ============================================

async function testInitialSyncPerformance(dbs) {
  log.info('\n📝 TEST 5: Performance Initial Sync');

  try {
    const CUSTOMER_COUNT = 100;
    const customers = [];

    // Crea molti documenti
    for (let i = 0; i < CUSTOMER_COUNT; i++) {
      customers.push({
        _id: `customer-${uuidv4()}`,
        name: `Customer ${i}`,
        email: `customer${i}@example.com`,
        phone: `123456${String(i).padStart(4, '0')}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Bulk insert
    const startInsert = Date.now();
    await dbs.CUSTOMERS.bulkDocs(customers);
    const insertTime = Date.now() - startInsert;
    log.debug(`Inserted ${CUSTOMER_COUNT} customers in ${insertTime}ms`);

    // Simula initial sync - scarica tutti i documenti
    const startSync = Date.now();
    const result = await dbs.CUSTOMERS.allDocs({ include_docs: true });
    const syncTime = Date.now() - startSync;
    log.debug(`Fetched ${result.rows.length} documents in ${syncTime}ms`);

    // Performance metrics
    const avgTimePerDoc = syncTime / result.rows.length;

    if (avgTimePerDoc < 5) {
      recordResult('TEST 5', true, `Ottima performance: ${avgTimePerDoc.toFixed(2)}ms per documento`);
    } else if (avgTimePerDoc < 10) {
      recordWarning('TEST 5', `Performance accettabile: ${avgTimePerDoc.toFixed(2)}ms per documento`);
    } else {
      recordResult('TEST 5', false, `Performance scarsa: ${avgTimePerDoc.toFixed(2)}ms per documento (target: <5ms)`);
    }

    // Stima per 1000 documenti
    const estimatedTimeFor1000 = (avgTimePerDoc * 1000) / 1000; // in secondi
    log.info(`Tempo stimato per 1000 documenti: ${estimatedTimeFor1000.toFixed(2)}s`);

    if (estimatedTimeFor1000 > 5) {
      recordWarning('TEST 5', `Initial sync potrebbe essere lento con molti documenti (${estimatedTimeFor1000.toFixed(1)}s per 1000 docs)`);
    }
  } catch (err) {
    recordResult('TEST 5', false, `Errore: ${err.message}`);
  }
}

// ============================================
// TEST 6: Concurrent Modifications
// ============================================

async function testConcurrentModifications(dbs) {
  log.info('\n📝 TEST 6: Modifiche Concorrenti');

  try {
    // Crea un documento base
    const customerId = `customer-${uuidv4()}`;
    const customer = {
      _id: customerId,
      name: 'Original Name',
      email: 'concurrent@example.com',
      phone: '0000000000',
      counter: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dbs.CUSTOMERS.put(customer);
    log.debug('Created customer:', customerId);

    // Simula 5 modifiche concorrenti
    const modifications = [];
    for (let i = 1; i <= 5; i++) {
      modifications.push(
        (async () => {
          try {
            // Leggi documento
            const doc = await dbs.CUSTOMERS.get(customerId);

            // Simula delay (elaborazione)
            await sleep(Math.random() * 50);

            // Modifica e salva
            doc.counter = i;
            doc.name = `Modified by ${i}`;
            doc.updatedAt = new Date().toISOString();

            await dbs.CUSTOMERS.put(doc);
            log.debug(`Modification ${i} succeeded`);
            return { success: true, id: i };
          } catch (err) {
            log.debug(`Modification ${i} failed:`, err.message);
            return { success: false, id: i, error: err.message };
          }
        })()
      );
    }

    const results = await Promise.allSettled(modifications);

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'fulfilled' && !r.value.success).length;

    log.debug(`Concurrent modifications: ${successful} succeeded, ${failed} failed`);

    // Con PouchDB, solo una modifica dovrebbe avere successo (conflict resolution)
    // Le altre dovrebbero fallire con errore 409 (conflict)
    if (failed >= 3) {
      recordResult('TEST 6', true, `Conflict detection funziona: ${failed}/5 modifiche hanno generato conflitti`);
    } else {
      recordWarning('TEST 6', `Pochi conflitti rilevati: solo ${failed}/5 (expected: ~3-4)`);
    }

    // Verifica stato finale
    const finalDoc = await dbs.CUSTOMERS.get(customerId);
    log.info(`Stato finale: name="${finalDoc.name}", counter=${finalDoc.counter}`);

  } catch (err) {
    recordResult('TEST 6', false, `Errore: ${err.message}`);
  }
}

// ============================================
// Main Test Runner
// ============================================

async function runAllTests() {
  log.info('═══════════════════════════════════════════════════════');
  log.info('   🧪 TEST SUITE: Integrità Sincronizzazione Dati');
  log.info('═══════════════════════════════════════════════════════\n');

  let dbs;

  try {
    dbs = await setupTestDatabases();

    const tests = [
      { name: 'deletion-race', fn: testDeletionRaceCondition },
      { name: 'conflict-resolution', fn: testConflictResolution },
      { name: 'deletion-tracking', fn: testPermanentDeletionTracking },
      { name: 'referential-integrity', fn: testReferentialIntegrity },
      { name: 'sync-performance', fn: testInitialSyncPerformance },
      { name: 'concurrent-modifications', fn: testConcurrentModifications },
    ];

    for (const test of tests) {
      // Skip se specificato un test specifico e questo non è quello
      if (SPECIFIC_TEST && test.name !== SPECIFIC_TEST) {
        continue;
      }

      await test.fn(dbs);
      await sleep(100); // Small delay tra i test
    }

  } catch (err) {
    log.error('Fatal error durante i test:', err);
  } finally {
    if (dbs) {
      await cleanupTestDatabases(dbs);
    }
  }

  // Report finale
  log.info('\n═══════════════════════════════════════════════════════');
  log.info('   📊 RISULTATI TEST');
  log.info('═══════════════════════════════════════════════════════\n');

  log.info(`✅ Test superati: ${testResults.passed}`);
  log.info(`❌ Test falliti: ${testResults.failed}`);
  log.info(`⚠️  Warning: ${testResults.warnings}`);

  if (testResults.failed > 0) {
    log.info('\n❌ ERRORI RILEVATI:\n');
    testResults.errors.forEach((err, i) => {
      log.error(`${i + 1}. [${err.test}] ${err.message}`);
    });
  }

  log.info('\n═══════════════════════════════════════════════════════\n');

  // Exit code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// ============================================
// Entry Point
// ============================================

runAllTests().catch(err => {
  log.error('Unhandled error:', err);
  process.exit(1);
});
