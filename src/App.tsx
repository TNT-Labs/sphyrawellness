import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import Customers from './pages/Customers';
import Services from './pages/Services';
import StaffPage from './pages/StaffPage';
import Payments from './pages/Payments';
import Reminders from './pages/Reminders';
import Statistics from './pages/Statistics';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
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
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
};

export default App;
