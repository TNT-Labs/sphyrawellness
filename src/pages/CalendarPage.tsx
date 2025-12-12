import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Appointment } from '../types';
import { useCalendarLogic } from '../hooks/useCalendarLogic';
import { CalendarView } from '../hooks/useCalendarLogic';
import CalendarHeader from '../components/calendar/CalendarHeader';
import WeekView from '../components/calendar/WeekView';
import DayView from '../components/calendar/DayView';
import MonthView from '../components/calendar/MonthView';
import AppointmentModal from '../components/calendar/AppointmentModal';

const CalendarPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { viewMode, setViewMode } = useCalendarLogic();

  // Set initial view mode from URL parameter
  useEffect(() => {
    const viewParam = searchParams.get('view') as CalendarView | null;
    if (viewParam && ['day', 'week', 'month'].includes(viewParam)) {
      setViewMode(viewParam);
    }
  }, [searchParams, setViewMode]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const handleOpenModal = (appointment?: Appointment, date?: Date) => {
    setEditingAppointment(appointment || null);
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAppointment(null);
    setSelectedDate(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendario</h1>
          <p className="text-gray-600 mt-1">
            Gestisci gli appuntamenti del centro
          </p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus size={20} className="inline mr-2" />
          Nuovo Appuntamento
        </button>
      </div>

      {/* View Mode Selector */}
      <CalendarHeader viewMode={viewMode} onViewModeChange={setViewMode} />

      {/* Calendar Views */}
      {viewMode === 'week' && <WeekView onOpenModal={handleOpenModal} />}
      {viewMode === 'day' && <DayView onOpenModal={handleOpenModal} />}
      {viewMode === 'month' && <MonthView onOpenModal={handleOpenModal} />}

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editingAppointment={editingAppointment}
        selectedDate={selectedDate}
      />
    </div>
  );
};

export default CalendarPage;
