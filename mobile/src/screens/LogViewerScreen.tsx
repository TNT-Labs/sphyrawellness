/**
 * Log Viewer Screen - View and export app logs
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import logger, { LogEntry, LogLevel } from '@/utils/logger';
import { format } from 'date-fns';

interface LogViewerScreenProps {
  onBack: () => void;
}

export const LogViewerScreen: React.FC<LogViewerScreenProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [stats, setStats] = useState<{
    total: number;
    byLevel: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await logger.getLogs();
      setLogs(allLogs.reverse()); // Show newest first

      const statistics = await logger.getStats();
      setStats(statistics);
    } catch (error) {
      console.error('Error loading logs:', error);
      Alert.alert('Errore', 'Impossibile caricare i log');
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Cancella Log',
      'Sei sicuro di voler cancellare tutti i log? Questa azione non può essere annullata.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cancella',
          style: 'destructive',
          onPress: async () => {
            await logger.clearLogs();
            await loadLogs();
            Alert.alert('Completato', 'Tutti i log sono stati cancellati');
          },
        },
      ]
    );
  };

  const handleExportLogs = async () => {
    try {
      const logText = await logger.exportLogsAsText();
      await Share.share({
        message: logText,
        title: 'Sphyra SMS Reminder - Export Log',
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      Alert.alert('Errore', 'Impossibile esportare i log');
    }
  };

  const getFilteredLogs = () => {
    if (filter === 'ALL') return logs;
    return logs.filter(log => log.level === filter);
  };

  const getColorForLevel = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG:
        return '#6b7280';
      case LogLevel.INFO:
        return '#3b82f6';
      case LogLevel.WARN:
        return '#f59e0b';
      case LogLevel.ERROR:
        return '#ef4444';
      case LogLevel.SUCCESS:
        return '#10b981';
      default:
        return '#333';
    }
  };

  const getEmojiForLevel = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍';
      case LogLevel.INFO:
        return 'ℹ️';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      case LogLevel.SUCCESS:
        return '✅';
      default:
        return '📝';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      return format(new Date(timestamp), 'dd/MM HH:mm:ss');
    } catch {
      return timestamp;
    }
  };

  const filteredLogs = getFilteredLogs();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Sistema</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Statistics */}
      {stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Statistiche</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>Totale: {stats.total}</Text>
            {Object.entries(stats.byLevel).map(([level, count]) => (
              <Text key={level} style={styles.statsText}>
                {getEmojiForLevel(level as LogLevel)} {count}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['ALL', LogLevel.ERROR, LogLevel.WARN, LogLevel.SUCCESS, LogLevel.INFO, LogLevel.DEBUG].map(
            (level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.filterButton,
                  filter === level && styles.filterButtonActive,
                ]}
                onPress={() => setFilter(level as any)}>
                <Text
                  style={[
                    styles.filterButtonText,
                    filter === level && styles.filterButtonTextActive,
                  ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleExportLogs}>
          <Text style={styles.actionButtonText}>📤 Esporta</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonDanger]}
          onPress={handleClearLogs}>
          <Text style={styles.actionButtonText}>🗑️ Cancella</Text>
        </TouchableOpacity>
      </View>

      {/* Logs List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#db2777" />
          <Text style={styles.loadingText}>Caricamento log...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.logsList}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadLogs} />
          }>
          {filteredLogs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nessun log da visualizzare</Text>
            </View>
          ) : (
            filteredLogs.map((log, index) => (
              <View key={index} style={styles.logEntry}>
                <View style={styles.logHeader}>
                  <Text style={styles.logTimestamp}>
                    {formatTimestamp(log.timestamp)}
                  </Text>
                  <View style={styles.logBadges}>
                    <View
                      style={[
                        styles.logLevelBadge,
                        { backgroundColor: getColorForLevel(log.level) },
                      ]}>
                      <Text style={styles.logLevelText}>
                        {getEmojiForLevel(log.level)} {log.level}
                      </Text>
                    </View>
                    <View style={styles.logCategoryBadge}>
                      <Text style={styles.logCategoryText}>{log.category}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.logMessage}>{log.message}</Text>
                {log.data && (
                  <View style={styles.logDataContainer}>
                    <Text style={styles.logDataLabel}>Dati:</Text>
                    <Text style={styles.logData}>
                      {JSON.stringify(log.data, null, 2)}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
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
  backButton: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 60,
  },
  statsContainer: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 8,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statsText: {
    fontSize: 12,
    color: '#666',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#db2777',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonDanger: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  logsList: {
    flex: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  logEntry: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#db2777',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logTimestamp: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
  },
  logBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  logLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logLevelText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  logCategoryBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logCategoryText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '600',
  },
  logMessage: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  logDataContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  logDataLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  logData: {
    fontSize: 10,
    color: '#374151',
    fontFamily: 'monospace',
  },
});
