import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, Database, HardDrive, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { useConfirmWithInput } from '../hooks/useConfirmWithInput';
import { exportAllData, clearAllData, getDBStats, importAllData } from '../utils/db';
import { getAvailableBackups, restoreFromBackup, deleteBackup } from '../utils/autoBackup';
import { getStoragePersistenceInfo, requestStoragePersistence } from '../utils/storagePersistence';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const Settings: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();
  const { confirm: confirmWithInput, ConfirmationDialog: ConfirmationDialogWithInput } = useConfirmWithInput();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDBStats>> | null>(null);
  const [backups, setBackups] = useState<ReturnType<typeof getAvailableBackups>>([]);
  const [storageInfo, setStorageInfo] = useState<Awaited<ReturnType<typeof getStoragePersistenceInfo>> | null>(null);

  useEffect(() => {
    loadStats();
    loadBackups();
    loadStorageInfo();
  }, []);

  const loadStats = async () => {
    const dbStats = await getDBStats();
    setStats(dbStats);
  };

  const loadBackups = () => {
    const availableBackups = getAvailableBackups();
    setBackups(availableBackups);
  };

  const loadStorageInfo = async () => {
    const info = await getStoragePersistenceInfo();
    setStorageInfo(info);
  };

  const handleExportData = async () => {
    try {
      const data = await exportAllData();
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `sphyra-backup-${timestamp}.json`;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      showSuccess('Backup esportato con successo!');
    } catch (error) {
      showError('Errore durante l\'esportazione del backup');
      console.error(error);
    }
  };

  const handleImportData = async () => {
    const confirmed = await confirm({
      title: 'Importa Backup',
      message: 'Importare i dati da un file di backup? Questa operazione aggiungerà o aggiornerà i dati esistenti.',
      confirmText: 'Importa',
      variant: 'warning',
    });

    if (!confirmed) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importAllData(data);
        await loadStats();
        showSuccess('Backup importato con successo!');
        window.location.reload();
      } catch (error) {
        showError('Errore durante l\'importazione del backup');
        console.error(error);
      }
    };
    input.click();
  };

  const handleRestoreBackup = async (backupDate: string) => {
    const confirmed = await confirm({
      title: 'Ripristina Backup',
      message: `Ripristinare il backup del ${backupDate}? Questa operazione aggiungerà o aggiornerà i dati esistenti.`,
      confirmText: 'Ripristina',
      variant: 'warning',
    });

    if (!confirmed) return;

    try {
      const data = restoreFromBackup(backupDate);
      await importAllData(data);
      await loadStats();
      showSuccess('Backup ripristinato con successo!');
      window.location.reload();
    } catch (error) {
      showError('Errore durante il ripristino del backup');
      console.error(error);
    }
  };

  const handleDeleteBackup = async (backupDate: string) => {
    const confirmed = await confirm({
      title: 'Elimina Backup',
      message: `Eliminare il backup del ${backupDate}?`,
      confirmText: 'Elimina',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      deleteBackup(backupDate);
      loadBackups();
      showSuccess('Backup eliminato');
    } catch (error) {
      showError('Errore durante l\'eliminazione del backup');
      console.error(error);
    }
  };

  const handleClearAllData = async () => {
    const confirmed = await confirmWithInput({
      title: 'ATTENZIONE: Cancellazione Totale Dati',
      message: 'Questa operazione cancellerà TUTTI i dati del database in modo PERMANENTE. Questa azione NON può essere annullata! Assicurati di aver esportato un backup prima di procedere.',
      confirmText: 'Cancella Tutto',
      expectedInput: 'CANCELLA',
      inputLabel: 'Digita "CANCELLA" per confermare',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await clearAllData();
      await loadStats();
      showSuccess('Tutti i dati sono stati cancellati');
      window.location.reload();
    } catch (error) {
      showError('Errore durante la cancellazione dei dati');
      console.error(error);
    }
  };

  const handleRequestPersistence = async () => {
    try {
      const granted = await requestStoragePersistence();
      await loadStorageInfo();

      if (granted) {
        showSuccess('Persistenza dati garantita dal browser');
      } else {
        showError('Il browser ha negato la persistenza dei dati');
      }
    } catch (error) {
      showError('Errore durante la richiesta di persistenza');
      console.error(error);
    }
  };

  const getTotalItems = () => {
    if (!stats) return 0;
    return Object.values(stats).reduce((sum, count) => sum + count, 0);
  };

  return (
    <>
      <ConfirmationDialog />
      <ConfirmationDialogWithInput />
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Impostazioni</h1>
          <p className="text-gray-600 mt-1">
            Gestisci backup, sicurezza e dati dell'applicazione
          </p>
        </div>

        {/* Database Statistics */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Database className="text-primary-600 mr-2" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Statistiche Database</h2>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Clienti</p>
                <p className="text-2xl font-bold text-gray-900">{stats.customers}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Servizi</p>
                <p className="text-2xl font-bold text-gray-900">{stats.services}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Personale</p>
                <p className="text-2xl font-bold text-gray-900">{stats.staff}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Appuntamenti</p>
                <p className="text-2xl font-bold text-gray-900">{stats.appointments}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Pagamenti</p>
                <p className="text-2xl font-bold text-gray-900">{stats.payments}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Promemoria</p>
                <p className="text-2xl font-bold text-gray-900">{stats.reminders}</p>
              </div>
              <div className="bg-primary-50 p-4 rounded-lg col-span-2 md:col-span-3">
                <p className="text-sm text-primary-600">Totale Record</p>
                <p className="text-3xl font-bold text-primary-700">{getTotalItems()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Storage Persistence */}
        {storageInfo && (
          <div className="card">
            <div className="flex items-center mb-4">
              <Shield className="text-primary-600 mr-2" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Protezione Dati</h2>
            </div>

            <div className="space-y-4">
              {storageInfo.persisted ? (
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <p className="font-semibold text-green-900">Dati Protetti</p>
                    <p className="text-sm text-green-700">
                      Il browser garantisce che i tuoi dati non verranno cancellati automaticamente
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-900">Dati Non Protetti</p>
                    <p className="text-sm text-yellow-700 mb-3">
                      Il browser potrebbe cancellare i dati se lo spazio si esaurisce. Richiedi la protezione per evitarlo.
                    </p>
                    <button onClick={handleRequestPersistence} className="btn-primary text-sm">
                      Richiedi Protezione
                    </button>
                  </div>
                </div>
              )}

              {storageInfo.estimate && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Utilizzo Spazio</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-primary-600 h-3 rounded-full transition-all"
                        style={{ width: `${Math.min(storageInfo.estimate.usagePercent, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {storageInfo.estimate.usagePercent.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {storageInfo.estimate.usageMB.toFixed(2)} MB di {storageInfo.estimate.quotaMB.toFixed(0)} MB
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Backup & Restore */}
        <div className="card">
          <div className="flex items-center mb-4">
            <HardDrive className="text-primary-600 mr-2" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Backup e Ripristino</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button onClick={handleExportData} className="btn-primary">
                <Download size={20} className="inline mr-2" />
                Esporta Backup
              </button>
              <button onClick={handleImportData} className="btn-secondary">
                <Upload size={20} className="inline mr-2" />
                Importa Backup
              </button>
            </div>

            {/* Auto Backups */}
            {backups.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Backup Automatici ({backups.length})</h3>
                <div className="space-y-2">
                  {backups.map((backup) => (
                    <div key={backup.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          {format(new Date(backup.date), 'dd MMMM yyyy', { locale: it })}
                        </p>
                        <p className="text-sm text-gray-600">
                          {Object.values(backup.itemsCount).reduce((sum, count) => sum + count, 0)} record totali
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestoreBackup(backup.date)}
                          className="px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-semibold"
                        >
                          Ripristina
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup.date)}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm font-semibold"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card border-2 border-red-200">
          <div className="flex items-center mb-4">
            <AlertCircle className="text-red-600 mr-2" size={24} />
            <h2 className="text-xl font-bold text-red-900">Zona Pericolosa</h2>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-800 mb-4">
              <strong>ATTENZIONE:</strong> Questa operazione cancellerà permanentemente tutti i dati dell'applicazione.
              Assicurati di aver esportato un backup prima di procedere.
            </p>
            <button onClick={handleClearAllData} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              <Trash2 size={20} className="inline mr-2" />
              Cancella Tutti i Dati
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
