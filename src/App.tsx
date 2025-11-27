import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';

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

// Loading fallback component
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
      <p className="mt-4 text-gray-600">Caricamento...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppProvider>
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
              </Routes>
            </Suspense>
          </Layout>
        </Router>
      </AppProvider>
    </ToastProvider>
  );
};

export default App;
