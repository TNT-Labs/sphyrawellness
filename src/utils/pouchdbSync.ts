/**
 * PouchDB/CouchDB Synchronization Service
 *
 * This module provides bidirectional synchronization between local PouchDB
 * and remote CouchDB for multi-device data consistency.
 */

import PouchDB from 'pouchdb-browser';
import PouchDBFind from 'pouchdb-find';
import { logger } from './logger';
import { loadSettingsWithPassword } from './storage';
import type { SyncStatus } from '../types';

// Enable PouchDB Find plugin for queries
PouchDB.plugin(PouchDBFind);

// Database names
const DB_NAMES = {
  CUSTOMERS: 'sphyra-customers',
  SERVICES: 'sphyra-services',
  STAFF: 'sphyra-staff',
  APPOINTMENTS: 'sphyra-appointments',
  PAYMENTS: 'sphyra-payments',
  REMINDERS: 'sphyra-reminders',
  STAFF_ROLES: 'sphyra-staff-roles',
  SERVICE_CATEGORIES: 'sphyra-service-categories',
  USERS: 'sphyra-users',
} as const;

// PouchDB instances
let localDatabases: Record<string, PouchDB.Database> = {};
let syncHandlers: Record<string, PouchDB.Replication.Sync<any>> = {};

// Sync status
let syncStatus: SyncStatus = {
  isActive: false,
  status: 'idle',
  documentsSynced: 0,
  syncErrors: [],
};

// Monitoring
let syncStartTime: number | null = null;

// Online/Offline detection
let isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
let autoSyncEnabled: boolean = false;
let connectionCheckInterval: NodeJS.Timeout | null = null;

// Connection check configuration
const CONNECTION_CHECK_INTERVAL_MS = 30000; // Check every 30 seconds
const CONNECTION_CHECK_TIMEOUT_MS = 5000; // 5 second timeout for connection test

// Sync status callbacks
const syncStatusCallbacks: Set<(status: SyncStatus) => void> = new Set();

// Throttling for sync status notifications
let lastNotificationTime = 0;
const NOTIFICATION_THROTTLE_MS = 1000; // Max 1 notification per second

/**
 * Subscribe to sync status changes
 */
export function onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
  syncStatusCallbacks.add(callback);
  // Return unsubscribe function
  return () => {
    syncStatusCallbacks.delete(callback);
  };
}

/**
 * Notify all subscribers of sync status change (with throttling)
 */
function notifySyncStatusChange(newStatus: Partial<SyncStatus>, force: boolean = false): void {
  syncStatus = { ...syncStatus, ...newStatus };

  // Throttle notifications unless forced (e.g., for errors or state changes)
  const now = Date.now();
  if (!force && (now - lastNotificationTime) < NOTIFICATION_THROTTLE_MS) {
    return;
  }

  lastNotificationTime = now;

  syncStatusCallbacks.forEach(callback => {
    try {
      callback(syncStatus);
    } catch (error) {
      logger.error('Error in sync status callback:', error);
    }
  });
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

/**
 * Initialize local PouchDB databases
 */
function initializeLocalDatabases(): void {
  if (Object.keys(localDatabases).length > 0) {
    logger.log('Local databases already initialized');
    return;
  }

  Object.entries(DB_NAMES).forEach(([key, dbName]) => {
    try {
      localDatabases[key] = new PouchDB(dbName, {
        auto_compaction: false,
        revs_limit: 1,
      });
      logger.log(`Initialized local database: ${dbName}`);
    } catch (error) {
      logger.error(`Failed to initialize local database ${dbName}:`, error);
      throw error;
    }
  });
}

/**
 * Ensure remote database exists, create if it doesn't
 */
async function ensureRemoteDatabaseExists(remoteUrl: string, dbName: string): Promise<boolean> {
  logger.info(`[DB-CHECK] Verifica esistenza database: ${dbName}`);
  logger.debug('[DB-CHECK] URL remoto (sanitizzato):', remoteUrl.replace(/\/\/[^:]+:[^@]+@/, '//*****:*****@'));

  try {
    // Step 1: Creazione istanza PouchDB
    logger.debug(`[DB-CHECK] [${dbName}] STEP 1: Creazione istanza PouchDB remoto`);

    // Normalizza l'URL rimuovendo slash finali multipli
    const normalizedUrl = remoteUrl.replace(/\/+$/, '');
    const fullDbUrl = `${normalizedUrl}/${dbName}`;

    logger.debug(`[DB-CHECK] [${dbName}] URL completo database:`, fullDbUrl.replace(/\/\/[^:]+:[^@]+@/, '//*****:*****@'));

    // Verifica che non ci siano doppi slash nel percorso
    try {
      const urlCheck = new URL(fullDbUrl);
      if (urlCheck.pathname.includes('//')) {
        logger.error(`[DB-CHECK] [${dbName}] ERRORE: Rilevati doppi slash nel percorso URL:`, urlCheck.pathname);
        return false;
      }
    } catch (urlError) {
      logger.error(`[DB-CHECK] [${dbName}] ERRORE: URL non valido:`, urlError);
      return false;
    }

    let remoteDB: PouchDB.Database;
    try {
      remoteDB = new PouchDB(fullDbUrl);
      logger.debug(`[DB-CHECK] [${dbName}] Istanza PouchDB creata con successo`);
    } catch (pouchError) {
      logger.error(`[DB-CHECK] [${dbName}] ERRORE durante creazione istanza PouchDB:`, pouchError);
      return false;
    }

    // Step 2: Verifica esistenza database con info()
    logger.debug(`[DB-CHECK] [${dbName}] STEP 2: Chiamata remoteDB.info() per verificare esistenza`);

    try {
      const infoStartTime = Date.now();
      const dbInfo = await remoteDB.info();
      const infoDuration = Date.now() - infoStartTime;

      logger.info(`[DB-CHECK] [${dbName}] ✓ Database remoto esiste (verificato in ${infoDuration}ms)`);
      logger.debug(`[DB-CHECK] [${dbName}] Info database:`, {
        db_name: dbInfo.db_name,
        doc_count: dbInfo.doc_count,
        update_seq: dbInfo.update_seq,
      });

      await remoteDB.close();
      logger.debug(`[DB-CHECK] [${dbName}] Connessione chiusa`);
      return true;
    } catch (error: any) {
      logger.debug(`[DB-CHECK] [${dbName}] Errore durante info():`, {
        errorName: error?.name,
        errorStatus: error?.status,
        errorMessage: error?.message,
        errorType: typeof error,
      });

      // Gestione errori specifici con messaggi più chiari
      if (error?.message === 'Failed to fetch') {
        logger.error(`[DB-CHECK] [${dbName}] ERRORE: Impossibile raggiungere il server (Failed to fetch)`);
        logger.error(`[DB-CHECK] [${dbName}] Possibili cause: CORS non abilitato, server non raggiungibile, Mixed Content (HTTPS->HTTP)`);
        await remoteDB.close().catch(() => {});
        return false;
      }

      // Database doesn't exist or other error
      if (error.status === 404 || error.name === 'not_found') {
        logger.warn(`[DB-CHECK] [${dbName}] Database non trovato (404), tentativo di creazione...`);

        // Step 3: Creazione database
        try {
          logger.debug(`[DB-CHECK] [${dbName}] STEP 3: Creazione nuovo database remoto`);

          // PouchDB will automatically create the database on first write
          const newRemoteDB = new PouchDB(fullDbUrl);
          logger.debug(`[DB-CHECK] [${dbName}] Nuova istanza PouchDB creata per creazione database`);

          // Write a dummy document to ensure database creation
          logger.debug(`[DB-CHECK] [${dbName}] Scrittura documento iniziale per creare il database`);
          const putStartTime = Date.now();

          await newRemoteDB.put({
            _id: '_design/init',
            views: {},
          });

          const putDuration = Date.now() - putStartTime;
          logger.info(`[DB-CHECK] [${dbName}] ✓ Database remoto creato con successo in ${putDuration}ms`);

          await newRemoteDB.close();
          logger.debug(`[DB-CHECK] [${dbName}] Connessione chiusa dopo creazione`);
          return true;
        } catch (createError: any) {
          logger.error(`[DB-CHECK] [${dbName}] ERRORE durante creazione database:`, {
            errorName: createError?.name,
            errorMessage: createError?.message,
            errorStatus: createError?.status,
            errorReason: createError?.reason,
            errorStack: createError?.stack,
          });
          return false;
        }
      } else {
        // Other error (authentication, network, etc.)
        logger.error(`[DB-CHECK] [${dbName}] ERRORE durante verifica database:`, {
          errorName: error?.name,
          errorMessage: error?.message,
          errorStatus: error?.status,
          errorReason: error?.reason,
          errorType: typeof error,
        });
        return false;
      }
    }
  } catch (error: any) {
    logger.error(`[DB-CHECK] [${dbName}] ERRORE GENERALE:`, error);
    return false;
  }
}

/**
 * Start synchronization with CouchDB
 */
export async function startSync(): Promise<boolean> {
  logger.info('=== AVVIO SINCRONIZZAZIONE COUCHDB ===');
  logger.debug('[SYNC-START] Timestamp:', new Date().toISOString());

  try {
    // Check if online
    logger.debug('[SYNC-START] STEP 1: Verifica stato connessione');
    logger.debug('[SYNC-START] isOnline:', isOnline);
    logger.debug('[SYNC-START] navigator.onLine:', typeof navigator !== 'undefined' ? navigator.onLine : 'N/A');

    if (!isOnline) {
      logger.warn('[SYNC-START] IMPOSSIBILE avviare sync: dispositivo offline');
      notifySyncStatusChange({
        status: 'paused',
        error: 'Nessuna connessione internet',
        isActive: false,
      }, true);
      return false;
    }
    logger.debug('[SYNC-START] ✓ Dispositivo online');

    // Load settings
    logger.debug('[SYNC-START] STEP 2: Caricamento impostazioni');
    let settings;
    try {
      settings = await loadSettingsWithPassword();
      logger.debug('[SYNC-START] ✓ Impostazioni caricate con successo');
      logger.debug('[SYNC-START] Settings:', {
        syncEnabled: settings.syncEnabled,
        hasCouchdbUrl: !!settings.couchdbUrl,
        hasUsername: !!settings.couchdbUsername,
        hasPassword: !!settings.couchdbPassword,
        couchdbUrlLength: settings.couchdbUrl?.length,
      });
    } catch (settingsError) {
      logger.error('[SYNC-START] ERRORE durante caricamento impostazioni:', settingsError);
      return false;
    }

    if (!settings.syncEnabled) {
      logger.warn('[SYNC-START] Sincronizzazione disabilitata nelle impostazioni');
      autoSyncEnabled = false;
      return false;
    }
    logger.debug('[SYNC-START] ✓ Sincronizzazione abilitata nelle impostazioni');

    if (!settings.couchdbUrl) {
      logger.error('[SYNC-START] ERRORE: URL CouchDB non configurato');
      notifySyncStatusChange({
        status: 'error',
        error: 'CouchDB URL non configurato',
        isActive: false,
      }, true); // Force notification
      return false;
    }
    logger.debug('[SYNC-START] ✓ URL CouchDB configurato');

    // Mark auto-sync as enabled
    autoSyncEnabled = true;
    logger.debug('[SYNC-START] autoSyncEnabled impostato a true');

    // Initialize local databases if not already done
    logger.debug('[SYNC-START] STEP 3: Inizializzazione database locali');
    try {
      initializeLocalDatabases();
      logger.debug('[SYNC-START] ✓ Database locali inizializzati');
      logger.debug('[SYNC-START] Numero database locali:', Object.keys(localDatabases).length);
    } catch (dbError) {
      logger.error('[SYNC-START] ERRORE durante inizializzazione database locali:', dbError);
      return false;
    }

    // Build remote URL with credentials
    logger.debug('[SYNC-START] STEP 4: Costruzione URL remoto con credenziali');
    let remoteUrl = settings.couchdbUrl.trim();
    logger.debug('[SYNC-START] URL base:', remoteUrl.substring(0, 30) + '...');

    // Valida URL
    try {
      const urlObj = new URL(remoteUrl);

      // Controllo Mixed Content
      const isPageHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const isTargetHttp = urlObj.protocol === 'http:';

      if (isPageHttps && isTargetHttp) {
        logger.error('[SYNC-START] ERRORE: Mixed Content rilevato! Pagina HTTPS non può connettersi a server HTTP');
        notifySyncStatusChange({
          status: 'error',
          error: 'Mixed Content: impossibile connettersi a server HTTP da pagina HTTPS',
          isActive: false,
        }, true);
        return false;
      }

      // Controllo accesso a localhost da pagina remota
      const isRemotePage = typeof window !== 'undefined' &&
                          !window.location.hostname.match(/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/);
      const isTargetLocalhost = urlObj.hostname.match(/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/);

      if (isRemotePage && isTargetLocalhost) {
        logger.error('[SYNC-START] ERRORE: Tentativo di accesso a localhost da pagina remota!');
        logger.error('[SYNC-START] I browser bloccano l\'accesso a localhost da pagine remote per motivi di sicurezza');
        notifySyncStatusChange({
          status: 'error',
          error: 'Impossibile connettersi a localhost da pagina remota. Usa un server CouchDB remoto o esegui l\'app in locale.',
          isActive: false,
        }, true);
        return false;
      }
    } catch (urlError) {
      logger.error('[SYNC-START] ERRORE: URL non valido:', urlError);
      notifySyncStatusChange({
        status: 'error',
        error: 'URL CouchDB non valido',
        isActive: false,
      }, true);
      return false;
    }

    // Normalizza URL rimuovendo slash finali
    remoteUrl = remoteUrl.replace(/\/+$/, '');
    logger.debug('[SYNC-START] URL normalizzato:', remoteUrl.substring(0, 30) + '...');

    if (settings.couchdbUsername && settings.couchdbPassword) {
      logger.debug('[SYNC-START] Aggiunta credenziali all\'URL');
      try {
        const url = new URL(remoteUrl);
        logger.debug('[SYNC-START] URL parsato - Protocol:', url.protocol, 'Host:', url.host);

        url.username = encodeURIComponent(settings.couchdbUsername);
        url.password = encodeURIComponent(settings.couchdbPassword);
        remoteUrl = url.toString();

        logger.debug('[SYNC-START] ✓ Credenziali aggiunte all\'URL (encoded)');
      } catch (urlError) {
        logger.error('[SYNC-START] ERRORE durante costruzione URL con credenziali:', urlError);
        return false;
      }
    } else {
      logger.debug('[SYNC-START] Nessuna credenziale fornita, uso URL base');
    }

    // Ensure all remote databases exist before starting sync
    logger.info('[SYNC-START] STEP 5: Verifica/creazione database remoti');
    logger.debug('[SYNC-START] Numero database da verificare:', Object.values(DB_NAMES).length);
    logger.debug('[SYNC-START] Database:', Object.values(DB_NAMES));

    const verificationStartTime = Date.now();
    const dbCreationResults = await Promise.all(
      Object.values(DB_NAMES).map(dbName => ensureRemoteDatabaseExists(remoteUrl, dbName))
    );
    const verificationDuration = Date.now() - verificationStartTime;

    logger.debug('[SYNC-START] Verifica database completata in', verificationDuration, 'ms');
    logger.debug('[SYNC-START] Risultati verifica:', dbCreationResults);

    // Check if any database creation failed
    const allDatabasesReady = dbCreationResults.every(result => result === true);
    if (!allDatabasesReady) {
      const failedDatabases = Object.values(DB_NAMES).filter((_, index) => !dbCreationResults[index]);
      logger.error('[SYNC-START] ERRORE: Alcuni database remoti non sono stati creati');
      logger.error('[SYNC-START] Database falliti:', failedDatabases);
      notifySyncStatusChange({
        status: 'error',
        error: 'Impossibile creare alcuni database remoti. Verifica i permessi.',
        isActive: false,
      }, true); // Force notification
      return false;
    }

    logger.info('[SYNC-START] ✓ Tutti i database remoti verificati/creati con successo');

    // Stop existing sync handlers
    logger.debug('[SYNC-START] STEP 6: Arresto sync handlers esistenti');
    await stopSync();
    logger.debug('[SYNC-START] ✓ Sync handlers precedenti arrestati');

    // Reset monitoring counters
    syncStartTime = Date.now();
    logger.debug('[SYNC-START] STEP 7: Contatori monitoraggio resettati');

    // Update status to syncing before starting
    logger.debug('[SYNC-START] STEP 8: Aggiornamento stato sync');
    notifySyncStatusChange({
      status: 'syncing',
      isActive: true,
      direction: 'both',
      documentsSynced: 0,
    }, true); // Force notification
    logger.debug('[SYNC-START] ✓ Stato aggiornato a "syncing"');

    // Start bidirectional sync for each database
    logger.info('[SYNC-START] STEP 9: Avvio sincronizzazione bidirezionale per tutti i database');
    logger.debug('[SYNC-START] Numero database da sincronizzare:', Object.entries(localDatabases).length);

    Object.entries(localDatabases).forEach(([key, localDB]) => {
      const remoteName = DB_NAMES[key as keyof typeof DB_NAMES];
      logger.debug(`[SYNC-START] Configurazione sync per database: ${remoteName}`);

      try {
        const remoteDB = new PouchDB(`${remoteUrl.replace(/\/$/, '')}/${remoteName}`);
        logger.debug(`[SYNC-START] [${remoteName}] Istanza remota PouchDB creata`);

        // Setup bidirectional sync with live updates
        logger.debug(`[SYNC-START] [${remoteName}] Avvio sync bidirezionale (live + retry)`);
        const sync = PouchDB.sync(localDB, remoteDB, {
          live: true,
          retry: true,
        });
        logger.debug(`[SYNC-START] [${remoteName}] ✓ Sync avviata`);

      // Handle sync events
      sync.on('change', (info) => {
        logger.log(`Sync change for ${remoteName}:`, info);

        // Count documents synced
        const docsChanged = (info.change?.docs?.length || 0);
        const currentCount = syncStatus.documentsSynced || 0;

        // Throttled notification (not forced)
        notifySyncStatusChange({
          lastSync: new Date().toISOString(),
          status: 'syncing',
          documentsSynced: currentCount + docsChanged,
        }, false);
      });

      sync.on('paused', () => {
        logger.log(`Sync paused for ${remoteName}`);

        // Calculate sync duration
        const duration = syncStartTime ? Date.now() - syncStartTime : undefined;
        syncStartTime = null;

        // Force notification for state change
        notifySyncStatusChange({
          status: 'idle',
          lastSync: new Date().toISOString(),
          lastSyncDuration: duration,
        }, true);
      });

      sync.on('active', () => {
        logger.log(`Sync active for ${remoteName}`);

        // Mark sync start time
        if (!syncStartTime) {
          syncStartTime = Date.now();
        }

        // Force notification for state change
        notifySyncStatusChange({
          status: 'syncing',
        }, true);
      });

      sync.on('error', (err: unknown) => {
        logger.error(`Sync error for ${remoteName}:`, err);

        // Add error to history (keep last 10)
        const errorMsg = err instanceof Error ? err.message : 'Errore di sincronizzazione';
        const errors = syncStatus.syncErrors || [];
        errors.unshift(`${new Date().toISOString()}: ${errorMsg}`);
        if (errors.length > 10) errors.pop();

        // Force notification for errors
        notifySyncStatusChange({
          status: 'error',
          error: errorMsg,
          syncErrors: errors,
        }, true);
      });

      sync.on('denied', (err: unknown) => {
        logger.error(`Sync denied for ${remoteName}:`, err);

        // Add error to history (keep last 10)
        const errorMsg = 'Accesso negato al server';
        const errors = syncStatus.syncErrors || [];
        errors.unshift(`${new Date().toISOString()}: ${errorMsg}`);
        if (errors.length > 10) errors.pop();

        // Force notification for errors
        notifySyncStatusChange({
          status: 'error',
          error: errorMsg,
          syncErrors: errors,
        }, true);
      });

      syncHandlers[key] = sync;
        logger.debug(`[SYNC-START] [${remoteName}] Sync handler salvato`);
      } catch (syncSetupError) {
        logger.error(`[SYNC-START] [${remoteName}] ERRORE durante setup sync:`, syncSetupError);
        throw syncSetupError;
      }
    });

    // Start connection monitoring
    logger.debug('[SYNC-START] STEP 10: Avvio monitoraggio connessione');
    startConnectionMonitoring();
    logger.debug('[SYNC-START] ✓ Monitoraggio connessione avviato');

    logger.info('[SYNC-START] ✓✓✓ SINCRONIZZAZIONE AVVIATA CON SUCCESSO ✓✓✓');
    logger.info('=== FINE AVVIO SINCRONIZZAZIONE COUCHDB ===');
    return true;
  } catch (error) {
    logger.error('=== ERRORE DURANTE AVVIO SINCRONIZZAZIONE ===');
    logger.error('[SYNC-START] Tipo errore:', typeof error);
    logger.error('[SYNC-START] Errore:', error);

    if (error instanceof Error) {
      logger.error('[SYNC-START] Error.name:', error.name);
      logger.error('[SYNC-START] Error.message:', error.message);
      logger.error('[SYNC-START] Error.stack:', error.stack);
    }

    notifySyncStatusChange({
      status: 'error',
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
      isActive: false,
    }, true); // Force notification

    logger.error('=== FINE AVVIO SINCRONIZZAZIONE (CON ERRORE) ===');
    return false;
  }
}

/**
 * Stop synchronization
 */
export async function stopSync(): Promise<void> {
  try {
    // Disable auto-sync
    autoSyncEnabled = false;

    // Stop connection monitoring
    stopConnectionMonitoring();

    // Cancel all sync handlers
    const cancelPromises = Object.values(syncHandlers).map(sync => {
      return sync.cancel();
    });

    await Promise.all(cancelPromises);
    syncHandlers = {};

    notifySyncStatusChange({
      status: 'idle',
      isActive: false,
      error: undefined,
    }, true); // Force notification

    logger.log('Synchronization stopped');
  } catch (error) {
    logger.error('Error stopping sync:', error);
  }
}

/**
 * Test connection to CouchDB server
 */
export async function testCouchDBConnection(
  url: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  logger.info('=== INIZIO TEST CONNESSIONE COUCHDB ===');
  logger.debug('testCouchDBConnection chiamata con parametri:', {
    url,
    hasUsername: !!username,
    hasPassword: !!password,
    urlLength: url?.length,
    timestamp: new Date().toISOString(),
  });

  try {
    // Step 1: Validazione URL
    logger.debug('[STEP 1/7] Validazione URL iniziale');
    if (!url || url.trim() === '') {
      logger.error('[STEP 1/7] ERRORE: URL vuoto o non fornito');
      return { success: false, error: 'URL non fornito' };
    }

    const cleanUrl = url.trim();
    logger.debug('[STEP 1/7] URL ricevuto:', cleanUrl.substring(0, 50) + (cleanUrl.length > 50 ? '...' : ''));

    // Validazione formato URL
    let urlObj: URL;
    try {
      urlObj = new URL(cleanUrl);
    } catch (parseError) {
      logger.error('[STEP 1/7] URL non valido:', parseError);
      return { success: false, error: 'URL non valido. Formato richiesto: http://host:port oppure https://host:port' };
    }

    // Step 1.5: Controllo Mixed Content (HTTPS -> HTTP)
    const isPageHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isTargetHttp = urlObj.protocol === 'http:';

    if (isPageHttps && isTargetHttp) {
      logger.warn('[STEP 1.5] ATTENZIONE: Rilevato Mixed Content! Pagina HTTPS tenta connessione HTTP');
      logger.warn('[STEP 1.5] Il browser potrebbe bloccare la richiesta per motivi di sicurezza');
      logger.warn('[STEP 1.5] Soluzione: Usa HTTPS per CouchDB o accedi all\'app via HTTP');

      return {
        success: false,
        error: 'Mixed Content bloccato: impossibile connettersi a un server HTTP da una pagina HTTPS. ' +
               'Soluzione: (1) Usa https:// nell\'URL del server, oppure (2) Accedi all\'app tramite http:// invece di https://, ' +
               'oppure (3) Configura CouchDB con certificato SSL/TLS.'
      };
    }

    // Step 1.6: Controllo accesso a localhost da pagina remota
    const isRemotePage = typeof window !== 'undefined' &&
                        !window.location.hostname.match(/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/);
    const isTargetLocalhost = urlObj.hostname.match(/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/);

    if (isRemotePage && isTargetLocalhost) {
      logger.error('[STEP 1.6] ERRORE: Rilevato tentativo di accesso a localhost da pagina remota!');
      logger.error('[STEP 1.6] Pagina corrente:', typeof window !== 'undefined' ? window.location.href : 'N/A');
      logger.error('[STEP 1.6] Target:', urlObj.href);
      logger.error('[STEP 1.6] I browser bloccano l\'accesso a localhost da pagine remote per motivi di sicurezza');

      return {
        success: false,
        error: 'Impossibile connettersi a localhost da pagina remota. ' +
               'I browser bloccano l\'accesso a localhost da pagine servite su domini remoti per motivi di sicurezza. ' +
               'Soluzioni: (1) Esegui l\'app in locale (npm run dev), ' +
               'oppure (2) Usa un tunnel (ngrok, cloudflare tunnel) per esporre CouchDB pubblicamente, ' +
               'oppure (3) Usa un server CouchDB remoto invece di localhost.'
      };
    }

    // Step 2: Costruzione URL con credenziali
    logger.debug('[STEP 2/7] Costruzione URL remoto');
    let remoteUrl = cleanUrl;

    // Normalizza URL rimuovendo slash finali multipli
    remoteUrl = remoteUrl.replace(/\/+$/, '');
    logger.debug('[STEP 2/7] URL normalizzato:', remoteUrl.substring(0, 50) + '...');

    if (username && password) {
      logger.debug('[STEP 2/7] Credenziali fornite, costruzione URL con autenticazione');
      try {
        const authUrlObj = new URL(remoteUrl);
        logger.debug('[STEP 2/7] URL parsato correttamente. Protocol:', authUrlObj.protocol, 'Host:', authUrlObj.host);

        authUrlObj.username = encodeURIComponent(username);
        authUrlObj.password = encodeURIComponent(password);
        logger.debug('[STEP 2/7] Credenziali aggiunte all\'URL (encoded)');

        remoteUrl = authUrlObj.toString();
        logger.debug('[STEP 2/7] URL completo costruito (lunghezza:', remoteUrl.length, ')');
      } catch (urlError) {
        logger.error('[STEP 2/7] ERRORE durante il parsing dell\'URL:', urlError);
        return {
          success: false,
          error: urlError instanceof Error ? `Errore URL: ${urlError.message}` : 'URL non valido'
        };
      }
    } else {
      logger.debug('[STEP 2/7] Nessuna credenziale fornita, uso URL senza autenticazione');
    }

    // Step 3: Creazione istanza PouchDB
    logger.debug('[STEP 3/7] Creazione istanza PouchDB per test');

    // Costruisci URL database assicurandoti che non ci siano doppi slash
    const baseUrl = remoteUrl.replace(/\/+$/, ''); // Rimuovi tutti gli slash finali
    const testDbUrl = `${baseUrl}/sphyra-test-connection`;

    logger.debug('[STEP 3/7] URL database di test:', testDbUrl.replace(/\/\/[^:]+:[^@]+@/, '//*****:*****@'));

    // Verifica che non ci siano doppi slash nel percorso
    const urlCheck = new URL(testDbUrl);
    if (urlCheck.pathname.includes('//')) {
      logger.error('[STEP 3/7] ERRORE: Rilevati doppi slash nel percorso URL:', urlCheck.pathname);
      return {
        success: false,
        error: 'URL malformato: percorso contiene doppi slash. Verifica l\'URL del server.'
      };
    }

    // Step 3: Test connessione diretta con fetch API
    logger.debug('[STEP 3/7] Test connessione diretta al server CouchDB');

    try {
      // Estrai credenziali dall'URL e crea URL pulito + header Authorization
      const urlForFetch = new URL(baseUrl);
      const authUsername = urlForFetch.username;
      const authPassword = urlForFetch.password;

      // Rimuovi credenziali dall'URL (fetch non le accetta nell'URL)
      urlForFetch.username = '';
      urlForFetch.password = '';
      const cleanServerUrl = urlForFetch.toString();

      logger.debug('[STEP 3/7] Tentativo di connessione a:', cleanServerUrl);

      // Prepara headers con autenticazione Basic se necessario
      const fetchHeaders: Record<string, string> = {
        'Accept': 'application/json',
      };

      if (authUsername && authPassword) {
        // Crea header Authorization con Basic Auth
        const credentials = `${decodeURIComponent(authUsername)}:${decodeURIComponent(authPassword)}`;
        const base64Credentials = btoa(credentials);
        fetchHeaders['Authorization'] = `Basic ${base64Credentials}`;
        logger.debug('[STEP 3/7] Header Authorization aggiunto con Basic Auth');
      }

      const fetchStartTime = Date.now();
      const response = await fetch(cleanServerUrl, {
        method: 'GET',
        headers: fetchHeaders,
        credentials: 'include',
      });
      const fetchDuration = Date.now() - fetchStartTime;

      logger.debug('[STEP 3/7] Risposta ricevuta in', fetchDuration, 'ms');
      logger.debug('[STEP 3/7] Status:', response.status);
      logger.debug('[STEP 3/7] Status Text:', response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[STEP 3/7] Risposta non OK:', errorText);

        if (response.status === 401) {
          return {
            success: false,
            error: 'Autenticazione fallita. Verifica username e password.'
          };
        } else if (response.status === 403) {
          return {
            success: false,
            error: 'Accesso negato. Verifica i permessi dell\'utente su CouchDB.'
          };
        } else {
          return {
            success: false,
            error: `Errore del server (HTTP ${response.status}): ${response.statusText}`
          };
        }
      }

      const serverInfo = await response.json();
      logger.info('[STEP 3/7] Connessione al server riuscita!');
      logger.debug('[STEP 3/7] Info server:', {
        couchdb: serverInfo.couchdb,
        version: serverInfo.version,
        vendor: serverInfo.vendor?.name,
      });

    } catch (fetchError: any) {
      logger.error('[STEP 3/7] ERRORE durante test connessione con fetch:', {
        errorName: fetchError?.name,
        errorMessage: fetchError?.message,
        errorType: typeof fetchError,
      });

      // Analizza l'errore per fornire messaggi più chiari
      if (fetchError?.message === 'Failed to fetch' || fetchError?.name === 'TypeError') {
        return {
          success: false,
          error: 'Impossibile raggiungere il server. Possibili cause:\n' +
                 '• CouchDB non è in esecuzione\n' +
                 '• L\'URL non è corretto\n' +
                 '• CORS non è configurato correttamente su CouchDB\n' +
                 '• Problema di rete o firewall\n\n' +
                 'Soluzione: Esegui lo script di configurazione CORS:\n' +
                 'node scripts/configure-couchdb-cors.cjs http://localhost:5984 admin password'
        };
      } else if (fetchError?.message?.includes('NetworkError')) {
        return {
          success: false,
          error: 'Errore di rete. Verifica che CouchDB sia in esecuzione e raggiungibile.'
        };
      } else {
        return {
          success: false,
          error: `Errore di connessione: ${fetchError?.message || 'Errore sconosciuto'}`
        };
      }
    }

    // Step 4: Test con PouchDB per verificare compatibilità completa
    logger.debug('[STEP 4/7] Creazione istanza PouchDB per test compatibilità');

    let testDB: PouchDB.Database;
    try {
      testDB = new PouchDB(testDbUrl);
      logger.debug('[STEP 4/7] Istanza PouchDB creata con successo');
    } catch (pouchError) {
      logger.error('[STEP 4/7] ERRORE durante la creazione dell\'istanza PouchDB:', pouchError);
      return {
        success: false,
        error: pouchError instanceof Error ? `Errore PouchDB: ${pouchError.message}` : 'Impossibile creare istanza PouchDB'
      };
    }

    // Step 5: Test info() per verificare accesso al database
    logger.debug('[STEP 5/7] Tentativo di ottenere info dal database di test');

    try {
      const infoStartTime = Date.now();
      const dbInfo = await testDB.info();
      const infoDuration = Date.now() - infoStartTime;

      logger.info('[STEP 5/7] testDB.info() completata con successo in', infoDuration, 'ms');
      logger.debug('[STEP 5/7] Informazioni database ricevute:', {
        db_name: dbInfo.db_name,
        doc_count: dbInfo.doc_count,
      });
    } catch (infoError: any) {
      logger.debug('[STEP 5/7] Info su database di test fallita (normale se il database non esiste):', {
        errorName: infoError?.name,
        errorStatus: infoError?.status,
      });

      // Se il database non esiste (404), è normale - lo creeremo durante la sincronizzazione
      if (infoError?.status !== 404) {
        // Altri errori sono problematici
        logger.error('[STEP 5/7] ERRORE imprevisto durante testDB.info():', infoError);

        try {
          await testDB.close();
        } catch (e) { /* ignore */ }

        let userFriendlyError = 'Errore durante l\'accesso al database';

        if (infoError?.message === 'Failed to fetch') {
          userFriendlyError = 'Errore CORS: Il server non risponde correttamente. ' +
                            'Esegui: node scripts/configure-couchdb-cors.cjs http://localhost:5984 admin password';
        } else if (infoError?.status === 401) {
          userFriendlyError = 'Autenticazione fallita. Verifica username e password.';
        } else if (infoError?.status === 403) {
          userFriendlyError = 'Accesso negato. Verifica i permessi dell\'utente.';
        } else if (infoError instanceof Error) {
          userFriendlyError = `${infoError.name}: ${infoError.message}`;
        }

        return {
          success: false,
          error: userFriendlyError
        };
      }
    }

    // Step 6: Cleanup - elimina database di test
    logger.debug('[STEP 6/7] Pulizia database di test');

    try {
      await testDB.destroy();
      logger.debug('[STEP 6/7] Database di test eliminato');
    } catch (cleanupError: any) {
      // Ignora errori di cleanup (es. database non esisteva)
      logger.debug('[STEP 6/7] Cleanup ignorato:', cleanupError?.status);

      try {
        await testDB.close();
      } catch (e) { /* ignore */ }
    }

    // Step 7: Successo finale
    logger.info('[STEP 7/7] ✓ TEST CONNESSIONE COMPLETATO CON SUCCESSO');
    logger.info('=== FINE TEST CONNESSIONE COUCHDB ===');

    return { success: true };
  } catch (error: unknown) {
    logger.error('=== ERRORE GENERALE DURANTE IL TEST DI CONNESSIONE ===');
    logger.error('Tipo errore:', typeof error);
    logger.error('Errore completo:', error);

    if (error instanceof Error) {
      logger.error('Error.name:', error.name);
      logger.error('Error.message:', error.message);
      logger.error('Error.stack:', error.stack);
    }

    logger.error('=== FINE TEST CONNESSIONE COUCHDB (CON ERRORE) ===');

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connessione fallita',
    };
  }
}

/**
 * Perform a one-time sync (pull and push)
 */
export async function performOneTimeSync(): Promise<boolean> {
  try {
    const settings = await loadSettingsWithPassword();

    if (!settings.couchdbUrl) {
      logger.error('CouchDB URL is not configured');
      return false;
    }

    // Initialize local databases if not already done
    initializeLocalDatabases();

    // Build remote URL with credentials
    let remoteUrl = settings.couchdbUrl.trim();

    // Valida e normalizza URL
    try {
      const urlObj = new URL(remoteUrl);

      // Controllo Mixed Content
      const isPageHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const isTargetHttp = urlObj.protocol === 'http:';

      if (isPageHttps && isTargetHttp) {
        logger.error('[ONE-TIME-SYNC] ERRORE: Mixed Content rilevato');
        notifySyncStatusChange({
          status: 'error',
          error: 'Mixed Content: impossibile connettersi a server HTTP da pagina HTTPS',
          isActive: false,
        }, true);
        return false;
      }

      // Controllo accesso a localhost da pagina remota
      const isRemotePage = typeof window !== 'undefined' &&
                          !window.location.hostname.match(/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/);
      const isTargetLocalhost = urlObj.hostname.match(/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/);

      if (isRemotePage && isTargetLocalhost) {
        logger.error('[ONE-TIME-SYNC] ERRORE: Tentativo di accesso a localhost da pagina remota!');
        notifySyncStatusChange({
          status: 'error',
          error: 'Impossibile connettersi a localhost da pagina remota. Usa un server CouchDB remoto o esegui l\'app in locale.',
          isActive: false,
        }, true);
        return false;
      }
    } catch (urlError) {
      logger.error('[ONE-TIME-SYNC] ERRORE: URL non valido:', urlError);
      return false;
    }

    // Normalizza URL
    remoteUrl = remoteUrl.replace(/\/+$/, '');

    if (settings.couchdbUsername && settings.couchdbPassword) {
      const url = new URL(remoteUrl);
      url.username = encodeURIComponent(settings.couchdbUsername);
      url.password = encodeURIComponent(settings.couchdbPassword);
      remoteUrl = url.toString();
    }

    // Ensure all remote databases exist before syncing
    logger.log('Verifying remote databases for one-time sync...');
    const dbCreationResults = await Promise.all(
      Object.values(DB_NAMES).map(dbName => ensureRemoteDatabaseExists(remoteUrl, dbName))
    );

    const allDatabasesReady = dbCreationResults.every(result => result === true);
    if (!allDatabasesReady) {
      logger.error('Some remote databases could not be created for one-time sync');
      notifySyncStatusChange({
        status: 'error',
        error: 'Impossibile creare alcuni database remoti',
        isActive: false,
      }, true); // Force notification
      return false;
    }

    notifySyncStatusChange({
      status: 'syncing',
      isActive: true,
    }, true); // Force notification

    // Perform one-time sync for each database
    const syncPromises = Object.entries(localDatabases).map(async ([key, localDB]) => {
      const remoteName = DB_NAMES[key as keyof typeof DB_NAMES];
      const remoteDB = new PouchDB(`${remoteUrl.replace(/\/$/, '')}/${remoteName}`);

      // Perform bidirectional replication
      await PouchDB.sync(localDB, remoteDB);

      logger.log(`One-time sync completed for ${remoteName}`);
    });

    await Promise.all(syncPromises);

    notifySyncStatusChange({
      status: 'idle',
      isActive: false,
      lastSync: new Date().toISOString(),
    }, true); // Force notification

    logger.log('One-time synchronization completed successfully');
    return true;
  } catch (error) {
    logger.error('Failed to perform one-time sync:', error);
    notifySyncStatusChange({
      status: 'error',
      error: error instanceof Error ? error.message : 'Errore di sincronizzazione',
      isActive: false,
    }, true); // Force notification
    return false;
  }
}

/**
 * Close all database connections
 */
export async function closeDatabases(): Promise<void> {
  try {
    // Stop sync first
    await stopSync();

    // Close all local databases
    const closePromises = Object.values(localDatabases).map(db => db.close());
    await Promise.all(closePromises);

    localDatabases = {};
    logger.log('All databases closed');
  } catch (error) {
    logger.error('Error closing databases:', error);
  }
}

/**
 * Cleanup on page unload - closes all connections gracefully
 */
function cleanupOnUnload(): void {
  try {
    logger.log('Page unload detected, cleaning up sync...');
    // Synchronously close databases (we can't use async here)
    Object.values(syncHandlers).forEach(sync => {
      try {
        sync.cancel();
      } catch (e) {
        logger.warn('Error canceling sync on unload:', e);
      }
    });
    Object.values(localDatabases).forEach(db => {
      try {
        db.close();
      } catch (e) {
        logger.warn('Error closing database on unload:', e);
      }
    });
    logger.log('Cleanup completed');
  } catch (error) {
    logger.error('Error during cleanup on unload:', error);
  }
}

/**
 * Handle online event - restart sync if it was enabled
 */
function handleOnlineEvent(): void {
  logger.log('Network connection restored');
  isOnline = true;

  if (autoSyncEnabled) {
    logger.log('Auto-restarting sync after connection restored');
    startSync().catch(err =>
      logger.error('Failed to restart sync after going online:', err)
    );
  }
}

/**
 * Handle offline event - log and update status
 */
function handleOfflineEvent(): void {
  logger.warn('Network connection lost');
  isOnline = false;

  // Update status to reflect offline state
  if (syncStatus.isActive) {
    notifySyncStatusChange({
      status: 'paused',
      error: 'Nessuna connessione internet',
    }, true);
  }
}

/**
 * Check if device is online
 */
export function getOnlineStatus(): boolean {
  return isOnline;
}

/**
 * Test actual connectivity to CouchDB server (more reliable than navigator.onLine)
 */
async function testActualConnectivity(): Promise<boolean> {
  try {
    const settings = await loadSettingsWithPassword();
    if (!settings.couchdbUrl) {
      return false;
    }

    // Create a promise that times out after CONNECTION_CHECK_TIMEOUT_MS
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Connection test timeout')), CONNECTION_CHECK_TIMEOUT_MS);
    });

    // Create a promise that tests the connection
    const testPromise = async (): Promise<boolean> => {
      let remoteUrl = settings.couchdbUrl!.trim().replace(/\/+$/, '');

      if (settings.couchdbUsername && settings.couchdbPassword) {
        const url = new URL(remoteUrl);
        url.username = encodeURIComponent(settings.couchdbUsername);
        url.password = encodeURIComponent(settings.couchdbPassword);
        remoteUrl = url.toString();
      }

      // Try to access a lightweight endpoint
      const testDB = new PouchDB(`${remoteUrl}/_users`);
      await testDB.info();
      await testDB.close();
      return true;
    };

    // Race between timeout and actual test
    return await Promise.race([testPromise(), timeoutPromise]);
  } catch (error) {
    logger.debug('Connectivity test failed:', error);
    return false;
  }
}

/**
 * Start periodic connection checks
 */
function startConnectionMonitoring(): void {
  if (connectionCheckInterval) {
    return; // Already monitoring
  }

  logger.log('Starting connection monitoring');

  connectionCheckInterval = setInterval(async () => {
    const wasOnline = isOnline;
    const actuallyOnline = await testActualConnectivity();

    // Update online status
    isOnline = actuallyOnline;

    // If status changed, trigger appropriate handler
    if (wasOnline && !actuallyOnline) {
      logger.warn('Connection lost (detected by connectivity test)');
      handleOfflineEvent();
    } else if (!wasOnline && actuallyOnline) {
      logger.log('Connection restored (detected by connectivity test)');
      handleOnlineEvent();
    }
  }, CONNECTION_CHECK_INTERVAL_MS);
}

/**
 * Stop periodic connection checks
 */
function stopConnectionMonitoring(): void {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
    logger.log('Stopped connection monitoring');
  }
}

/**
 * Initialize sync based on settings
 */
export async function initializeSync(): Promise<void> {
  try {
    const settings = await loadSettingsWithPassword();

    if (settings.syncEnabled && settings.couchdbUrl) {
      logger.log('Auto-starting sync based on settings');
      autoSyncEnabled = true;

      // Test actual connectivity before starting
      const actuallyOnline = await testActualConnectivity();
      isOnline = actuallyOnline;

      if (isOnline) {
        await startSync();
      } else {
        logger.warn('Device is offline, sync will start when online');
        notifySyncStatusChange({
          status: 'paused',
          error: 'In attesa di connessione internet',
          isActive: false,
        }, true);

        // Start monitoring to detect when connection is restored
        startConnectionMonitoring();
      }
    } else {
      logger.log('Sync is disabled or not configured');
      autoSyncEnabled = false;
    }

    // Setup cleanup handlers for page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', cleanupOnUnload);
      window.addEventListener('pagehide', cleanupOnUnload);

      // Setup online/offline detection (as fallback to periodic checks)
      window.addEventListener('online', handleOnlineEvent);
      window.addEventListener('offline', handleOfflineEvent);

      logger.log('Cleanup and network handlers registered');
    }
  } catch (error) {
    logger.error('Failed to initialize sync:', error);
  }
}
