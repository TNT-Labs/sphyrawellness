#!/usr/bin/env node

/**
 * CouchDB Setup Script
 *
 * Questo script crea automaticamente tutti i database necessari per
 * l'applicazione Sphyra Wellness su un server CouchDB.
 *
 * Utilizzo:
 *   node scripts/setup-couchdb.js <couchdb-url> [username] [password]
 *
 * Esempi:
 *   node scripts/setup-couchdb.js http://localhost:5984
 *   node scripts/setup-couchdb.js http://localhost:5984 admin password
 *   node scripts/setup-couchdb.js https://user.cloudant.com admin password
 */

const http = require('http');
const https = require('https');

// Database da creare
const DATABASES = [
  'sphyra-customers',
  'sphyra-services',
  'sphyra-staff',
  'sphyra-appointments',
  'sphyra-payments',
  'sphyra-reminders',
  'sphyra-staff-roles',
  'sphyra-service-categories',
];

// Colori per output console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Effettua una richiesta HTTP/HTTPS
 */
function makeRequest(url, method = 'GET', auth = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Aggiungi autenticazione se fornita
    if (auth) {
      const authString = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      options.headers['Authorization'] = `Basic ${authString}`;
    }

    const protocol = urlObj.protocol === 'https:' ? https : http;

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Verifica connessione al server CouchDB
 */
async function testConnection(baseUrl, auth) {
  try {
    log('\n🔍 Verifico connessione a CouchDB...', 'cyan');
    const response = await makeRequest(baseUrl, 'GET', auth);

    if (response.statusCode === 200 && response.data.couchdb) {
      log(`✅ Connesso a CouchDB ${response.data.version}`, 'green');
      return true;
    } else {
      log('❌ Risposta inattesa dal server', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Errore di connessione: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Verifica se un database esiste
 */
async function databaseExists(baseUrl, dbName, auth) {
  try {
    const response = await makeRequest(`${baseUrl}/${dbName}`, 'HEAD', auth);
    return response.statusCode === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Crea un database
 */
async function createDatabase(baseUrl, dbName, auth) {
  try {
    const response = await makeRequest(`${baseUrl}/${dbName}`, 'PUT', auth);

    if (response.statusCode === 201) {
      log(`  ✅ Database "${dbName}" creato`, 'green');
      return true;
    } else if (response.statusCode === 412) {
      log(`  ⚠️  Database "${dbName}" esiste già`, 'yellow');
      return true;
    } else {
      log(`  ❌ Errore creazione "${dbName}": ${response.data.reason || 'Sconosciuto'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`  ❌ Errore creazione "${dbName}": ${error.message}`, 'red');
    return false;
  }
}

/**
 * Setup completo di tutti i database
 */
async function setupDatabases(baseUrl, auth) {
  log('\n📦 Creazione database...', 'cyan');

  let successCount = 0;
  let existingCount = 0;
  let errorCount = 0;

  for (const dbName of DATABASES) {
    const exists = await databaseExists(baseUrl, dbName, auth);

    if (exists) {
      log(`  ✓ Database "${dbName}" già esistente`, 'yellow');
      existingCount++;
    } else {
      const created = await createDatabase(baseUrl, dbName, auth);
      if (created) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    // Piccola pausa per non sovraccaricare il server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Riepilogo
  log('\n📊 Riepilogo:', 'cyan');
  log(`  ✅ Creati: ${successCount}`, successCount > 0 ? 'green' : 'reset');
  log(`  ⚠️  Già esistenti: ${existingCount}`, existingCount > 0 ? 'yellow' : 'reset');
  log(`  ❌ Errori: ${errorCount}`, errorCount > 0 ? 'red' : 'reset');
  log(`  📦 Totale database: ${DATABASES.length}`, 'blue');

  return errorCount === 0;
}

/**
 * Verifica configurazione CORS (opzionale)
 */
async function checkCORS(baseUrl, auth) {
  try {
    log('\n🔒 Verifico configurazione CORS...', 'cyan');
    const response = await makeRequest(`${baseUrl}/_node/_local/_config/httpd/enable_cors`, 'GET', auth);

    if (response.statusCode === 200) {
      const corsEnabled = response.data === 'true' || response.data === true;
      if (corsEnabled) {
        log('  ✅ CORS abilitato', 'green');
      } else {
        log('  ⚠️  CORS non abilitato (potrebbe essere necessario per accesso web)', 'yellow');
        log('  💡 Per abilitare CORS, esegui: curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/httpd/enable_cors -d \'"true"\'', 'blue');
      }
    }
  } catch (error) {
    log('  ℹ️  Impossibile verificare CORS (richiede permessi admin)', 'yellow');
  }
}

/**
 * Main function
 */
async function main() {
  // Parse argomenti
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log('\n🗄️  CouchDB Setup Script - Sphyra Wellness', 'cyan');
    log('\nUtilizzo:', 'blue');
    log('  node scripts/setup-couchdb.js <couchdb-url> [username] [password]');
    log('\nEsempi:', 'blue');
    log('  node scripts/setup-couchdb.js http://localhost:5984');
    log('  node scripts/setup-couchdb.js http://localhost:5984 admin password');
    log('  node scripts/setup-couchdb.js https://user.cloudant.com admin password');
    log('\nDatabase che verranno creati:', 'blue');
    DATABASES.forEach(db => log(`  - ${db}`, 'cyan'));
    process.exit(0);
  }

  const baseUrl = args[0].replace(/\/$/, ''); // Rimuovi trailing slash
  const username = args[1];
  const password = args[2];

  const auth = username && password ? { username, password } : null;

  log('\n═══════════════════════════════════════════', 'cyan');
  log('  🗄️  CouchDB Setup - Sphyra Wellness', 'cyan');
  log('═══════════════════════════════════════════', 'cyan');
  log(`\n📍 Server: ${baseUrl}`);
  log(`👤 Utente: ${username || 'Nessuna autenticazione'}`);
  log(`🔐 Password: ${password ? '***' : 'Nessuna'}`);

  // Test connessione
  const connected = await testConnection(baseUrl, auth);
  if (!connected) {
    log('\n❌ Impossibile connettersi al server CouchDB', 'red');
    log('💡 Verifica che:', 'yellow');
    log('  - Il server CouchDB sia in esecuzione', 'yellow');
    log('  - L\'URL sia corretto', 'yellow');
    log('  - Le credenziali siano corrette (se richieste)', 'yellow');
    process.exit(1);
  }

  // Setup database
  const success = await setupDatabases(baseUrl, auth);

  // Verifica CORS
  await checkCORS(baseUrl, auth);

  // Risultato finale
  log('\n═══════════════════════════════════════════', 'cyan');
  if (success) {
    log('  ✅ Setup completato con successo!', 'green');
    log('═══════════════════════════════════════════', 'cyan');
    log('\n🚀 Prossimi passi:', 'blue');
    log('  1. Configura l\'URL CouchDB nelle impostazioni dell\'app');
    log('  2. Inserisci username e password (se richiesti)');
    log('  3. Abilita la sincronizzazione');
    log('  4. Verifica che la sincronizzazione funzioni correttamente\n');
    process.exit(0);
  } else {
    log('  ⚠️  Setup completato con alcuni errori', 'yellow');
    log('═══════════════════════════════════════════', 'cyan');
    log('\n💡 Verifica i permessi dell\'utente e riprova\n', 'yellow');
    process.exit(1);
  }
}

// Esegui script
main().catch((error) => {
  log(`\n❌ Errore imprevisto: ${error.message}`, 'red');
  process.exit(1);
});
