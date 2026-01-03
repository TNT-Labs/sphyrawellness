/**
 * Dashboard Screen - Main screen for SMS reminder management
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import authService from '@/services/authService';
import reminderService from '@/services/reminderService';
import smsService from '@/services/smsService';
import workManagerService from '@/services/workManagerService';
import type { User, PendingReminder } from '@/types';

interface DashboardScreenProps {
  user: User;
  onLogout: () => void;
  onShowSettings: () => void;
  onShowLogs: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  user,
  onLogout,
  onShowSettings,
  onShowLogs,
}) => {
  const [pendingReminders, setPendingReminders] = useState<PendingReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Check SMS permission
      const hasPermission = await smsService.hasSMSPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permesso SMS Richiesto',
          'Per inviare SMS automatici, è necessario concedere il permesso SMS',
          [
            { text: 'Annulla', style: 'cancel' },
            {
              text: 'Concedi',
              onPress: () => smsService.requestSMSPermission(),
            },
          ]
        );
      }

      // Load last sync time
      const lastSyncTime = await reminderService.getLastSync();
      setLastSync(lastSyncTime);

      // Check if auto-sync is enabled (WorkManager)
      const isRunning = await workManagerService.isServiceRunning();
      setAutoSyncEnabled(isRunning);

      // Fetch pending reminders
      await fetchPendingReminders();
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const fetchPendingReminders = async () => {
    setLoading(true);
    try {
      const reminders = await reminderService.fetchPendingReminders();
      setPendingReminders(reminders);
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile caricare i reminder');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const result = await reminderService.syncAndSendReminders();

      Alert.alert(
        'Sincronizzazione Completata',
        `SMS inviati: ${result.sent}\nFalliti: ${result.failed}\nTotale: ${result.total}`
      );

      // Refresh
      await fetchPendingReminders();
      const lastSyncTime = await reminderService.getLastSync();
      setLastSync(lastSyncTime);
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Errore durante la sincronizzazione');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleAutoSync = async () => {
    try {
      if (autoSyncEnabled) {
        await workManagerService.stop();
        setAutoSyncEnabled(false);
        Alert.alert(
          'Auto-Sync Disabilitato',
          'Il servizio WorkManager è stato fermato.\n\nLe ottimizzazioni batteria sono attive.'
        );
      } else {
        await workManagerService.start();
        setAutoSyncEnabled(true);
        Alert.alert(
          'Auto-Sync Abilitato',
          'WorkManager invierà SMS in background.\n\n' +
          '✅ Ottimizzato per batteria\n' +
          '✅ Rispetta Doze mode Android\n' +
          '⏸️ Nessun SMS tra 20:00-09:00'
        );
      }
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile modificare auto-sync');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          onPress: async () => {
            // Stop WorkManager service
            if (autoSyncEnabled) {
              await workManagerService.stop();
            }
            await authService.logout();
            onLogout();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SMS Reminder</Text>
          <Text style={styles.headerSubtitle}>Benvenuto, {user.nome}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={onShowSettings} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchPendingReminders} />
        }>
        {/* Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Statistiche</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pendingReminders.length}</Text>
              <Text style={styles.statLabel}>Reminder Pendenti</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, autoSyncEnabled && styles.statValueActive]}>
                {autoSyncEnabled ? 'ON' : 'OFF'}
              </Text>
              <Text style={styles.statLabel}>Auto-Sync</Text>
            </View>
          </View>
          {lastSync && (
            <Text style={styles.lastSyncText}>
              Ultimo sync: {lastSync.toLocaleString('it-IT')}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Azioni</Text>

          <TouchableOpacity
            style={[styles.actionButton, syncing && styles.actionButtonDisabled]}
            onPress={handleManualSync}
            disabled={syncing}>
            {syncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.actionButtonIcon}>📤</Text>
                <Text style={styles.actionButtonText}>Sincronizza Ora</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.actionButtonSecondary,
              autoSyncEnabled && styles.actionButtonActive,
            ]}
            onPress={handleToggleAutoSync}>
            <Text style={styles.actionButtonIcon}>
              {autoSyncEnabled ? '⏸️' : '▶️'}
            </Text>
            <Text style={styles.actionButtonText}>
              {autoSyncEnabled ? 'Ferma Auto-Sync' : 'Avvia Auto-Sync'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonInfo]}
            onPress={onShowLogs}>
            <Text style={styles.actionButtonIcon}>📋</Text>
            <Text style={styles.actionButtonText}>Visualizza Log</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Reminders List */}
        {pendingReminders.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reminder da Inviare</Text>
            {pendingReminders.map((reminder, index) => (
              <View key={index} style={styles.reminderItem}>
                <Text style={styles.reminderCustomer}>
                  {reminder.appointment.customer.firstName}{' '}
                  {reminder.appointment.customer.lastName}
                </Text>
                <Text style={styles.reminderService}>
                  {reminder.appointment.service.name}
                </Text>
                <Text style={styles.reminderDate}>
                  {reminder.appointment.date} - {reminder.appointment.startTime}
                </Text>
                <Text style={styles.reminderPhone}>
                  📱 {reminder.appointment.customer.phone}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#db2777',
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 15,
  },
  iconButtonText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#db2777',
  },
  statValueActive: {
    color: '#10b981',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 15,
  },
  actionButton: {
    backgroundColor: '#db2777',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionButtonSecondary: {
    backgroundColor: '#6b7280',
  },
  actionButtonActive: {
    backgroundColor: '#10b981',
  },
  actionButtonInfo: {
    backgroundColor: '#3b82f6',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reminderItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  reminderCustomer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  reminderService: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  reminderDate: {
    fontSize: 14,
    color: '#db2777',
    marginTop: 4,
  },
  reminderPhone: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
