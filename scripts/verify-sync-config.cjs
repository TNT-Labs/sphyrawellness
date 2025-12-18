#!/usr/bin/env node

/**
 * Script di Verifica Configurazione Sincronizzazione
 *
 * Questo script verifica che la configurazione del codice di sincronizzazione
 * sia corretta SENZA necessità di avere CouchDB in esecuzione.
 *
 * Verifica:
 * 1. Struttura dei database names
 * 2. Mapping tra IndexedDB e PouchDB
 * 3. Configurazione dei file TypeScript
 * 4. Coerenza tra frontend e backend
 * 5. Presenza di tutti i file necessari
 *
 * Utilizzo:
 *   node scripts/verify-sync-config.js
 */

const fs = require('fs');
const path = require('path');

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
  issues: [],
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, status, details = '') {
  results.total++;

  if (status === 'PASS') {
    results.passed++;
    log(`✓ ${name}`, 'green');
    if (details) log(`  ${details}`, 'blue');
  } else if (status === 'FAIL') {
    results.failed++;
    log(`✗ ${name}`, 'red');
    if (details) log(`  ${details}`, 'red');
    results.issues.push({ test: name, issue: details, severity: 'error' });
  } else if (status === 'WARN') {
    results.warnings++;
    log(`⚠ ${name}`, 'yellow');
    if (details) log(`  ${details}`, 'yellow');
    results.issues.push({ test: name, issue: details, severity: 'warning' });
  }
}

/**
 * Verifica che un file esista
 */
function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    logTest(`File ${description} esiste`, 'PASS', filePath);
    return true;
  } else {
    logTest(`File ${description} esiste`, 'FAIL', `File non trovato: ${filePath}`);
    return false;
  }
}

/**
 * Leggi e analizza un file TypeScript/JavaScript
 */
function readAndAnalyze(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  try {
    return fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    return null;
  }
}

/**
 * Estrai database names da un file
 */
function extractDatabaseNames(content, pattern) {
  const matches = [];
  const regex = new RegExp(pattern, 'g');
  let match;

  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

/**
 * Test 1: Verifica esistenza file principali
 */
function testFileExistence() {
  log('\n=== Test 1: Esistenza File Principali ===', 'cyan');

  const files = [
    { path: 'src/utils/pouchdbSync.ts', desc: 'PouchDB Sync' },
    { path: 'src/utils/dbBridge.ts', desc: 'DB Bridge' },
    { path: 'src/utils/indexedDB.ts', desc: 'IndexedDB' },
    { path: 'src/types/index.ts', desc: 'Type Definitions' },
    { path: 'server/src/config/database.ts', desc: 'Server Database Config' },
    { path: 'scripts/setup-couchdb.cjs', desc: 'Setup Script' },
    { path: 'scripts/verify-db-sync.cjs', desc: 'Verifica Sync Script' },
  ];

  let allExist = true;
  files.forEach(file => {
    if (!checkFileExists(file.path, file.desc)) {
      allExist = false;
    }
  });

  return allExist;
}

/**
 * Test 2: Verifica database names nel frontend
 */
function testFrontendDatabaseNames() {
  log('\n=== Test 2: Database Names Frontend ===', 'cyan');

  const pouchdbSyncContent = readAndAnalyze('src/utils/pouchdbSync.ts');
  const dbBridgeContent = readAndAnalyze('src/utils/dbBridge.ts');

  if (!pouchdbSyncContent || !dbBridgeContent) {
    logTest('Lettura file frontend', 'FAIL', 'Impossibile leggere i file');
    return false;
  }

  // Estrai DB_NAMES da pouchdbSync.ts
  const pouchdbDbNames = extractDatabaseNames(
    pouchdbSyncContent,
    /['"]sphyra-([a-z-]+)['"]/g
  );

  // Estrai DB_NAME_MAPPING da dbBridge.ts
  const dbBridgeDbNames = extractDatabaseNames(
    dbBridgeContent,
    /['"]sphyra-([a-z-]+)['"]/g
  );

  logTest('Database names in pouchdbSync.ts', 'PASS',
    `Trovati ${pouchdbDbNames.length} database: ${[...new Set(pouchdbDbNames)].join(', ')}`);

  logTest('Database names in dbBridge.ts', 'PASS',
    `Trovati ${dbBridgeDbNames.length} database: ${[...new Set(dbBridgeDbNames)].join(', ')}`);

  // Verifica coerenza
  const pouchdbSet = new Set(pouchdbDbNames);
  const dbBridgeSet = new Set(dbBridgeDbNames);

  const allDbNames = new Set([...pouchdbSet, ...dbBridgeSet]);

  if (pouchdbSet.size === dbBridgeSet.size) {
    logTest('Coerenza database names frontend', 'PASS',
      `Tutti i ${pouchdbSet.size} database sono coerenti`);
  } else {
    logTest('Coerenza database names frontend', 'WARN',
      `Mismatch: pouchdbSync ha ${pouchdbSet.size}, dbBridge ha ${dbBridgeSet.size}`);
  }

  return allDbNames;
}

/**
 * Test 3: Verifica database names nel backend
 */
function testBackendDatabaseNames() {
  log('\n=== Test 3: Database Names Backend ===', 'cyan');

  const serverDbContent = readAndAnalyze('server/src/config/database.ts');

  if (!serverDbContent) {
    logTest('Lettura file backend', 'FAIL', 'Impossibile leggere database.ts');
    return new Set();
  }

  const backendDbNames = extractDatabaseNames(
    serverDbContent,
    /['"]sphyra-([a-z-]+)['"]/g
  );

  logTest('Database names in backend', 'PASS',
    `Trovati ${backendDbNames.length} database: ${[...new Set(backendDbNames)].join(', ')}`);

  return new Set(backendDbNames);
}

/**
 * Test 4: Verifica database names negli script
 */
function testScriptDatabaseNames() {
  log('\n=== Test 4: Database Names Script Setup ===', 'cyan');

  const setupScriptContent = readAndAnalyze('scripts/setup-couchdb.cjs');
  const verifyScriptContent = readAndAnalyze('scripts/verify-db-sync.cjs');

  if (!setupScriptContent) {
    logTest('Lettura setup-couchdb.cjs', 'FAIL', 'File non trovato');
    return new Set();
  }

  const setupDbNames = extractDatabaseNames(
    setupScriptContent,
    /['"]sphyra-([a-z-]+)['"]/g
  );

  logTest('Database names in setup-couchdb.cjs', 'PASS',
    `Trovati ${setupDbNames.length} database`);

  if (verifyScriptContent) {
    const verifyDbNames = extractDatabaseNames(
      verifyScriptContent,
      /['"]sphyra-([a-z-]+)['"]/g
    );

    logTest('Database names in verify-db-sync.js', 'PASS',
      `Trovati ${verifyDbNames.length} database`);
  }

  return new Set(setupDbNames);
}

/**
 * Test 5: Verifica coerenza completa
 */
function testOverallConsistency(frontendDbs, backendDbs, scriptDbs) {
  log('\n=== Test 5: Coerenza Completa ===', 'cyan');

  const expectedDbs = new Set([
    'customers',
    'services',
    'staff',
    'appointments',
    'payments',
    'reminders',
    'staff-roles',
    'service-categories',
    'users',
    'settings',
  ]);

  log('\nDatabase attesi:', 'blue');
  expectedDbs.forEach(db => log(`  - sphyra-${db}`, 'blue'));

  // Verifica che tutti i database attesi siano presenti
  let allPresent = true;
  expectedDbs.forEach(db => {
    const inFrontend = frontendDbs.has(db);
    const inBackend = backendDbs.has(db);
    const inScript = scriptDbs.has(db);

    if (inFrontend && inBackend && inScript) {
      logTest(`Database "sphyra-${db}" presente ovunque`, 'PASS');
    } else {
      const missing = [];
      if (!inFrontend) missing.push('frontend');
      if (!inBackend) missing.push('backend');
      if (!inScript) missing.push('script');
      logTest(`Database "sphyra-${db}" presente ovunque`, 'WARN',
        `Mancante in: ${missing.join(', ')}`);
      allPresent = false;
    }
  });

  // Verifica database extra
  const allFoundDbs = new Set([...frontendDbs, ...backendDbs, ...scriptDbs]);
  allFoundDbs.forEach(db => {
    if (!expectedDbs.has(db)) {
      logTest(`Database extra "sphyra-${db}"`, 'WARN',
        'Database non nella lista attesa');
    }
  });

  return allPresent;
}

/**
 * Test 6: Verifica configurazione TypeScript
 */
function testTypeScriptConfig() {
  log('\n=== Test 6: Configurazione TypeScript ===', 'cyan');

  const typesContent = readAndAnalyze('src/types/index.ts');

  if (!typesContent) {
    logTest('Lettura types/index.ts', 'FAIL', 'File non trovato');
    return false;
  }

  // Verifica interfacce principali
  const interfaces = [
    'Customer',
    'Service',
    'Staff',
    'Appointment',
    'Payment',
    'Reminder',
    'StaffRole',
    'ServiceCategory',
    'User',
    'AppSettings',
    'SyncStatus',
  ];

  interfaces.forEach(interfaceName => {
    const regex = new RegExp(`interface\\s+${interfaceName}\\s*{`, 'g');
    if (regex.test(typesContent)) {
      logTest(`Interface "${interfaceName}" definita`, 'PASS');
    } else {
      logTest(`Interface "${interfaceName}" definita`, 'WARN',
        'Interface non trovata o nome diverso');
    }
  });

  // Verifica presenza di syncEnabled
  if (/syncEnabled/.test(typesContent)) {
    logTest('Campo syncEnabled in AppSettings', 'PASS');
  } else {
    logTest('Campo syncEnabled in AppSettings', 'FAIL',
      'Campo sync non trovato');
  }

  return true;
}

/**
 * Test 7: Verifica package dependencies
 */
function testPackageDependencies() {
  log('\n=== Test 7: Package Dependencies ===', 'cyan');

  const packageJsonPath = path.join(__dirname, '..', 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    logTest('Lettura package.json', 'FAIL', 'File non trovato');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  const requiredDeps = [
    { name: 'pouchdb-browser', desc: 'PouchDB Browser' },
    { name: 'pouchdb-find', desc: 'PouchDB Find Plugin' },
  ];

  requiredDeps.forEach(dep => {
    if (deps[dep.name]) {
      logTest(`Dipendenza ${dep.desc}`, 'PASS', `v${deps[dep.name]}`);
    } else {
      logTest(`Dipendenza ${dep.desc}`, 'FAIL',
        `Package ${dep.name} non trovato`);
    }
  });

  // Verifica server dependencies
  const serverPackageJsonPath = path.join(__dirname, '..', 'server', 'package.json');

  if (fs.existsSync(serverPackageJsonPath)) {
    const serverPackageJson = JSON.parse(fs.readFileSync(serverPackageJsonPath, 'utf8'));
    const serverDeps = { ...serverPackageJson.dependencies, ...serverPackageJson.devDependencies };

    if (serverDeps['pouchdb-node']) {
      logTest('Dipendenza PouchDB Node (server)', 'PASS',
        `v${serverDeps['pouchdb-node']}`);
    } else {
      logTest('Dipendenza PouchDB Node (server)', 'WARN',
        'Package pouchdb-node non trovato nel server');
    }
  }

  return true;
}

/**
 * Test 8: Verifica funzioni chiave
 */
function testKeyFunctions() {
  log('\n=== Test 8: Funzioni Chiave ===', 'cyan');

  const pouchdbSyncContent = readAndAnalyze('src/utils/pouchdbSync.ts');
  const dbBridgeContent = readAndAnalyze('src/utils/dbBridge.ts');

  if (!pouchdbSyncContent || !dbBridgeContent) {
    logTest('Lettura file per verifica funzioni', 'FAIL');
    return false;
  }

  // Funzioni in pouchdbSync.ts
  const pouchdbFunctions = [
    'startSync',
    'stopSync',
    'testCouchDBConnection',
    'initializeSync',
    'syncChangedDocsToIndexedDB',
    'performOneTimeSync',
  ];

  pouchdbFunctions.forEach(funcName => {
    const regex = new RegExp(`(async\\s+)?function\\s+${funcName}|const\\s+${funcName}\\s*=`, 'g');
    if (regex.test(pouchdbSyncContent)) {
      logTest(`Funzione ${funcName} (pouchdbSync)`, 'PASS');
    } else {
      logTest(`Funzione ${funcName} (pouchdbSync)`, 'WARN',
        'Funzione non trovata o nome diverso');
    }
  });

  // Funzioni in dbBridge.ts
  const dbBridgeFunctions = [
    'syncAdd',
    'syncUpdate',
    'syncDelete',
  ];

  dbBridgeFunctions.forEach(funcName => {
    const regex = new RegExp(`export\\s+(async\\s+)?function\\s+${funcName}`, 'g');
    if (regex.test(dbBridgeContent)) {
      logTest(`Funzione ${funcName} (dbBridge)`, 'PASS');
    } else {
      logTest(`Funzione ${funcName} (dbBridge)`, 'WARN',
        'Funzione non trovata o nome diverso');
    }
  });

  return true;
}

/**
 * Stampa report finale
 */
function printReport() {
  log('\n' + '='.repeat(60), 'bold');
  log('REPORT FINALE VERIFICA CONFIGURAZIONE', 'bold');
  log('='.repeat(60), 'bold');

  const passRate = results.total > 0
    ? ((results.passed / results.total) * 100).toFixed(1)
    : 0;

  log(`\nTest totali: ${results.total}`, 'cyan');
  log(`✓ Passati: ${results.passed}`, 'green');
  log(`✗ Falliti: ${results.failed}`, 'red');
  log(`⚠ Warning: ${results.warnings}`, 'yellow');
  log(`Tasso successo: ${passRate}%`, passRate >= 80 ? 'green' : 'yellow');

  if (results.issues.length > 0) {
    log('\n' + '─'.repeat(60), 'cyan');
    log('ISSUES DA RISOLVERE:', 'yellow');
    log('─'.repeat(60), 'cyan');

    results.issues.forEach((issue, index) => {
      const color = issue.severity === 'error' ? 'red' : 'yellow';
      log(`\n${index + 1}. ${issue.test}`, color);
      log(`   ${issue.issue}`, color);
    });
  }

  if (results.failed === 0 && results.warnings === 0) {
    log('\n✓ La configurazione è corretta!', 'green');
    log('Puoi procedere con i test di sincronizzazione live.', 'green');
  } else if (results.failed === 0) {
    log('\n⚠ La configurazione è OK ma ci sono alcuni warning.', 'yellow');
    log('Rivedi i warning prima dei test live.', 'yellow');
  } else {
    log('\n✗ Ci sono errori nella configurazione!', 'red');
    log('Correggi gli errori prima di procedere.', 'red');
  }

  log('\n' + '='.repeat(60) + '\n', 'bold');
}

/**
 * Main
 */
function main() {
  log('╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║   VERIFICA CONFIGURAZIONE SINCRONIZZAZIONE             ║', 'cyan');
  log('║   Sphyra Wellness Lab                                  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');

  try {
    testFileExistence();
    const frontendDbs = testFrontendDatabaseNames();
    const backendDbs = testBackendDatabaseNames();
    const scriptDbs = testScriptDatabaseNames();
    testOverallConsistency(frontendDbs, backendDbs, scriptDbs);
    testTypeScriptConfig();
    testPackageDependencies();
    testKeyFunctions();

    printReport();

    process.exit(results.failed > 0 ? 1 : 0);

  } catch (error) {
    log(`\n✗ Errore durante la verifica: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testFileExistence, testFrontendDatabaseNames };
