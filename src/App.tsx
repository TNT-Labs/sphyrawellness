import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import IdleSplashScreen from './components/IdleSplashScreen';
import { useIdleDetection } from './hooks/useIdleDetection';
import { loadSettings } from './utils/storage';

// Eager load Dashboard (most visited page)
import Dashboard from './pages/Dashboard';

// Lazy load other pages
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const Customers = lazy(() => import('./pages/Customers'));
const Services = lazy(() => import('./pages/Services'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const Payments = lazy(() => import('./pages/Payments'));
const Reminders = lazy(() => import('./pages/Reminders'));
const Statistics = lazy(() => import('./pages/Statistics'));
const UserManual = lazy(() => import('./pages/UserManual'));
const Settings = lazy(() => import('./pages/Settings'));

// Loading fallback component
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
      <p className="mt-4 text-gray-600">Caricamento...</p>
    </div>
  </div>
);

// Global loading screen
const GlobalLoader: React.FC = () => (
  <div className="fixed inset-0 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center z-50">
    <div className="text-center">
      <div className="mb-6">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Sphyra Wellness</h1>
      <p className="text-primary-100">Caricamento dati...</p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const [idleTimeout, setIdleTimeout] = useState<number>(5);

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
    <AppProvider>
      {(isLoading) => (
        <>
          {isIdle && !isLoading && <IdleSplashScreen onDismiss={resetIdle} />}
          {isLoading ? (
            <GlobalLoader />
          ) : (
            <Router basename="/sphyrawellness">
              <Layout>
                <Suspense fallback={<PageLoader />}>
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
                  </Routes>
                </Suspense>
              </Layout>
            </Router>
          )}
        </>
      )}
    </AppProvider>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
