#!/usr/bin/env node

/**
 * CouchDB Reset Script
 *
 * Questo script CANCELLA tutti i database CouchDB dell'applicazione Sphyra Wellness Lab.
 * ⚠️ ATTENZIONE: Questa operazione è IRREVERSIBILE!
 *
 * Utilizzo:
 *   node scripts/reset-couchdb.js <couchdb-url> [username] [password]
 *
 * Esempi:
 *   node scripts/reset-couchdb.js https://192.168.1.95/db admin password
 *   node scripts/reset-couchdb.js http://localhost:5984 admin password
 */

const http = require('http');
const https = require('https');
const readline = require('readline');

// Database da cancellare
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
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Chiede conferma all'utente
 */
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${question}${colors.reset} `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'si' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 's' || answer.toLowerCase() === 'y');
    });
  });
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
      // Ignora certificati self-signed per HTTPS
      rejectUnauthorized: false,
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
 * Conta i documenti in un database
 */
async function countDocuments(baseUrl, dbName, auth) {
  try {
    const response = await makeRequest(`${baseUrl}/${dbName}`, 'GET', auth);
    if (response.statusCode === 200 && response.data.doc_count !== undefined) {
      return response.data.doc_count;
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Cancella un database
 */
async function deleteDatabase(baseUrl, dbName, auth) {
  try {
    const response = await makeRequest(`${baseUrl}/${dbName}`, 'DELETE', auth);

    if (response.statusCode === 200) {
      log(`  ✅ Database "${dbName}" cancellato`, 'green');
      return true;
    } else if (response.statusCode === 404) {
      log(`  ℹ️  Database "${dbName}" non esiste`, 'blue');
      return true;
    } else {
      log(`  ❌ Errore cancellazione "${dbName}": ${response.data.reason || 'Sconosciuto'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`  ❌ Errore cancellazione "${dbName}": ${error.message}`, 'red');
    return false;
  }
}

/**
 * Ricrea un database vuoto
 */
async function createDatabase(baseUrl, dbName, auth) {
  try {
    const response = await makeRequest(`${baseUrl}/${dbName}`, 'PUT', auth);

    if (response.statusCode === 201) {
      log(`  ✅ Database "${dbName}" ricreato (vuoto)`, 'green');
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
 * Main function
 */
async function main() {
  // Parse argomenti
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log('\n🗑️  CouchDB Reset Script - Sphyra Wellness Lab', 'magenta');
    log('\n⚠️  ATTENZIONE: Questo script CANCELLA tutti i database!', 'red');
    log('\nUtilizzo:', 'blue');
    log('  node scripts/reset-couchdb.js <couchdb-url> [username] [password]');
    log('\nEsempi:', 'blue');
    log('  node scripts/reset-couchdb.js https://192.168.1.95/db admin password');
    log('  node scripts/reset-couchdb.js http://localhost:5984 admin password');
    log('\nDatabase che verranno cancellati:', 'blue');
    DATABASES.forEach(db => log(`  - ${db}`, 'cyan'));
    log('\n');
    process.exit(0);
  }

  const baseUrl = args[0].replace(/\/$/, ''); // Rimuovi trailing slash
  const username = args[1];
  const password = args[2];

  const auth = username && password ? { username, password } : null;

  log('\n═══════════════════════════════════════════', 'magenta');
  log('  🗑️  CouchDB RESET - Sphyra Wellness Lab', 'magenta');
  log('═══════════════════════════════════════════', 'magenta');
  log(`\n📍 Server: ${baseUrl}`);
  log(`👤 Utente: ${username || 'Nessuna autenticazione'}`);

  // Verifica database esistenti e conta documenti
  log('\n🔍 Analizzo database esistenti...', 'cyan');
  let totalDocs = 0;
  for (const dbName of DATABASES) {
    const exists = await databaseExists(baseUrl, dbName, auth);
    if (exists) {
      const docCount = await countDocuments(baseUrl, dbName, auth);
      totalDocs += docCount;
      if (docCount > 0) {
        log(`  📦 ${dbName}: ${docCount} documenti`, 'yellow');
      } else {
        log(`  📦 ${dbName}: vuoto`, 'blue');
      }
    } else {
      log(`  📦 ${dbName}: non esiste`, 'blue');
    }
  }

  if (totalDocs > 0) {
    log(`\n⚠️  TOTALE DOCUMENTI DA CANCELLARE: ${totalDocs}`, 'red');
  } else {
    log('\nℹ️  Nessun documento presente nei database', 'blue');
  }

  // Chiedi conferma PRIMA di procedere
  log('\n⚠️  ATTENZIONE: Questa operazione è IRREVERSIBILE!', 'red');
  log('⚠️  Tutti i dati nei database CouchDB verranno CANCELLATI!', 'red');
  const confirmed = await askConfirmation('\nSei SICURO di voler procedere? (si/no): ');

  if (!confirmed) {
    log('\n❌ Operazione annullata dall\'utente', 'yellow');
    log('✅ Nessun database è stato modificato\n', 'green');
    process.exit(0);
  }

  // Seconda conferma per sicurezza
  const doubleConfirm = await askConfirmation('\n⚠️  ULTIMA CONFERMA - Procedere con la cancellazione? (si/no): ');

  if (!doubleConfirm) {
    log('\n❌ Operazione annullata dall\'utente', 'yellow');
    log('✅ Nessun database è stato modificato\n', 'green');
    process.exit(0);
  }

  // Cancella tutti i database
  log('\n🗑️  Cancellazione database in corso...', 'red');
  let deletedCount = 0;
  let errorCount = 0;

  for (const dbName of DATABASES) {
    const deleted = await deleteDatabase(baseUrl, dbName, auth);
    if (deleted) {
      deletedCount++;
    } else {
      errorCount++;
    }
    // Piccola pausa
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Ricrea database vuoti
  log('\n🔨 Ricreo database vuoti...', 'cyan');
  let createdCount = 0;

  for (const dbName of DATABASES) {
    const created = await createDatabase(baseUrl, dbName, auth);
    if (created) {
      createdCount++;
    } else {
      errorCount++;
    }
    // Piccola pausa
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Riepilogo
  log('\n═══════════════════════════════════════════', 'cyan');
  log('  📊 RIEPILOGO OPERAZIONE', 'cyan');
  log('═══════════════════════════════════════════', 'cyan');
  log(`\n  🗑️  Database cancellati: ${deletedCount}`, deletedCount > 0 ? 'green' : 'reset');
  log(`  🔨 Database ricreati: ${createdCount}`, createdCount > 0 ? 'green' : 'reset');
  log(`  ❌ Errori: ${errorCount}`, errorCount > 0 ? 'red' : 'green');

  if (errorCount === 0 && createdCount === DATABASES.length) {
    log('\n═══════════════════════════════════════════', 'green');
    log('  ✅ RESET COMPLETATO CON SUCCESSO!', 'green');
    log('═══════════════════════════════════════════', 'green');
    log('\n🚀 Prossimi passi:', 'blue');
    log('  1. Sul dispositivo CON I DATI:', 'cyan');
    log('     - Vai in Impostazioni → Avanzate', 'cyan');
    log('     - Clicca "Cancella Dati Locali"', 'cyan');
    log('     - Ricarica la pagina', 'cyan');
    log('     - Reinserisci i dati (o importa backup)', 'cyan');
    log('     - Vai in Impostazioni → Configuration', 'cyan');
    log('     - Clicca "Sincronizza Ora"', 'cyan');
    log('  2. Sul secondo dispositivo:', 'cyan');
    log('     - Vai in Impostazioni → Avanzate', 'cyan');
    log('     - Clicca "Cancella Dati Locali"', 'cyan');
    log('     - Ricarica la pagina', 'cyan');
    log('     - Vai in Impostazioni → Configuration', 'cyan');
    log('     - Clicca "Sincronizza Ora"', 'cyan');
    log('     - I dati verranno scaricati dal server\n', 'cyan');
    process.exit(0);
  } else {
    log('\n⚠️  Reset completato con alcuni errori', 'yellow');
    log('💡 Verifica i messaggi di errore sopra\n', 'yellow');
    process.exit(1);
  }
}

// Esegui script
main().catch((error) => {
  log(`\n❌ Errore imprevisto: ${error.message}`, 'red');
  log(`Stack: ${error.stack}`, 'red');
  process.exit(1);
});
