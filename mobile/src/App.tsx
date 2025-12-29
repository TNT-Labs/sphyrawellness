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
} from 'react-native';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import authService from './services/authService';
import apiClient from './services/apiClient';
import type { User } from './types';

type Screen = 'login' | 'dashboard' | 'settings';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeApp();
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

  const handleBackFromSettings = () => {
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
        />
      )}

      {currentScreen === 'settings' && (
        <SettingsScreen onBack={handleBackFromSettings} />
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
