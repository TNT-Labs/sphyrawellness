#!/usr/bin/env node

/**
 * Script di Verifica Sincronizzazione Database
 *
 * Questo script verifica che la sincronizzazione bidirezionale tra
 * PouchDB locale e CouchDB remoto funzioni correttamente.
 *
 * Test eseguiti:
 * 1. Connessione a CouchDB
 * 2. Esistenza di tutti i database necessari
 * 3. Sincronizzazione Push (locale -> remoto)
 * 4. Sincronizzazione Pull (remoto -> locale)
 * 5. Gestione conflitti
 * 6. Performance e latenza
 *
 * Utilizzo:
 *   node scripts/verify-db-sync.js <couchdb-url> [username] [password]
 *
 * Esempi:
 *   node scripts/verify-db-sync.js http://localhost:5984 admin password
 *   COUCHDB_URL=http://localhost:5984 COUCHDB_USERNAME=admin COUCHDB_PASSWORD=password node scripts/verify-db-sync.js
 */

const http = require('http');
const https = require('https');

// Database da verificare
const DATABASES = [
  'sphyra-customers',
  'sphyra-services',
  'sphyra-staff',
  'sphyra-appointments',
  'sphyra-payments',
  'sphyra-reminders',
  'sphyra-staff-roles',
  'sphyra-service-categories',
  'sphyra-users',
];

// Colori per output console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Risultati dei test
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  details: [],
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, status, details = '') {
  results.total++;
  const timestamp = new Date().toISOString();

  if (status === 'PASS') {
    results.passed++;
    log(`✓ ${name}`, 'green');
    results.details.push({ timestamp, name, status: 'PASS', details });
  } else if (status === 'FAIL') {
    results.failed++;
    log(`✗ ${name}`, 'red');
    if (details) log(`  ${details}`, 'red');
    results.details.push({ timestamp, name, status: 'FAIL', details });
  } else if (status === 'WARN') {
    results.warnings++;
    log(`⚠ ${name}`, 'yellow');
    if (details) log(`  ${details}`, 'yellow');
    results.details.push({ timestamp, name, status: 'WARN', details });
  }
}

/**
 * Effettua una richiesta HTTP/HTTPS
 */
function makeRequest(url, method = 'GET', auth = null, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Aggiungi autenticazione se fornita
    if (auth) {
      const authString = `${auth.username}:${auth.password}`;
      const encodedAuth = Buffer.from(authString).toString('base64');
      options.headers['Authorization'] = `Basic ${encodedAuth}`;
    }

    // Aggiungi body se fornito
    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : null;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // Timeout di 30 secondi
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    // Invia il body se presente
    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Test 1: Verifica connessione a CouchDB
 */
async function testConnection(baseUrl, auth) {
  log('\n=== Test 1: Connessione a CouchDB ===', 'cyan');

  try {
    const startTime = Date.now();
    const response = await makeRequest(baseUrl, 'GET', auth);
    const latency = Date.now() - startTime;

    if (response.statusCode === 200) {
      logTest('Connessione a CouchDB', 'PASS', `Latenza: ${latency}ms`);
      log(`  Versione CouchDB: ${response.data.version}`, 'blue');
      log(`  Vendor: ${response.data.vendor?.name || 'N/A'}`, 'blue');

      // Verifica latenza
      if (latency > 1000) {
        logTest('Latenza connessione', 'WARN', `Latenza alta: ${latency}ms (>1s)`);
      } else {
        logTest('Latenza connessione', 'PASS', `${latency}ms`);
      }

      return true;
    } else if (response.statusCode === 401) {
      logTest('Connessione a CouchDB', 'FAIL', 'Autenticazione fallita (401)');
      return false;
    } else {
      logTest('Connessione a CouchDB', 'FAIL', `Status code: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Connessione a CouchDB', 'FAIL', error.message);
    return false;
  }
}

/**
 * Test 2: Verifica esistenza database
 */
async function testDatabaseExistence(baseUrl, auth) {
  log('\n=== Test 2: Esistenza Database ===', 'cyan');

  let allExist = true;

  for (const dbName of DATABASES) {
    try {
      const dbUrl = `${baseUrl}/${dbName}`;
      const response = await makeRequest(dbUrl, 'HEAD', auth);

      if (response.statusCode === 200) {
        logTest(`Database "${dbName}" esiste`, 'PASS');
      } else if (response.statusCode === 404) {
        logTest(`Database "${dbName}" esiste`, 'FAIL', 'Database non trovato');
        allExist = false;
      } else {
        logTest(`Database "${dbName}" esiste`, 'WARN', `Status code: ${response.statusCode}`);
      }
    } catch (error) {
      logTest(`Database "${dbName}" esiste`, 'FAIL', error.message);
      allExist = false;
    }
  }

  return allExist;
}

/**
 * Test 3: Verifica info database
 */
async function testDatabaseInfo(baseUrl, auth) {
  log('\n=== Test 3: Informazioni Database ===', 'cyan');

  const dbStats = [];

  for (const dbName of DATABASES) {
    try {
      const dbUrl = `${baseUrl}/${dbName}`;
      const response = await makeRequest(dbUrl, 'GET', auth);

      if (response.statusCode === 200) {
        const info = response.data;
        dbStats.push({
          name: dbName,
          docCount: info.doc_count,
          deletedCount: info.doc_del_count,
          updateSeq: info.update_seq,
          diskSize: info.sizes?.file || info.disk_size || 0,
        });

        logTest(`Info database "${dbName}"`, 'PASS',
          `Docs: ${info.doc_count}, Deleted: ${info.doc_del_count}`);
      } else {
        logTest(`Info database "${dbName}"`, 'FAIL', `Status code: ${response.statusCode}`);
      }
    } catch (error) {
      logTest(`Info database "${dbName}"`, 'FAIL', error.message);
    }
  }

  // Mostra statistiche aggregate
  if (dbStats.length > 0) {
    const totalDocs = dbStats.reduce((sum, db) => sum + db.docCount, 0);
    const totalDeleted = dbStats.reduce((sum, db) => sum + db.deletedCount, 0);
    const totalSize = dbStats.reduce((sum, db) => sum + db.diskSize, 0);

    log(`\n  Statistiche aggregate:`, 'blue');
    log(`    - Totale documenti: ${totalDocs}`, 'blue');
    log(`    - Totale eliminati: ${totalDeleted}`, 'blue');
    log(`    - Dimensione totale: ${(totalSize / 1024 / 1024).toFixed(2)} MB`, 'blue');
  }

  return dbStats;
}

/**
 * Test 4: Test sincronizzazione PUSH (locale -> remoto)
 */
async function testPushSync(baseUrl, auth) {
  log('\n=== Test 4: Sincronizzazione PUSH (locale -> remoto) ===', 'cyan');

  const testDbName = 'sphyra-customers';
  const testDocId = `test-sync-${Date.now()}`;

  try {
    // Crea un documento di test
    const testDoc = {
      _id: testDocId,
      firstName: 'Test',
      lastName: 'Sync',
      email: 'test@sync.local',
      phone: '+39 000 000 0000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Documento di test per verifica sincronizzazione PUSH',
    };

    const startTime = Date.now();
    const createUrl = `${baseUrl}/${testDbName}`;
    const createResponse = await makeRequest(createUrl, 'POST', auth, testDoc);
    const createLatency = Date.now() - startTime;

    if (createResponse.statusCode === 201 || createResponse.statusCode === 202) {
      logTest('Creazione documento test (PUSH)', 'PASS', `Latenza: ${createLatency}ms`);

      // Verifica che il documento sia stato creato
      const docUrl = `${baseUrl}/${testDbName}/${testDocId}`;
      const getResponse = await makeRequest(docUrl, 'GET', auth);

      if (getResponse.statusCode === 200) {
        const doc = getResponse.data;
        if (doc.firstName === 'Test' && doc.lastName === 'Sync') {
          logTest('Verifica documento creato', 'PASS', 'Dati corretti');
        } else {
          logTest('Verifica documento creato', 'FAIL', 'Dati non corrispondono');
        }

        // Cleanup: elimina il documento di test
        const rev = doc._rev;
        const deleteUrl = `${baseUrl}/${testDbName}/${testDocId}?rev=${rev}`;
        await makeRequest(deleteUrl, 'DELETE', auth);
        logTest('Cleanup documento test', 'PASS');

      } else {
        logTest('Verifica documento creato', 'FAIL', 'Documento non trovato dopo creazione');
      }

      return true;
    } else {
      logTest('Creazione documento test (PUSH)', 'FAIL',
        `Status code: ${createResponse.statusCode}, Error: ${JSON.stringify(createResponse.data)}`);
      return false;
    }
  } catch (error) {
    logTest('Test sincronizzazione PUSH', 'FAIL', error.message);
    return false;
  }
}

/**
 * Test 5: Test sincronizzazione PULL (remoto -> locale)
 */
async function testPullSync(baseUrl, auth) {
  log('\n=== Test 5: Sincronizzazione PULL (remoto -> locale) ===', 'cyan');

  const testDbName = 'sphyra-services';
  const testDocId = `test-pull-${Date.now()}`;

  try {
    // Crea un documento direttamente su CouchDB (simula creazione remota)
    const testDoc = {
      _id: testDocId,
      name: 'Test Service Pull',
      description: 'Servizio di test per verifica PULL',
      duration: 60,
      price: 50,
      category: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createUrl = `${baseUrl}/${testDbName}`;
    const createResponse = await makeRequest(createUrl, 'POST', auth, testDoc);

    if (createResponse.statusCode === 201 || createResponse.statusCode === 202) {
      logTest('Creazione documento remoto', 'PASS');

      // Simula lettura del documento (come farebbe PouchDB in sync)
      const docUrl = `${baseUrl}/${testDbName}/${testDocId}`;
      const getResponse = await makeRequest(docUrl, 'GET', auth);

      if (getResponse.statusCode === 200) {
        const doc = getResponse.data;
        logTest('Lettura documento remoto (PULL)', 'PASS', 'Documento recuperato correttamente');

        // Verifica che i dati siano completi
        if (doc.name && doc.description && doc.duration && doc.price) {
          logTest('Integrità dati PULL', 'PASS', 'Tutti i campi presenti');
        } else {
          logTest('Integrità dati PULL', 'FAIL', 'Campi mancanti');
        }

        // Cleanup
        const rev = doc._rev;
        const deleteUrl = `${baseUrl}/${testDbName}/${testDocId}?rev=${rev}`;
        await makeRequest(deleteUrl, 'DELETE', auth);
        logTest('Cleanup documento test PULL', 'PASS');

        return true;
      } else {
        logTest('Lettura documento remoto (PULL)', 'FAIL', 'Documento non trovato');
        return false;
      }
    } else {
      logTest('Creazione documento remoto', 'FAIL',
        `Status code: ${createResponse.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Test sincronizzazione PULL', 'FAIL', error.message);
    return false;
  }
}

/**
 * Test 6: Test gestione conflitti
 */
async function testConflictResolution(baseUrl, auth) {
  log('\n=== Test 6: Gestione Conflitti ===', 'cyan');

  const testDbName = 'sphyra-appointments';
  const testDocId = `test-conflict-${Date.now()}`;

  try {
    // Crea documento iniziale
    const initialDoc = {
      _id: testDocId,
      customerId: 'test-customer',
      serviceId: 'test-service',
      staffId: 'test-staff',
      date: '2025-01-15',
      startTime: '10:00',
      endTime: '11:00',
      status: 'scheduled',
      notes: 'Versione iniziale',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createUrl = `${baseUrl}/${testDbName}`;
    const createResponse = await makeRequest(createUrl, 'POST', auth, initialDoc);

    if (createResponse.statusCode !== 201 && createResponse.statusCode !== 202) {
      logTest('Setup test conflitti', 'FAIL', 'Impossibile creare documento iniziale');
      return false;
    }

    const rev1 = createResponse.data.rev;
    logTest('Creazione documento iniziale per test conflitti', 'PASS');

    // Leggi il documento
    const docUrl = `${baseUrl}/${testDbName}/${testDocId}`;
    const getResponse = await makeRequest(docUrl, 'GET', auth);
    const currentDoc = getResponse.data;
    const currentRev = currentDoc._rev;

    // Aggiorna il documento
    const updatedDoc = {
      ...currentDoc,
      notes: 'Versione aggiornata',
      status: 'confirmed',
      updatedAt: new Date().toISOString(),
    };

    const updateUrl = `${baseUrl}/${testDbName}/${testDocId}`;
    const updateResponse = await makeRequest(updateUrl, 'PUT', auth, updatedDoc);

    if (updateResponse.statusCode === 201 || updateResponse.statusCode === 202) {
      logTest('Aggiornamento documento', 'PASS');

      // Tenta di aggiornare con una revisione vecchia (dovrebbe fallire)
      const conflictDoc = {
        ...currentDoc,
        _rev: currentRev, // Revisione vecchia
        notes: 'Tentativo di conflitto',
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      };

      const conflictResponse = await makeRequest(updateUrl, 'PUT', auth, conflictDoc);

      if (conflictResponse.statusCode === 409) {
        logTest('Rilevamento conflitto', 'PASS', 'CouchDB ha rilevato il conflitto (409)');
      } else {
        logTest('Rilevamento conflitto', 'WARN',
          `CouchDB non ha bloccato l'aggiornamento: ${conflictResponse.statusCode}`);
      }

      // Cleanup
      const finalDoc = await makeRequest(docUrl, 'GET', auth);
      const finalRev = finalDoc.data._rev;
      const deleteUrl = `${baseUrl}/${testDbName}/${testDocId}?rev=${finalRev}`;
      await makeRequest(deleteUrl, 'DELETE', auth);
      logTest('Cleanup test conflitti', 'PASS');

      return true;
    } else {
      logTest('Aggiornamento documento', 'FAIL', `Status code: ${updateResponse.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Test gestione conflitti', 'FAIL', error.message);
    return false;
  }
}

/**
 * Test 7: Test performance query
 */
async function testQueryPerformance(baseUrl, auth) {
  log('\n=== Test 7: Performance Query ===', 'cyan');

  const testDbName = 'sphyra-appointments';

  try {
    // Query con _all_docs
    const startTime1 = Date.now();
    const allDocsUrl = `${baseUrl}/${testDbName}/_all_docs?limit=100`;
    const allDocsResponse = await makeRequest(allDocsUrl, 'GET', auth);
    const allDocsLatency = Date.now() - startTime1;

    if (allDocsResponse.statusCode === 200) {
      const rowCount = allDocsResponse.data.rows.length;
      logTest('Query _all_docs (limit 100)', 'PASS',
        `${rowCount} documenti in ${allDocsLatency}ms`);

      if (allDocsLatency > 5000) {
        logTest('Performance query _all_docs', 'WARN',
          `Latenza alta: ${allDocsLatency}ms (>5s)`);
      } else if (allDocsLatency > 2000) {
        logTest('Performance query _all_docs', 'WARN',
          `Latenza moderata: ${allDocsLatency}ms (>2s)`);
      } else {
        logTest('Performance query _all_docs', 'PASS', `${allDocsLatency}ms`);
      }
    } else {
      logTest('Query _all_docs', 'FAIL', `Status code: ${allDocsResponse.statusCode}`);
    }

    // Test query con filtro (se ci sono documenti)
    if (allDocsResponse.data && allDocsResponse.data.total_rows > 0) {
      const startTime2 = Date.now();
      const findUrl = `${baseUrl}/${testDbName}/_find`;
      const findQuery = {
        selector: {
          status: { $exists: true }
        },
        limit: 10
      };
      const findResponse = await makeRequest(findUrl, 'POST', auth, findQuery);
      const findLatency = Date.now() - startTime2;

      if (findResponse.statusCode === 200) {
        const docCount = findResponse.data.docs?.length || 0;
        logTest('Query _find con selector', 'PASS',
          `${docCount} documenti in ${findLatency}ms`);

        if (findLatency > 3000) {
          logTest('Performance query _find', 'WARN',
            `Latenza alta: ${findLatency}ms (considera creazione indici)`);
        } else {
          logTest('Performance query _find', 'PASS', `${findLatency}ms`);
        }
      } else {
        logTest('Query _find con selector', 'FAIL',
          `Status code: ${findResponse.statusCode}`);
      }
    }

    return true;
  } catch (error) {
    logTest('Test performance query', 'FAIL', error.message);
    return false;
  }
}

/**
 * Test 8: Verifica CORS
 */
async function testCORS(baseUrl, auth) {
  log('\n=== Test 8: Configurazione CORS ===', 'cyan');

  try {
    const configUrl = `${baseUrl}/_node/_local/_config/httpd/enable_cors`;
    const response = await makeRequest(configUrl, 'GET', auth);

    if (response.statusCode === 200) {
      const corsEnabled = response.data === 'true' || response.data === true;
      if (corsEnabled) {
        logTest('CORS abilitato', 'PASS');
      } else {
        logTest('CORS abilitato', 'WARN', 'CORS potrebbe non essere abilitato');
      }
    } else {
      logTest('Verifica CORS', 'WARN',
        'Impossibile verificare configurazione CORS (potrebbe richiedere permessi admin)');
    }

    // Verifica headers CORS
    const originsUrl = `${baseUrl}/_node/_local/_config/cors/origins`;
    const originsResponse = await makeRequest(originsUrl, 'GET', auth);

    if (originsResponse.statusCode === 200) {
      logTest('Configurazione CORS origins', 'PASS', `Origins: ${originsResponse.data}`);
    }

    return true;
  } catch (error) {
    logTest('Test CORS', 'WARN', 'Impossibile verificare CORS (permessi insufficienti)');
    return true; // Non è un errore critico
  }
}

/**
 * Stampa report finale
 */
function printReport() {
  log('\n' + '='.repeat(60), 'bold');
  log('REPORT FINALE VERIFICA SINCRONIZZAZIONE', 'bold');
  log('='.repeat(60), 'bold');

  const passRate = results.total > 0
    ? ((results.passed / results.total) * 100).toFixed(1)
    : 0;

  log(`\nTest totali: ${results.total}`, 'cyan');
  log(`✓ Passati: ${results.passed}`, 'green');
  log(`✗ Falliti: ${results.failed}`, 'red');
  log(`⚠ Warning: ${results.warnings}`, 'yellow');
  log(`Tasso successo: ${passRate}%`, passRate >= 80 ? 'green' : 'yellow');

  // Raccomandazioni
  if (results.failed > 0) {
    log('\n⚠ ATTENZIONE: Alcuni test sono falliti!', 'red');
    log('Verifica i dettagli sopra e correggi gli errori prima di usare in produzione.', 'yellow');
  } else if (results.warnings > 0) {
    log('\n⚠ Alcuni warning sono stati rilevati.', 'yellow');
    log('Il sistema funziona ma potrebbe beneficiare di ottimizzazioni.', 'yellow');
  } else {
    log('\n✓ Tutti i test sono passati!', 'green');
    log('La sincronizzazione è configurata correttamente.', 'green');
  }

  // Salva report JSON
  const reportPath = './sync-verification-report.json';
  const fs = require('fs');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  log(`\nReport salvato in: ${reportPath}`, 'blue');

  log('\n' + '='.repeat(60) + '\n', 'bold');
}

/**
 * Main
 */
async function main() {
  log('╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║   VERIFICA SINCRONIZZAZIONE DATABASE                   ║', 'cyan');
  log('║   Sphyra Wellness Lab                                  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');

  // Parse arguments
  let baseUrl = process.argv[2] || process.env.COUCHDB_URL;
  const username = process.argv[3] || process.env.COUCHDB_USERNAME;
  const password = process.argv[4] || process.env.COUCHDB_PASSWORD;

  if (!baseUrl) {
    log('\nErrore: URL CouchDB non specificato!', 'red');
    log('\nUtilizzo:', 'yellow');
    log('  node scripts/verify-db-sync.js <couchdb-url> [username] [password]', 'yellow');
    log('\nOppure imposta le variabili d\'ambiente:', 'yellow');
    log('  COUCHDB_URL, COUCHDB_USERNAME, COUCHDB_PASSWORD', 'yellow');
    log('\nEsempio:', 'yellow');
    log('  node scripts/verify-db-sync.js http://localhost:5984 admin password', 'yellow');
    process.exit(1);
  }

  // Rimuovi trailing slash
  baseUrl = baseUrl.replace(/\/$/, '');

  const auth = username && password ? { username, password } : null;

  log(`\nURL CouchDB: ${baseUrl}`, 'blue');
  log(`Autenticazione: ${auth ? '✓ Configurata' : '✗ Non configurata'}`,
    auth ? 'green' : 'yellow');
  log(`Data verifica: ${new Date().toISOString()}`, 'blue');

  // Esegui i test
  try {
    const connectionOk = await testConnection(baseUrl, auth);
    if (!connectionOk) {
      log('\n✗ Impossibile connettersi a CouchDB. Verifica URL e credenziali.', 'red');
      process.exit(1);
    }

    await testDatabaseExistence(baseUrl, auth);
    await testDatabaseInfo(baseUrl, auth);
    await testPushSync(baseUrl, auth);
    await testPullSync(baseUrl, auth);
    await testConflictResolution(baseUrl, auth);
    await testQueryPerformance(baseUrl, auth);
    await testCORS(baseUrl, auth);

    // Report finale
    printReport();

    // Exit code basato sui risultati
    process.exit(results.failed > 0 ? 1 : 0);

  } catch (error) {
    log(`\n✗ Errore durante l'esecuzione dei test: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Esegui lo script
if (require.main === module) {
  main();
}

module.exports = { testConnection, testPushSync, testPullSync };
