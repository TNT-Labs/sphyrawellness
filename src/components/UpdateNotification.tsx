import React, { useState } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate';

/**
 * Componente per notificare l'utente quando è disponibile una nuova versione dell'app
 *
 * Mostra un banner non invasivo nella parte superiore della pagina quando rileva
 * una nuova versione. L'utente può scegliere di aggiornare immediatamente o
 * chiudere la notifica (che riapparirà al prossimo check).
 */
const UpdateNotification: React.FC = () => {
  const { updateAvailable, currentVersion, newVersion, applyUpdate } = useServiceWorkerUpdate();
  const [dismissed, setDismissed] = useState(false);

  // Non mostrare se non c'è aggiornamento o se l'utente ha chiuso
  if (!updateAvailable || dismissed) {
    return null;
  }

  const handleUpdate = () => {
    applyUpdate();
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Il banner riapparirà al prossimo check (5 minuti)
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-lg animate-slide-down"
      role="alert"
      aria-live="polite"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Sparkles size={20} className="flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Nuova versione disponibile!
              </p>
              {currentVersion && newVersion && (
                <p className="text-xs opacity-90 mt-0.5">
                  {currentVersion} → {newVersion}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUpdate}
              className="flex items-center gap-2 px-4 py-2 bg-white text-pink-600 rounded-lg font-medium text-sm hover:bg-pink-50 transition-colors touch-manipulation shadow-sm"
              aria-label="Aggiorna ora"
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">Aggiorna ora</span>
              <span className="sm:hidden">Aggiorna</span>
            </button>

            <button
              onClick={handleDismiss}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors touch-manipulation"
              aria-label="Chiudi notifica"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;
