import React, { useState, useEffect, useCallback } from 'react';
import { Bell, AlertCircle, CheckCircle, RefreshCw, Server } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { settingsApi, checkServerHealth } from '../../utils/api';
import { logger } from '../../utils/logger';
import type { Settings as ReminderSettings } from '../../types';

export const ReminderSettingsCard: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [serverHealthy, setServerHealthy] = useState(false);
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  // Form state
  const [reminderHour, setReminderHour] = useState(10);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(1);
  const [enableAutoReminders, setEnableAutoReminders] = useState(true);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await settingsApi.get();
      setSettings(data);
      setReminderHour(data.reminderSendHour);
      setReminderMinute(data.reminderSendMinute);
      setReminderDaysBefore(data.reminderDaysBefore ?? 1);
      setEnableAutoReminders(data.enableAutoReminders);
    } catch (error: any) {
      logger.error('Failed to load reminder settings:', error);
      showError('Impossibile caricare le impostazioni reminder');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const checkServer = useCallback(async () => {
    setIsCheckingServer(true);
    try {
      const healthy = await checkServerHealth();
      setServerHealthy(healthy);
    } catch {
      setServerHealthy(false);
    } finally {
      setIsCheckingServer(false);
    }
  }, []);

  const initializeSettings = useCallback(async () => {
    // Check if server is available
    await checkServer();
    // Only load settings if server is healthy
    // Note: we need to check the server health result directly since state update is async
    try {
      const healthy = await checkServerHealth();
      if (healthy) {
        await loadSettings();
      }
    } catch {
      // Server check already failed, skip loading settings
    }
  }, [checkServer, loadSettings]);

  useEffect(() => {
    initializeSettings();
  }, [initializeSettings]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const updatedSettings = await settingsApi.update({
        reminderSendHour: reminderHour,
        reminderSendMinute: reminderMinute,
        reminderDaysBefore,
        enableAutoReminders,
      });

      setSettings(updatedSettings);
      showSuccess('Impostazioni reminder salvate con successo');
    } catch (error: any) {
      logger.error('Failed to save reminder settings:', error);
      showError('Errore nel salvataggio delle impostazioni');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (hour: number | undefined, minute: number | undefined) => {
    const h = hour ?? 10; // default 10:00 if undefined
    const m = minute ?? 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return (
    <div className="card">
      <div className="flex items-center mb-4">
        <Bell className="text-primary-600 mr-2" size={24} />
        <h2 className="text-xl font-bold text-gray-900">Impostazioni Reminder Email</h2>
      </div>

      <div className="space-y-4">
        {/* Server Status */}
        <div className={`flex items-start gap-3 p-4 rounded-lg ${serverHealthy ? 'bg-green-50' : 'bg-yellow-50'}`}>
          <div className="flex-shrink-0 mt-1">
            {isCheckingServer ? (
              <RefreshCw className="text-gray-600 animate-spin" size={20} />
            ) : serverHealthy ? (
              <CheckCircle className="text-green-600" size={20} />
            ) : (
              <AlertCircle className="text-yellow-600" size={20} />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className={`font-semibold ${serverHealthy ? 'text-green-900' : 'text-yellow-900'}`}>
                {serverHealthy ? 'Server Backend Connesso' : 'Server Backend Non Disponibile'}
              </p>
              <button
                onClick={checkServer}
                disabled={isCheckingServer}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <RefreshCw size={14} className={isCheckingServer ? 'animate-spin' : ''} />
                Ricarica
              </button>
            </div>
            <p className={`text-sm mt-1 ${serverHealthy ? 'text-green-700' : 'text-yellow-700'}`}>
              {serverHealthy
                ? 'Il sistema di reminder email è operativo e pronto per l\'uso.'
                : 'Assicurati che il server backend sia avviato per utilizzare i reminder email.'}
            </p>
            {!serverHealthy && (
              <div className="mt-2 text-xs text-gray-600 bg-white bg-opacity-50 rounded p-2 space-y-2">
                <div>
                  <p className="font-semibold mb-1">URL cercato:</p>
                  <code className="block bg-gray-900 text-gray-100 p-1 px-2 rounded text-[10px] break-all overflow-x-auto max-w-full">
                    {import.meta.env.VITE_API_URL || 'https://sphyra.local/api'}
                  </code>
                </div>
                <div>
                  <p className="font-semibold mb-1">Possibili soluzioni:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li className="break-words">Se usi Docker/HTTPS: copia <code className="bg-gray-200 px-1 rounded break-all">.env.private.example</code> in <code className="bg-gray-200 px-1 rounded">.env</code></li>
                    <li className="break-words">Se usi sviluppo locale: avvia il server con <code className="bg-gray-200 px-1 rounded break-all">cd server && npm install && npm run dev</code></li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Auto Reminders Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-semibold text-gray-900">Reminder Automatici</p>
            <p className="text-sm text-gray-600">
              Invia automaticamente reminder via email prima dell'appuntamento
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enableAutoReminders}
              onChange={(e) => setEnableAutoReminders(e.target.checked)}
              disabled={!serverHealthy}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
          </label>
        </div>

        {/* Time Configuration */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Orario Invio Reminder</h3>
          <p className="text-sm text-gray-600">
            Imposta l'orario in cui inviare i reminder automatici ogni giorno
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 w-full sm:w-auto">
              <label htmlFor="reminder-hour" className="block text-sm font-semibold text-gray-700 mb-2">
                Ora
              </label>
              <input
                id="reminder-hour"
                type="number"
                min="0"
                max="23"
                value={reminderHour}
                onChange={(e) => setReminderHour(Number(e.target.value))}
                disabled={!serverHealthy}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex-1 w-full sm:w-auto">
              <label htmlFor="reminder-minute" className="block text-sm font-semibold text-gray-700 mb-2">
                Minuti
              </label>
              <input
                id="reminder-minute"
                type="number"
                min="0"
                max="59"
                value={reminderMinute}
                onChange={(e) => setReminderMinute(Number(e.target.value))}
                disabled={!serverHealthy}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="pt-0 sm:pt-7 w-full sm:w-auto flex justify-center">
              <div className="bg-primary-100 px-6 py-3 rounded-lg">
                <p className="text-3xl font-bold text-primary-700 font-mono">
                  {formatTime(reminderHour, reminderMinute)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              {enableAutoReminders ? (
                <>
                  I reminder saranno inviati automaticamente alle <strong>{formatTime(reminderHour, reminderMinute)}</strong> di ogni giorno
                  per gli appuntamenti programmati per {reminderDaysBefore === 1 ? 'il giorno successivo' : `tra ${reminderDaysBefore} giorni`}.
                </>
              ) : (
                'I reminder automatici sono disabilitati. Potrai comunque inviarli manualmente dalla pagina Reminder.'
              )}
            </p>
          </div>
        </div>

        {/* Days Before Configuration */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Giorni Prima dell'Appuntamento</h3>
          <p className="text-sm text-gray-600">
            Imposta quanti giorni prima dell'appuntamento inviare il reminder
          </p>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <label htmlFor="reminder-days-before" className="block text-sm font-semibold text-gray-700 mb-2">
                Giorni prima
              </label>
              <input
                id="reminder-days-before"
                type="number"
                min="1"
                max="30"
                value={reminderDaysBefore}
                onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
                onBlur={() => {
                  if (reminderDaysBefore < 1) setReminderDaysBefore(1);
                  if (reminderDaysBefore > 30) setReminderDaysBefore(30);
                }}
                disabled={!serverHealthy}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="pt-7">
              <div className="bg-primary-100 px-6 py-3 rounded-lg">
                <p className="text-3xl font-bold text-primary-700 font-mono">
                  {reminderDaysBefore}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              {reminderDaysBefore === 1 ? (
                'Il reminder sarà inviato il giorno prima dell\'appuntamento.'
              ) : (
                <>Il reminder sarà inviato <strong>{reminderDaysBefore} giorni</strong> prima dell'appuntamento.</>
              )}
            </p>
          </div>
        </div>

        {/* Current Settings Display */}
        {settings && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 mb-2">Configurazione Attuale:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Orario invio:</span>{' '}
                <span className="font-semibold text-gray-900">
                  {formatTime(settings.reminderSendHour, settings.reminderSendMinute)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Auto-reminder:</span>{' '}
                <span className={`font-semibold ${settings.enableAutoReminders ? 'text-green-600' : 'text-gray-400'}`}>
                  {settings.enableAutoReminders ? 'Attivi' : 'Disattivati'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Giorni prima:</span>{' '}
                <span className="font-semibold text-gray-900">{settings.reminderDaysBefore}</span>
              </div>
              {settings.updatedAt && (
                <div>
                  <span className="text-gray-600">Ultimo aggiornamento:</span>{' '}
                  <span className="font-semibold text-gray-900">
                    {new Date(settings.updatedAt).toLocaleDateString('it-IT')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving || !serverHealthy}
            className="btn-primary gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Salva Impostazioni
              </>
            )}
          </button>

          <button
            onClick={loadSettings}
            disabled={isLoading || !serverHealthy}
            className="btn-secondary gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Ricarica
          </button>
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Server className="text-blue-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <p className="font-semibold text-blue-900">Come Funziona</p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>Il server controlla gli appuntamenti ogni minuto</li>
              <li>All'orario configurato, invia reminder via email ai clienti</li>
              <li>Le email contengono un link per confermare l'appuntamento</li>
              <li>Cliccando sul link, l'appuntamento passa da "Programmato" a "Confermato"</li>
              <li>Puoi anche inviare reminder manualmente dalla pagina Reminder</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderSettingsCard;
