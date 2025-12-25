import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, Database, HardDrive, AlertCircle, CheckCircle, Shield, Clock, Users, Tag, Plus, Edit, Cloud, RefreshCw, Wifi, WifiOff, FileText } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { useConfirmWithInput } from '../hooks/useConfirmWithInput';
import { exportAllData, clearAllData, getDBStats, importAllData, deleteDatabase } from '../utils/db';
import { getAvailableBackups, restoreFromBackup, deleteBackup } from '../utils/autoBackup';
import { getStoragePersistenceInfo, requestStoragePersistence } from '../utils/storagePersistence';
import { loadSettings, loadSettingsWithPassword, saveSettings } from '../utils/storage';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { StaffRole, ServiceCategory, SyncStatus } from '../types';
import { logger, LogEntry } from '../utils/logger';
import { startSync, stopSync, testCouchDBConnection, performOneTimeSync, getSyncStatus, onSyncStatusChange } from '../utils/pouchdbSync';
import ReminderSettingsCard from '../components/settings/ReminderSettingsCard';
import UserManagementCard from '../components/settings/UserManagementCard';

type SettingsTab = 'general' | 'configuration' | 'advanced' | 'users';

const Settings: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();
  const { confirm: confirmWithInput, ConfirmationDialog: ConfirmationDialogWithInput } = useConfirmWithInput();
  const { staffRoles, addStaffRole, updateStaffRole, deleteStaffRole, serviceCategories, addServiceCategory, updateServiceCategory, deleteServiceCategory, refreshAppointments, refreshReminders } = useApp();
  const { canModifySettings, logout } = useAuth();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDBStats>> | null>(null);
  const [backups, setBackups] = useState<ReturnType<typeof getAvailableBackups>>([]);
  const [storageInfo, setStorageInfo] = useState<Awaited<ReturnType<typeof getStoragePersistenceInfo>> | null>(null);
  const [idleTimeout, setIdleTimeout] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // CouchDB Sync state
  const [syncEnabled, setSyncEnabled] = useState<boolean>(false);
  const [couchdbUrl, setCouchdbUrl] = useState<string>('');
  const [couchdbUsername, setCouchdbUsername] = useState<string>('');
  const [couchdbPassword, setCouchdbPassword] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Staff Roles state
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleFormData, setRoleFormData] = useState({ name: '' });

  // Service Categories state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', color: '#3b82f6' });

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info' | 'log' | 'debug'>('all');

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        loadStats(),
        loadBackups(),
        loadStorageInfo(),
        loadAppSettings(),
      ]);
    };

    initialize();

    // Subscribe to sync status changes
    const unsubscribe = onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadAppSettings = async () => {
    try {
      const settings = await loadSettingsWithPassword();
      setIdleTimeout(settings.idleTimeout);
      setSyncEnabled(settings.syncEnabled || false);
      setCouchdbUrl(settings.couchdbUrl || '');
      setCouchdbUsername(settings.couchdbUsername || '');
      setCouchdbPassword(settings.couchdbPassword || '');
    } catch (error) {
      logger.error('Failed to load settings:', error);
      // Load without password as fallback
      const settings = loadSettings();
      setIdleTimeout(settings.idleTimeout);
      setSyncEnabled(settings.syncEnabled || false);
      setCouchdbUrl(settings.couchdbUrl || '');
      setCouchdbUsername(settings.couchdbUsername || '');
    }
  };

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
      logger.error(error);
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
        await refreshAppointments();
        await refreshReminders();
        showSuccess('Backup importato con successo!');
      } catch (error) {
        showError('Errore durante l\'importazione del backup');
        logger.error(error);
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
      await refreshAppointments();
      await refreshReminders();
      showSuccess('Backup ripristinato con successo!');
    } catch (error) {
      showError('Errore durante il ripristino del backup');
      logger.error(error);
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
      logger.error(error);
    }
  };

  const handleClearAllData = async () => {
    const confirmed = await confirmWithInput({
      title: 'ATTENZIONE: Cancellazione Totale Dati',
      message: 'Questa operazione cancellerà FISICAMENTE e PERMANENTEMENTE tutti i database e tutti i dati dell\'applicazione. Verrai riportato al login. Questa azione NON può essere annullata! Assicurati di aver esportato un backup prima di procedere.',
      confirmText: 'Cancella Tutto',
      expectedInput: 'CANCELLA',
      inputLabel: 'Digita "CANCELLA" per confermare',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      // 1. Cancella fisicamente il database IndexedDB
      await deleteDatabase();
      logger.info('Database IndexedDB cancellato fisicamente');

      // 2. Cancella tutto il localStorage
      localStorage.clear();
      logger.info('localStorage cancellato completamente');

      // 3. Cancella sessionStorage
      sessionStorage.clear();
      logger.info('sessionStorage cancellato completamente');

      // 4. Mostra messaggio di successo prima del logout
      showSuccess('Tutti i dati sono stati cancellati. Verrai riportato al login...');

      // 5. Logout e redirect al login (dopo un breve delay per mostrare il messaggio)
      setTimeout(() => {
        logout();
        // Il redirect al login avverrà automaticamente tramite il router
      }, 1500);
    } catch (error) {
      showError('Errore durante la cancellazione dei dati');
      logger.error(error);
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
      logger.error(error);
    }
  };

  const getTotalItems = () => {
    if (!stats) return 0;
    return Object.values(stats).reduce((sum, count) => (sum as number) + (count as number), 0);
  };

  const handleIdleTimeoutChange = async (value: number) => {
    setIdleTimeout(value);
    const settings = loadSettings();
    settings.idleTimeout = value;
    await saveSettings(settings);
    // Trigger custom event so App.tsx can react immediately
    window.dispatchEvent(new Event('settingsChanged'));
    showSuccess('Impostazione salvata');
  };

  // CouchDB Sync handlers
  const handleToggleSync = async (enabled: boolean) => {
    setSyncEnabled(enabled);
    const settings = loadSettings();
    settings.syncEnabled = enabled;
    await saveSettings(settings);

    if (enabled && settings.couchdbUrl) {
      const success = await startSync();
      if (success) {
        showSuccess('Sincronizzazione avviata');
      } else {
        showError('Errore durante l\'avvio della sincronizzazione');
        setSyncEnabled(false);
        settings.syncEnabled = false;
        await saveSettings(settings);
      }
    } else if (!enabled) {
      await stopSync();
      showSuccess('Sincronizzazione disabilitata');
    }

    window.dispatchEvent(new Event('settingsChanged'));
  };

  const handleSaveCouchDBSettings = async () => {
    const settings = loadSettings();
    settings.couchdbUrl = couchdbUrl.trim();
    settings.couchdbUsername = couchdbUsername.trim();
    settings.couchdbPassword = couchdbPassword;
    await saveSettings(settings);
    showSuccess('Impostazioni CouchDB salvate');
    window.dispatchEvent(new Event('settingsChanged'));
  };

  const handleTestConnection = async () => {
    if (!couchdbUrl.trim()) {
      showError('Inserisci l\'URL del server CouchDB');
      return;
    }

    setIsTestingConnection(true);
    try {
      const result = await testCouchDBConnection(
        couchdbUrl.trim(),
        couchdbUsername.trim() || undefined,
        couchdbPassword || undefined
      );

      if (result.success) {
        showSuccess('Connessione riuscita!');
      } else {
        showError(`Connessione fallita: ${result.error}`);
      }
    } catch (error) {
      showError('Errore durante il test di connessione');
      logger.error(error);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleManualSync = async () => {
    if (!couchdbUrl.trim()) {
      showError('Configura prima l\'URL del server CouchDB');
      return;
    }

    try {
      const success = await performOneTimeSync();
      if (success) {
        showSuccess('Sincronizzazione completata');
      } else {
        showError('Errore durante la sincronizzazione');
      }
    } catch (error) {
      showError('Errore durante la sincronizzazione');
      logger.error(error);
    }
  };

  const getSyncStatusColor = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return 'text-blue-600';
      case 'idle':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'paused':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return 'Sincronizzazione in corso...';
      case 'idle':
        return 'Sincronizzato';
      case 'error':
        return `Errore: ${syncStatus.error || 'Sconosciuto'}`;
      case 'paused':
        return 'In pausa';
      default:
        return 'Non attivo';
    }
  };

  // Staff Roles handlers
  const handleAddRole = async () => {
    if (!roleFormData.name.trim()) {
      showError('Il nome del ruolo è obbligatorio');
      return;
    }

    const newRole: StaffRole = {
      id: `role-${Date.now()}`,
      name: roleFormData.name.trim(),
      isActive: true,
    };

    try {
      await addStaffRole(newRole);
      setRoleFormData({ name: '' });
      setIsAddingRole(false);
      showSuccess('Ruolo aggiunto');
    } catch (error) {
      showError('Errore durante l\'aggiunta del ruolo');
      logger.error(error);
    }
  };

  const handleEditRole = async () => {
    if (!editingRoleId || !roleFormData.name.trim()) {
      showError('Il nome del ruolo è obbligatorio');
      return;
    }

    const existingRole = staffRoles.find(r => r.id === editingRoleId);
    if (!existingRole) return;

    const updatedRole: StaffRole = {
      ...existingRole,
      name: roleFormData.name.trim(),
    };

    try {
      await updateStaffRole(updatedRole);
      setRoleFormData({ name: '' });
      setEditingRoleId(null);
      showSuccess('Ruolo aggiornato');
    } catch (error) {
      showError('Errore durante l\'aggiornamento del ruolo');
      logger.error(error);
    }
  };

  const handleDeleteRole = async (id: string) => {
    const confirmed = await confirm({
      title: 'Elimina Ruolo',
      message: 'Eliminare questo ruolo? Il personale con questo ruolo dovrà essere aggiornato manualmente.',
      confirmText: 'Elimina',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteStaffRole(id);
      showSuccess('Ruolo eliminato');
    } catch (error) {
      showError('Errore durante l\'eliminazione del ruolo');
      logger.error(error);
    }
  };

  const handleToggleRoleActive = async (role: StaffRole) => {
    try {
      await updateStaffRole({ ...role, isActive: !role.isActive });
      showSuccess(role.isActive ? 'Ruolo disattivato' : 'Ruolo attivato');
    } catch (error) {
      showError('Errore durante l\'aggiornamento del ruolo');
      logger.error(error);
    }
  };

  // Service Categories handlers
  const handleAddCategory = async () => {
    if (!categoryFormData.name.trim()) {
      showError('Il nome della categoria è obbligatorio');
      return;
    }

    const newCategory: ServiceCategory = {
      id: `cat-${Date.now()}`,
      name: categoryFormData.name.trim(),
      color: categoryFormData.color,
      isActive: true,
    };

    try {
      await addServiceCategory(newCategory);
      setCategoryFormData({ name: '', color: '#3b82f6' });
      setIsAddingCategory(false);
      showSuccess('Categoria aggiunta');
    } catch (error) {
      showError('Errore durante l\'aggiunta della categoria');
      logger.error(error);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategoryId || !categoryFormData.name.trim()) {
      showError('Il nome della categoria è obbligatorio');
      return;
    }

    const existingCategory = serviceCategories.find(c => c.id === editingCategoryId);
    if (!existingCategory) return;

    const updatedCategory: ServiceCategory = {
      ...existingCategory,
      name: categoryFormData.name.trim(),
      color: categoryFormData.color,
    };

    try {
      await updateServiceCategory(updatedCategory);
      setCategoryFormData({ name: '', color: '#3b82f6' });
      setEditingCategoryId(null);
      showSuccess('Categoria aggiornata');
    } catch (error) {
      showError('Errore durante l\'aggiornamento della categoria');
      logger.error(error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const confirmed = await confirm({
      title: 'Elimina Categoria',
      message: 'Eliminare questa categoria? I servizi e le specializzazioni con questa categoria dovranno essere aggiornati manualmente.',
      confirmText: 'Elimina',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteServiceCategory(id);
      showSuccess('Categoria eliminata');
    } catch (error) {
      showError('Errore durante l\'eliminazione della categoria');
      logger.error(error);
    }
  };

  const handleToggleCategoryActive = async (category: ServiceCategory) => {
    try {
      await updateServiceCategory({ ...category, isActive: !category.isActive });
      showSuccess(category.isActive ? 'Categoria disattivata' : 'Categoria attivata');
    } catch (error) {
      showError('Errore durante l\'aggiornamento della categoria');
      logger.error(error);
    }
  };

  const startEditRole = (role: StaffRole) => {
    setRoleFormData({ name: role.name });
    setEditingRoleId(role.id);
    setIsAddingRole(false);
  };

  const startEditCategory = (category: ServiceCategory) => {
    setCategoryFormData({ name: category.name, color: category.color });
    setEditingCategoryId(category.id);
    setIsAddingCategory(false);
  };

  const cancelRoleForm = () => {
    setRoleFormData({ name: '' });
    setEditingRoleId(null);
    setIsAddingRole(false);
  };

  const cancelCategoryForm = () => {
    setCategoryFormData({ name: '', color: '#3b82f6' });
    setEditingCategoryId(null);
    setIsAddingCategory(false);
  };

  // Logs handlers
  const loadLogs = () => {
    const allLogs = logger.getLogs();
    setLogs(allLogs);
  };

  const handleExportLogs = () => {
    try {
      const logsData = logger.getLogs();
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `sphyra-logs-${timestamp}.json`;

      const blob = new Blob([JSON.stringify(logsData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      showSuccess('Logs esportati con successo!');
    } catch (error) {
      showError('Errore durante l\'esportazione dei logs');
      logger.error(error);
    }
  };

  const handleClearLogs = async () => {
    const confirmed = await confirm({
      title: 'Cancella Logs',
      message: 'Cancellare tutti i logs memorizzati? Questa operazione non può essere annullata.',
      confirmText: 'Cancella',
      variant: 'warning',
    });

    if (!confirmed) return;

    try {
      logger.clearLogs();
      setLogs([]);
      showSuccess('Logs cancellati');
    } catch (error) {
      showError('Errore durante la cancellazione dei logs');
      logger.error(error);
    }
  };

  const getFilteredLogs = () => {
    if (logFilter === 'all') return logs;
    return logs.filter(log => log.level === logFilter);
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'debug':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const tabs = [
    { id: 'general' as SettingsTab, label: 'Generali', icon: Clock },
    { id: 'configuration' as SettingsTab, label: 'Configurazione', icon: Shield },
    { id: 'users' as SettingsTab, label: 'Utenti', icon: Users },
    { id: 'advanced' as SettingsTab, label: 'Avanzate', icon: AlertCircle },
  ];

  // Check if user is a standard user (not RESPONSABILE)
  const isStandardUser = !canModifySettings();

  return (
    <>
      <ConfirmationDialog />
      <ConfirmationDialogWithInput />
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Impostazioni</h1>
          <p className="text-gray-600 mt-1">
            {isStandardUser
              ? 'Visualizza i logs dell\'applicazione'
              : 'Gestisci configurazione, backup e sicurezza dell\'applicazione'
            }
          </p>
        </div>

        {/* Tabs Navigation - Only for RESPONSABILE */}
        {!isStandardUser && (
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-2 sm:space-x-4 md:space-x-8 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0
                      ${isActive
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon size={18} className="flex-shrink-0 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Standard users only see logs */}
          {isStandardUser ? (
            <>
              {/* Logs Viewer - For standard users */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FileText className="text-primary-600 mr-2" size={24} />
                    <h2 className="text-xl font-bold text-gray-900">Visualizza Logs</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        loadLogs();
                        setShowLogs(!showLogs);
                      }}
                      className="btn-primary text-sm"
                    >
                      {showLogs ? 'Nascondi' : 'Mostra'} Logs ({logger.getLogsCount()})
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                    <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <p className="font-semibold text-blue-900">Diagnostica Problemi</p>
                      <p className="text-sm text-blue-700">
                        I logs registrano eventi, errori e avvisi dell'applicazione. Consultali per diagnosticare problemi o errori.
                        I logs vengono memorizzati solo in sessione e non vengono inviati esternamente.
                      </p>
                    </div>
                  </div>

                  {showLogs && (
                    <div className="space-y-3">
                      {/* Controls */}
                      <div className="flex flex-wrap gap-3">
                        <select
                          value={logFilter}
                          onChange={(e) => setLogFilter(e.target.value as typeof logFilter)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="all">Tutti i Livelli</option>
                          <option value="error">Solo Errori</option>
                          <option value="warn">Solo Avvisi</option>
                          <option value="info">Solo Info</option>
                          <option value="log">Solo Log</option>
                          <option value="debug">Solo Debug</option>
                        </select>
                        <button
                          onClick={handleExportLogs}
                          className="btn-secondary text-sm"
                        >
                          <Download size={16} className="inline mr-1" />
                          Esporta
                        </button>
                        <button
                          onClick={handleClearLogs}
                          className="btn-secondary text-sm"
                        >
                          <Trash2 size={16} className="inline mr-1" />
                          Cancella
                        </button>
                      </div>

                      {/* Logs List */}
                      <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                        {getFilteredLogs().length === 0 ? (
                          <p className="text-gray-400 text-center py-4">Nessun log disponibile</p>
                        ) : (
                          <div className="space-y-2">
                            {getFilteredLogs().reverse().map((log, index) => (
                              <div
                                key={index}
                                className={`p-3 rounded ${getLevelColor(log.level)}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-mono text-xs uppercase font-bold">
                                        {log.level}
                                      </span>
                                      <span className="text-xs opacity-75">
                                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: it })}
                                      </span>
                                    </div>
                                    <p className="text-sm font-mono break-all">{log.message}</p>
                                    {log.details && log.details.length > 0 && (
                                      <details className="mt-2">
                                        <summary className="text-xs cursor-pointer font-semibold">
                                          Dettagli
                                        </summary>
                                        <pre className="text-xs mt-2 p-2 bg-black bg-opacity-10 rounded overflow-x-auto">
                                          {JSON.stringify(log.details, null, 2)}
                                        </pre>
                                      </details>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm text-gray-600 px-2">
                        <span>
                          Mostrando {getFilteredLogs().length} di {logs.length} logs
                        </span>
                        <span className="text-xs">
                          Max: {logger.getLogsCount()} / 1000
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* GENERAL TAB */}
              {activeTab === 'general' && (
            <>
              {/* App Settings */}
              <div className="card">
                <div className="flex items-center mb-4">
                  <Clock className="text-primary-600 mr-2" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">Impostazioni Applicazione</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="idleTimeout" className="block text-sm font-semibold text-gray-700 mb-2">
                      Timeout Inattività
                    </label>
                    <p className="text-sm text-gray-600 mb-3">
                      Mostra lo splash screen dopo un periodo di inattività (0 = disabilitato)
                    </p>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        id="idleTimeout"
                        min="0"
                        max="30"
                        step="1"
                        value={idleTimeout}
                        onChange={(e) => handleIdleTimeoutChange(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                      />
                      <div className="w-24 text-center">
                        <span className="text-2xl font-bold text-primary-600">{idleTimeout}</span>
                        <span className="text-sm text-gray-600 ml-1">min</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Disabilitato</span>
                      <span>30 minuti</span>
                    </div>
                    {idleTimeout === 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          Lo splash screen è disabilitato. L'app non mostrerà alcuna schermata durante l'inattività.
                        </p>
                      </div>
                    )}
                    {idleTimeout > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          Lo splash screen apparirà dopo {idleTimeout} {idleTimeout === 1 ? 'minuto' : 'minuti'} di inattività.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
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
                          <div key={backup.date} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {format(new Date(backup.date), 'dd MMMM yyyy', { locale: it })}
                              </p>
                              <p className="text-sm text-gray-600">
                                {Object.values(backup.itemsCount).reduce((sum, count) => sum + count, 0)} record totali
                              </p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleRestoreBackup(backup.date)}
                                className="flex-1 sm:flex-none px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-semibold touch-manipulation"
                              >
                                Ripristina
                              </button>
                              <button
                                onClick={() => handleDeleteBackup(backup.date)}
                                className="px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm font-semibold touch-manipulation"
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
            </>
          )}

          {/* CONFIGURATION TAB */}
          {activeTab === 'configuration' && (
            <>
              {/* Staff Roles Management */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Users className="text-primary-600 mr-2" size={24} />
                    <h2 className="text-xl font-bold text-gray-900">Ruoli Personale</h2>
                  </div>
                  <button
                    onClick={() => {
                      setIsAddingRole(true);
                      setEditingRoleId(null);
                    }}
                    className="btn-primary text-sm"
                  >
                    <Plus size={16} className="inline mr-1" />
                    Aggiungi Ruolo
                  </button>
                </div>

                {/* Add/Edit Role Form */}
                {(isAddingRole || editingRoleId) && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      {editingRoleId ? 'Modifica Ruolo' : 'Nuovo Ruolo'}
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="Nome ruolo"
                        value={roleFormData.name}
                        onChange={(e) => setRoleFormData({ name: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                      <div className="flex gap-3 sm:flex-shrink-0">
                        <button
                          onClick={editingRoleId ? handleEditRole : handleAddRole}
                          className="btn-primary flex-1 sm:flex-none touch-manipulation"
                        >
                          {editingRoleId ? 'Salva' : 'Aggiungi'}
                        </button>
                        <button
                          onClick={cancelRoleForm}
                          className="btn-secondary flex-1 sm:flex-none touch-manipulation"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Roles List */}
                <div className="space-y-2">
                  {staffRoles.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nessun ruolo configurato</p>
                  ) : (
                    staffRoles.map((role) => (
                      <div
                        key={role.id}
                        className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg ${
                          role.isActive ? 'bg-gray-50' : 'bg-gray-100 opacity-60'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{role.name}</p>
                          <p className="text-sm text-gray-600">
                            {role.isActive ? 'Attivo' : 'Disattivato'}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleToggleRoleActive(role)}
                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-semibold touch-manipulation ${
                              role.isActive
                                ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}
                          >
                            {role.isActive ? 'Disattiva' : 'Attiva'}
                          </button>
                          <button
                            onClick={() => startEditRole(role)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 text-sm font-semibold touch-manipulation"
                          >
                            <Edit size={16} className="inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 text-sm font-semibold touch-manipulation"
                          >
                            <Trash2 size={16} className="inline" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Service Categories Management */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Tag className="text-primary-600 mr-2" size={24} />
                    <h2 className="text-xl font-bold text-gray-900">Categorie Servizi</h2>
                  </div>
                  <button
                    onClick={() => {
                      setIsAddingCategory(true);
                      setEditingCategoryId(null);
                    }}
                    className="btn-primary text-sm"
                  >
                    <Plus size={16} className="inline mr-1" />
                    Aggiungi Categoria
                  </button>
                </div>

                {/* Add/Edit Category Form */}
                {(isAddingCategory || editingCategoryId) && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      {editingCategoryId ? 'Modifica Categoria' : 'Nuova Categoria'}
                    </h3>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          placeholder="Nome categoria"
                          value={categoryFormData.name}
                          onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <label htmlFor="category-color" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                            Colore:
                          </label>
                          <input
                            id="category-color"
                            type="color"
                            value={categoryFormData.color}
                            onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                            className="w-12 h-10 rounded cursor-pointer flex-shrink-0"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={editingCategoryId ? handleEditCategory : handleAddCategory}
                          className="btn-primary flex-1 touch-manipulation"
                        >
                          {editingCategoryId ? 'Salva' : 'Aggiungi'}
                        </button>
                        <button
                          onClick={cancelCategoryForm}
                          className="btn-secondary flex-1 touch-manipulation"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Categories List */}
                <div className="space-y-2">
                  {serviceCategories.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nessuna categoria configurata</p>
                  ) : (
                    serviceCategories.map((category) => (
                      <div
                        key={category.id}
                        className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg ${
                          category.isActive ? 'bg-gray-50' : 'bg-gray-100 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-6 h-6 rounded flex-shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{category.name}</p>
                            <p className="text-sm text-gray-600">
                              {category.isActive ? 'Attiva' : 'Disattivata'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleToggleCategoryActive(category)}
                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-semibold touch-manipulation ${
                              category.isActive
                                ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}
                          >
                            {category.isActive ? 'Disattiva' : 'Attiva'}
                          </button>
                          <button
                            onClick={() => startEditCategory(category)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 text-sm font-semibold touch-manipulation"
                          >
                            <Edit size={16} className="inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 text-sm font-semibold touch-manipulation"
                          >
                            <Trash2 size={16} className="inline" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Reminder Settings */}
              <ReminderSettingsCard />

              {/* CouchDB Sync Settings */}
              <div className="card">
                <div className="flex items-center mb-4">
                  <Cloud className="text-primary-600 mr-2" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">Sincronizzazione CouchDB</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                    <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <p className="font-semibold text-blue-900">Sincronizzazione Multi-Dispositivo</p>
                      <p className="text-sm text-blue-700">
                        Abilita la sincronizzazione con CouchDB per mantenere i tuoi dati aggiornati su tutti i dispositivi.
                        Puoi configurare il server in seguito senza dover programmare nulla.
                      </p>
                    </div>
                  </div>

                  {/* Enable/Disable Sync */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">Abilita Sincronizzazione</p>
                      <p className="text-sm text-gray-600">Attiva la sincronizzazione automatica con CouchDB</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncEnabled}
                        onChange={(e) => handleToggleSync(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  {/* Sync Status */}
                  {syncEnabled && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {syncStatus.status === 'syncing' && <RefreshCw className="animate-spin text-blue-600" size={20} />}
                        {syncStatus.status === 'idle' && <CheckCircle className="text-green-600" size={20} />}
                        {syncStatus.status === 'error' && <AlertCircle className="text-red-600" size={20} />}
                        {!syncStatus.isActive && <WifiOff className="text-gray-400" size={20} />}
                        <div>
                          <p className={`font-semibold ${getSyncStatusColor()}`}>
                            {getSyncStatusText()}
                          </p>
                          {syncStatus.lastSync && (
                            <p className="text-sm text-gray-600">
                              Ultima sincronizzazione: {format(new Date(syncStatus.lastSync), 'dd/MM/yyyy HH:mm', { locale: it })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CouchDB Configuration */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Configurazione Server</h3>

                    <div>
                      <label htmlFor="couchdb-url" className="block text-sm font-semibold text-gray-700 mb-1">
                        URL Server CouchDB
                      </label>
                      <input
                        id="couchdb-url"
                        type="url"
                        placeholder="https://your-couchdb-server.com:5984"
                        value={couchdbUrl}
                        onChange={(e) => setCouchdbUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Esempio: https://admin:password@localhost:5984 oppure https://username.cloudant.com
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="couchdb-username" className="block text-sm font-semibold text-gray-700 mb-1">
                          Username (opzionale)
                        </label>
                        <input
                          id="couchdb-username"
                          type="text"
                          placeholder="admin"
                          value={couchdbUsername}
                          onChange={(e) => setCouchdbUsername(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="couchdb-password" className="block text-sm font-semibold text-gray-700 mb-1">
                          Password (opzionale)
                        </label>
                        <div className="relative">
                          <input
                            id="couchdb-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={couchdbPassword}
                            onChange={(e) => setCouchdbPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPassword ? 'Nascondi' : 'Mostra'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleSaveCouchDBSettings}
                        className="btn-primary w-full sm:w-auto touch-manipulation"
                      >
                        Salva Configurazione
                      </button>
                      <button
                        onClick={handleTestConnection}
                        disabled={isTestingConnection || !couchdbUrl.trim()}
                        className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto touch-manipulation"
                      >
                        {isTestingConnection ? (
                          <>
                            <RefreshCw className="animate-spin" size={16} />
                            Test in corso...
                          </>
                        ) : (
                          <>
                            <Wifi size={16} />
                            Testa Connessione
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleManualSync}
                        disabled={syncStatus.status === 'syncing' || !couchdbUrl.trim()}
                        className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto touch-manipulation"
                      >
                        <RefreshCw size={16} />
                        Sincronizza Ora
                      </button>
                    </div>
                  </div>
                </div>
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
            </>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <>
              <UserManagementCard />
            </>
          )}

          {/* ADVANCED TAB */}
          {activeTab === 'advanced' && (
            <>
              {/* Logs Viewer */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FileText className="text-primary-600 mr-2" size={24} />
                    <h2 className="text-xl font-bold text-gray-900">Visualizza Logs</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        loadLogs();
                        setShowLogs(!showLogs);
                      }}
                      className="btn-primary text-sm"
                    >
                      {showLogs ? 'Nascondi' : 'Mostra'} Logs ({logger.getLogsCount()})
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                    <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <p className="font-semibold text-blue-900">Diagnostica Problemi</p>
                      <p className="text-sm text-blue-700">
                        I logs registrano eventi, errori e avvisi dell'applicazione. Consultali per diagnosticare problemi o errori.
                        I logs vengono memorizzati solo in sessione e non vengono inviati esternamente.
                      </p>
                    </div>
                  </div>

                  {showLogs && (
                    <div className="space-y-3">
                      {/* Controls */}
                      <div className="flex flex-wrap gap-3">
                        <select
                          value={logFilter}
                          onChange={(e) => setLogFilter(e.target.value as typeof logFilter)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="all">Tutti i Livelli</option>
                          <option value="error">Solo Errori</option>
                          <option value="warn">Solo Avvisi</option>
                          <option value="info">Solo Info</option>
                          <option value="log">Solo Log</option>
                          <option value="debug">Solo Debug</option>
                        </select>
                        <button
                          onClick={handleExportLogs}
                          className="btn-secondary text-sm"
                        >
                          <Download size={16} className="inline mr-1" />
                          Esporta
                        </button>
                        <button
                          onClick={handleClearLogs}
                          className="btn-secondary text-sm"
                        >
                          <Trash2 size={16} className="inline mr-1" />
                          Cancella
                        </button>
                      </div>

                      {/* Logs List */}
                      <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                        {getFilteredLogs().length === 0 ? (
                          <p className="text-gray-400 text-center py-4">Nessun log disponibile</p>
                        ) : (
                          <div className="space-y-2">
                            {getFilteredLogs().reverse().map((log, index) => (
                              <div
                                key={index}
                                className={`p-3 rounded ${getLevelColor(log.level)}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-mono text-xs uppercase font-bold">
                                        {log.level}
                                      </span>
                                      <span className="text-xs opacity-75">
                                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: it })}
                                      </span>
                                    </div>
                                    <p className="text-sm font-mono break-all">{log.message}</p>
                                    {log.details && log.details.length > 0 && (
                                      <details className="mt-2">
                                        <summary className="text-xs cursor-pointer font-semibold">
                                          Dettagli
                                        </summary>
                                        <pre className="text-xs mt-2 p-2 bg-black bg-opacity-10 rounded overflow-x-auto">
                                          {JSON.stringify(log.details, null, 2)}
                                        </pre>
                                      </details>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm text-gray-600 px-2">
                        <span>
                          Mostrando {getFilteredLogs().length} di {logs.length} logs
                        </span>
                        <span className="text-xs">
                          Max: {logger.getLogsCount()} / 1000
                        </span>
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
            </>
          )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Settings;
