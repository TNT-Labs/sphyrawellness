import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import IdleSplashScreen from './components/IdleSplashScreen';
import UpdateNotification from './components/UpdateNotification';
import { useIdleDetection } from './hooks/useIdleDetection';
import { loadSettings } from './utils/storage';

// Eager load all pages to prevent loading issues on page refresh
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import Customers from './pages/Customers';
import Services from './pages/Services';
import StaffPage from './pages/StaffPage';
import Payments from './pages/Payments';
import Reminders from './pages/Reminders';
import Statistics from './pages/Statistics';
import UserManual from './pages/UserManual';
import Settings from './pages/Settings';
import ConfirmAppointment from './pages/ConfirmAppointment';
import PublicBooking from './pages/PublicBooking';
import PrivacyPolicy from './pages/PrivacyPolicy';

// Global loading screen
const GlobalLoader: React.FC = () => (
  <div className="fixed inset-0 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center z-50">
    <div className="text-center">
      <div className="mb-6">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Sphyra Wellness Lab</h1>
      <p className="text-primary-100">Caricamento dati...</p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const [idleTimeout, setIdleTimeout] = useState<number>(5);
  const { isLoading } = useApp();

  useEffect(() => {
    const settings = loadSettings();
    setIdleTimeout(settings.idleTimeout);

    // Listen for storage changes (when settings are updated)
    const handleStorageChange = () => {
      const newSettings = loadSettings();
      setIdleTimeout(newSettings.idleTimeout);
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event from same tab
    window.addEventListener('settingsChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settingsChanged', handleStorageChange);
    };
  }, []);

  const { isIdle, resetIdle } = useIdleDetection({
    timeoutMinutes: idleTimeout,
    enabled: idleTimeout > 0,
  });

  return (
    <>
      {/* Update notification banner */}
      <UpdateNotification />

      {isIdle && !isLoading && <IdleSplashScreen onDismiss={resetIdle} />}
      {isLoading ? (
        <GlobalLoader />
      ) : (
        <Router basename={import.meta.env.BASE_URL}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/prenota" element={<PublicBooking />} />
            <Route path="/booking" element={<PublicBooking />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />

            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/calendario" element={<CalendarPage />} />
                      <Route path="/clienti" element={<Customers />} />
                      <Route path="/servizi" element={<Services />} />
                      <Route path="/personale" element={<StaffPage />} />
                      <Route path="/pagamenti" element={<Payments />} />
                      <Route path="/reminder" element={<Reminders />} />
                      <Route path="/statistiche" element={<Statistics />} />
                      <Route path="/manuale" element={<UserManual />} />
                      <Route path="/impostazioni" element={<Settings />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/confirm-appointment/:appointmentId/:token" element={<ConfirmAppointment />} />
                      <Route path="/confirm-appointment/success" element={<ConfirmAppointment />} />
                      <Route path="/confirm-appointment/error" element={<ConfirmAppointment />} />
                    </Routes>
                  </Layout>
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
