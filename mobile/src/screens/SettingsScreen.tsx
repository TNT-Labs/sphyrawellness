/**
 * Settings Screen
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import apiClient from '@/services/apiClient';
import workManagerService from '@/services/workManagerService';
import { Storage } from '@/utils/storage';
import { STORAGE_KEYS, DEFAULT_API_URL, DEFAULT_SYNC_INTERVAL } from '@/config/api';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [syncInterval, setSyncInterval] = useState(DEFAULT_SYNC_INTERVAL.toString());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load API URL
      const storedApiUrl = await Storage.getString(STORAGE_KEYS.API_URL);
      if (storedApiUrl) {
        setApiUrl(storedApiUrl);
      } else {
        setApiUrl(apiClient.getApiUrl());
      }

      // Load sync interval
      const storedInterval = await Storage.get<number>(STORAGE_KEYS.SYNC_INTERVAL);
      if (storedInterval) {
        setSyncInterval(storedInterval.toString());
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    if (!apiUrl.trim()) {
      Alert.alert('Errore', 'Inserisci un URL valido');
      return;
    }

    const intervalNum = parseInt(syncInterval);
    if (isNaN(intervalNum) || intervalNum < 15) {
      Alert.alert('Errore', 'Intervallo deve essere almeno 15 minuti (limite WorkManager)');
      return;
    }

    setSaving(true);

    try {
      // Save API URL
      await apiClient.setApiUrl(apiUrl);

      // Save sync interval (WorkManager)
      await workManagerService.setSyncInterval(intervalNum);

      Alert.alert('Successo', 'Impostazioni salvate correttamente');
      onBack();
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile salvare le impostazioni');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setSaving(true);

    try {
      // Temporarily set API URL for testing
      const currentUrl = apiClient.getApiUrl();
      await apiClient.setApiUrl(apiUrl);

      const result = await apiClient.testConnection();

      // Restore original URL if test failed
      if (!result.success) {
        await apiClient.setApiUrl(currentUrl);
      }

      if (result.success) {
        Alert.alert('Connessione OK', 'Il server è raggiungibile');
      } else {
        Alert.alert('Connessione Fallita', result.error || 'Server non raggiungibile');
      }
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile testare la connessione');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Impostazioni',
      'Ripristinare i valori predefiniti?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            setApiUrl(DEFAULT_API_URL);
            setSyncInterval(DEFAULT_SYNC_INTERVAL.toString());
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Impostazioni</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connessione Backend</Text>
          <Text style={styles.label}>URL API Server</Text>
          <TextInput
            style={styles.input}
            placeholder="http://192.168.1.100:3001/api"
            value={apiUrl}
            onChangeText={setApiUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text style={styles.hint}>
            Inserisci l'indirizzo IP del server Sphyra Wellness.
            {'\n'}Esempio: http://192.168.1.100:3001/api
          </Text>

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestConnection}
            disabled={saving}>
            <Text style={styles.testButtonText}>🔍 Testa Connessione</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sincronizzazione Automatica</Text>
          <Text style={styles.label}>Intervallo (minuti)</Text>
          <TextInput
            style={styles.input}
            placeholder="30"
            value={syncInterval}
            onChangeText={setSyncInterval}
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>
            Frequenza con cui WorkManager controllerà nuovi reminder.
            {'\n'}Minimo: 15 minuti (limite Android). Raccomandato: 60 minuti.
            {'\n'}⚡ L'intervallo viene ottimizzato automaticamente in base a batteria e orario.
            {'\n'}🌙 Nessun controllo tra 20:00-09:00.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informazioni</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versione App:</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Piattaforma:</Text>
            <Text style={styles.infoValue}>Android</Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}>
            <Text style={styles.saveButtonText}>💾 Salva Impostazioni</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>↺ Ripristina Default</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    lineHeight: 18,
  },
  testButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  buttons: {
    margin: 15,
  },
  saveButton: {
    backgroundColor: '#10b981',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#6b7280',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
