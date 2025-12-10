import { useState, useEffect, useCallback } from 'react';

interface VersionInfo {
  version: string;
  buildTime: string;
  buildTimestamp: number;
  buildHash: string;
}

interface UseServiceWorkerUpdateReturn {
  updateAvailable: boolean;
  currentVersion: string | null;
  newVersion: string | null;
  checkForUpdates: () => Promise<void>;
  applyUpdate: () => void;
}

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const LOCAL_STORAGE_KEY = 'sphyra-app-version';

/**
 * Hook per gestire gli aggiornamenti del service worker e la versione dell'app
 *
 * Controlla periodicamente se è disponibile una nuova versione dell'applicazione
 * confrontando il file version.json locale con quello sul server.
 *
 * @returns {UseServiceWorkerUpdateReturn} Oggetto con stato e funzioni per gestire gli aggiornamenti
 */
export function useServiceWorkerUpdate(): UseServiceWorkerUpdateReturn {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  /**
   * Ottiene la versione corrente memorizzata localmente
   */
  const getCurrentVersion = useCallback((): VersionInfo | null => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Errore nel recupero della versione corrente:', error);
      return null;
    }
  }, []);

  /**
   * Salva la versione corrente nel localStorage
   */
  const saveCurrentVersion = useCallback((versionInfo: VersionInfo): void => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(versionInfo));
    } catch (error) {
      console.error('Errore nel salvataggio della versione:', error);
    }
  }, []);

  /**
   * Ottiene la versione dal server
   */
  const fetchServerVersion = useCallback(async (): Promise<VersionInfo | null> => {
    try {
      // Aggiungi un parametro timestamp per evitare il caching
      const timestamp = Date.now();
      const basePath = import.meta.env.PROD ? '/sphyrawellness' : '';
      const response = await fetch(`${basePath}/version.json?t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const versionInfo: VersionInfo = await response.json();
      return versionInfo;
    } catch (error) {
      console.error('Errore nel recupero della versione dal server:', error);
      return null;
    }
  }, []);

  /**
   * Controlla se è disponibile un aggiornamento
   */
  const checkForUpdates = useCallback(async (): Promise<void> => {
    const current = getCurrentVersion();
    const server = await fetchServerVersion();

    if (!server) {
      // Se non riusciamo a recuperare la versione dal server, non facciamo nulla
      return;
    }

    // Se non c'è una versione corrente, questa è la prima esecuzione
    if (!current) {
      saveCurrentVersion(server);
      setCurrentVersion(server.version);
      return;
    }

    // Confronta le versioni usando il buildHash (più affidabile del timestamp)
    if (server.buildHash !== current.buildHash) {
      console.log('🔄 Nuova versione disponibile!');
      console.log(`  Versione corrente: ${current.version} (${current.buildHash})`);
      console.log(`  Nuova versione: ${server.version} (${server.buildHash})`);

      setUpdateAvailable(true);
      setCurrentVersion(current.version);
      setNewVersion(server.version);
    } else {
      // Nessun aggiornamento disponibile
      setUpdateAvailable(false);
      setCurrentVersion(current.version);
    }
  }, [getCurrentVersion, fetchServerVersion, saveCurrentVersion]);

  /**
   * Applica l'aggiornamento ricaricando la pagina
   * Il service worker con skipWaiting prenderà il controllo immediatamente
   */
  const applyUpdate = useCallback((): void => {
    // Aggiorna la versione memorizzata prima di ricaricare
    fetchServerVersion().then((server) => {
      if (server) {
        saveCurrentVersion(server);
      }

      // Ricarica la pagina per applicare l'aggiornamento
      window.location.reload();
    });
  }, [fetchServerVersion, saveCurrentVersion]);

  /**
   * Controlla gli aggiornamenti all'avvio e periodicamente
   */
  useEffect(() => {
    // Check iniziale
    checkForUpdates();

    // Check periodico
    const intervalId = setInterval(() => {
      checkForUpdates();
    }, VERSION_CHECK_INTERVAL);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [checkForUpdates]);

  /**
   * Gestisce l'evento di aggiornamento del service worker
   */
  useEffect(() => {
    // Listener per l'evento di aggiornamento del service worker
    const handleControllerChange = () => {
      console.log('🔄 Service worker aggiornato, verifica nuova versione...');
      checkForUpdates();
    };

    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [checkForUpdates]);

  return {
    updateAvailable,
    currentVersion,
    newVersion,
    checkForUpdates,
    applyUpdate,
  };
}
