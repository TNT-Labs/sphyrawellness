#!/usr/bin/env node

/**
 * Script per configurare CORS su CouchDB
 *
 * Questo script configura correttamente CORS su CouchDB per permettere
 * l'accesso dall'applicazione web Sphyra Wellness Lab.
 *
 * Uso:
 *   node scripts/configure-couchdb-cors.js <couchdb-url> <username> <password>
 *
 * Esempio:
 *   node scripts/configure-couchdb-cors.js http://localhost:5984 admin mypassword
 */

const https = require('https');
const http = require('http');

// Colori per output console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Effettua una richiesta HTTP
 */
function makeRequest(url, method = 'GET', auth = null, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      // Accept self-signed certificates in development
      rejectUnauthorized: false,
    };

    if (auth) {
      const authString = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      options.headers['Authorization'] = `Basic ${authString}`;
    }

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = httpModule.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const responseData = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            data: responseData,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Imposta una configurazione CORS
 */
async function setCORSConfig(baseUrl, auth, section, key, value) {
  const url = `${baseUrl}/_node/_local/_config/${section}/${key}`;

  try {
    const response = await makeRequest(url, 'PUT', auth, value);

    if (response.statusCode === 200 || response.statusCode === 201) {
      return { success: true, oldValue: response.data };
    } else {
      return { success: false, error: `HTTP ${response.statusCode}`, data: response.data };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Legge una configurazione CORS
 */
async function getCORSConfig(baseUrl, auth, section, key) {
  const url = `${baseUrl}/_node/_local/_config/${section}/${key}`;

  try {
    const response = await makeRequest(url, 'GET', auth);

    if (response.statusCode === 200) {
      return { success: true, value: response.data };
    } else {
      return { success: false, error: `HTTP ${response.statusCode}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Configura CORS completo
 */
async function configureCORS(baseUrl, auth) {
  log('\n═══════════════════════════════════════════', 'cyan');
  log('  🔒 Configurazione CORS CouchDB', 'cyan');
  log('═══════════════════════════════════════════\n', 'cyan');

  log(`📍 Server: ${baseUrl}`, 'blue');
  log(`👤 Utente: ${auth.username}\n`, 'blue');

  // Configurazioni CORS necessarie
  const corsConfigs = [
    {
      section: 'httpd',
      key: 'enable_cors',
      value: 'true',
      description: 'Abilita CORS',
    },
    {
      section: 'cors',
      key: 'origins',
      value: '*',
      description: 'Origins permessi (tutti)',
    },
    {
      section: 'cors',
      key: 'credentials',
      value: 'true',
      description: 'Permetti credenziali',
    },
    {
      section: 'cors',
      key: 'methods',
      value: 'GET, PUT, POST, HEAD, DELETE, OPTIONS',
      description: 'Metodi HTTP permessi',
    },
    {
      section: 'cors',
      key: 'headers',
      value: 'accept, authorization, content-type, origin, referer, x-requested-with',
      description: 'Headers richiesta permessi',
    },
  ];

  // Configurazioni aggiuntive raccomandate per PouchDB
  const additionalConfigs = [
    {
      section: 'chttpd',
      key: 'enable_cors',
      value: 'true',
      description: 'Abilita CORS per chttpd (cluster)',
    },
  ];

  log('📝 Applicazione configurazioni CORS...\n', 'cyan');

  let successCount = 0;
  let errorCount = 0;
  const results = [];

  // Applica configurazioni principali
  for (const config of corsConfigs) {
    try {
      const result = await setCORSConfig(
        baseUrl,
        auth,
        config.section,
        config.key,
        config.value
      );

      if (result.success) {
        log(`  ✅ ${config.description}`, 'green');
        log(`     [${config.section}] ${config.key} = "${config.value}"`, 'dim');

        if (result.oldValue && result.oldValue !== config.value) {
          log(`     (valore precedente: "${result.oldValue}")`, 'dim');
        }

        successCount++;
        results.push({ ...config, status: 'success' });
      } else {
        log(`  ❌ ${config.description}`, 'red');
        log(`     Errore: ${result.error}`, 'red');
        errorCount++;
        results.push({ ...config, status: 'error', error: result.error });
      }
    } catch (error) {
      log(`  ❌ ${config.description}`, 'red');
      log(`     Errore: ${error.message}`, 'red');
      errorCount++;
      results.push({ ...config, status: 'error', error: error.message });
    }
  }

  // Applica configurazioni aggiuntive (opzionali)
  log('\n📝 Configurazioni aggiuntive (opzionali)...\n', 'cyan');

  for (const config of additionalConfigs) {
    try {
      const result = await setCORSConfig(
        baseUrl,
        auth,
        config.section,
        config.key,
        config.value
      );

      if (result.success) {
        log(`  ✅ ${config.description}`, 'green');
        successCount++;
      } else {
        log(`  ⚠️  ${config.description} (opzionale)`, 'yellow');
        log(`     ${result.error}`, 'dim');
      }
    } catch (error) {
      log(`  ⚠️  ${config.description} (opzionale)`, 'yellow');
      log(`     ${error.message}`, 'dim');
    }
  }

  // Verifica finale
  log('\n🔍 Verifica configurazione finale...\n', 'cyan');

  for (const config of corsConfigs) {
    try {
      const result = await getCORSConfig(
        baseUrl,
        auth,
        config.section,
        config.key
      );

      if (result.success) {
        const currentValue = result.value;
        const expectedValue = config.value;

        if (currentValue === expectedValue || currentValue === `"${expectedValue}"`) {
          log(`  ✅ ${config.key}: OK`, 'green');
        } else {
          log(`  ⚠️  ${config.key}: Valore diverso da quello atteso`, 'yellow');
          log(`     Atteso: "${expectedValue}"`, 'dim');
          log(`     Attuale: ${currentValue}`, 'dim');
        }
      }
    } catch (error) {
      // Ignora errori di verifica
    }
  }

  // Riepilogo
  log('\n═══════════════════════════════════════════', 'cyan');
  log('  📊 Riepilogo', 'cyan');
  log('═══════════════════════════════════════════\n', 'cyan');

  log(`  ✅ Configurazioni applicate: ${successCount}`, 'green');
  if (errorCount > 0) {
    log(`  ❌ Errori: ${errorCount}`, 'red');
  }

  if (errorCount === 0) {
    log('\n═══════════════════════════════════════════', 'green');
    log('  ✅ CORS configurato con successo!', 'green');
    log('═══════════════════════════════════════════\n', 'green');

    log('📌 Nota: Potrebbe essere necessario riavviare CouchDB per applicare tutte le modifiche.\n', 'yellow');
    log('Per Docker: docker-compose restart couchdb', 'blue');
    log('Per installazione locale: sudo systemctl restart couchdb\n', 'blue');

    return true;
  } else {
    log('\n═══════════════════════════════════════════', 'red');
    log('  ⚠️  Configurazione completata con errori', 'red');
    log('═══════════════════════════════════════════\n', 'red');

    log('Verifica che:', 'yellow');
    log('  1. Le credenziali siano corrette', 'yellow');
    log('  2. L\'utente abbia permessi di admin', 'yellow');
    log('  3. CouchDB sia in esecuzione e raggiungibile\n', 'yellow');

    return false;
  }
}

/**
 * Verifica connessione al server
 */
async function testConnection(baseUrl, auth) {
  try {
    const response = await makeRequest(baseUrl, 'GET', auth);

    if (response.statusCode === 200) {
      log('✅ Connesso a CouchDB', 'green');
      if (response.data.version) {
        log(`   Versione: ${response.data.version}`, 'dim');
      }
      if (response.data.vendor && response.data.vendor.name) {
        log(`   Vendor: ${response.data.vendor.name}`, 'dim');
      }
      return true;
    } else {
      log(`❌ Errore di connessione: HTTP ${response.statusCode}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Impossibile connettersi al server: ${error.message}`, 'red');
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
    log('\n🔒 Script Configurazione CORS CouchDB - Sphyra Wellness Lab\n', 'cyan');
    log('Utilizzo:', 'blue');
    log('  node scripts/configure-couchdb-cors.js <couchdb-url> <username> <password>\n');
    log('Esempi:', 'blue');
    log('  node scripts/configure-couchdb-cors.js http://localhost:5984 admin password');
    log('  node scripts/configure-couchdb-cors.js https://myserver.com:5984 admin mypassword\n');
    log('Descrizione:', 'blue');
    log('  Configura automaticamente CORS su CouchDB per permettere l\'accesso');
    log('  dall\'applicazione web. Imposta tutti gli headers e permessi necessari.\n');
    process.exit(0);
  }

  if (args.length < 3) {
    log('❌ Errore: Parametri mancanti\n', 'red');
    log('Uso: node scripts/configure-couchdb-cors.js <couchdb-url> <username> <password>', 'yellow');
    log('Esempio: node scripts/configure-couchdb-cors.js http://localhost:5984 admin password\n', 'yellow');
    process.exit(1);
  }

  const baseUrl = args[0].replace(/\/$/, ''); // Rimuovi trailing slash
  const username = args[1];
  const password = args[2];

  const auth = { username, password };

  log('\n🔍 Verifico connessione a CouchDB...', 'cyan');
  const connected = await testConnection(baseUrl, auth);

  if (!connected) {
    log('\n❌ Impossibile connettersi a CouchDB. Verifica i parametri e riprova.\n', 'red');
    process.exit(1);
  }

  // Configura CORS
  const success = await configureCORS(baseUrl, auth);

  process.exit(success ? 0 : 1);
}

// Esegui lo script
main().catch((error) => {
  log('\n❌ Errore inaspettato:', 'red');
  console.error(error);
  process.exit(1);
});
