/**
 * Sphyra SMS Reminder - Main App Component
 */
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LogViewerScreen } from './screens/LogViewerScreen';
import authService from './services/authService';
import apiClient from './services/apiClient';
import backgroundServiceManager from './services/backgroundService';
import { Storage } from './utils/storage';
import { STORAGE_KEYS } from './config/api';
import type { User } from './types';

type Screen = 'login' | 'dashboard' | 'settings' | 'logs';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeApp();
    checkAutoStartService();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize API client
      await apiClient.initialize();

      // Check if user is authenticated
      const isAuthenticated = await authService.isAuthenticated();

      if (isAuthenticated) {
        // Verify token with server
        const { valid, user: verifiedUser } = await authService.verifyToken();

        if (valid && verifiedUser) {
          setUser(verifiedUser);
          setCurrentScreen('dashboard');
        } else {
          setCurrentScreen('login');
        }
      } else {
        setCurrentScreen('login');
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      setCurrentScreen('login');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if app was launched by BootReceiver to auto-start background service
   */
  const checkAutoStartService = async () => {
    try {
      // Check if launched from boot with auto-start intent
      const initialUrl = await Linking.getInitialURL();

      // Also check if auto-sync was enabled before potential reboot
      const autoSyncEnabled = await Storage.get<boolean>(STORAGE_KEYS.AUTO_SYNC_ENABLED);

      if (autoSyncEnabled) {
        console.log('Auto-sync was enabled - checking if service is running');

        // Check if service is already running
        const isRunning = await backgroundServiceManager.isServiceRunning();

        if (!isRunning) {
          console.log('Service not running - attempting to restart');

          // Wait for authentication to complete
          setTimeout(async () => {
            const isAuth = await authService.isAuthenticated();
            if (isAuth) {
              try {
                await backgroundServiceManager.start();
                console.log('Background service auto-started successfully after boot');
              } catch (error) {
                console.error('Failed to auto-start background service:', error);
              }
            }
          }, 3000); // Wait 3 seconds for auth to complete
        } else {
          console.log('Background service already running');
        }
      }
    } catch (error) {
      console.error('Error checking auto-start service:', error);
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('login');
  };

  const handleShowSettings = () => {
    setCurrentScreen('settings');
  };

  const handleShowLogs = () => {
    setCurrentScreen('logs');
  };

  const handleBackFromSettings = () => {
    if (user) {
      setCurrentScreen('dashboard');
    } else {
      setCurrentScreen('login');
    }
  };

  const handleBackFromLogs = () => {
    if (user) {
      setCurrentScreen('dashboard');
    } else {
      setCurrentScreen('login');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#db2777" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#db2777" />

      {currentScreen === 'login' && (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onShowSettings={handleShowSettings}
        />
      )}

      {currentScreen === 'dashboard' && user && (
        <DashboardScreen
          user={user}
          onLogout={handleLogout}
          onShowSettings={handleShowSettings}
          onShowLogs={handleShowLogs}
        />
      )}

      {currentScreen === 'settings' && (
        <SettingsScreen onBack={handleBackFromSettings} />
      )}

      {currentScreen === 'logs' && (
        <LogViewerScreen onBack={handleBackFromLogs} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default App;
