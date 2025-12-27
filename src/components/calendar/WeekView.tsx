import React from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { useCalendarLogic } from '../../hooks/useCalendarLogic';
import { Appointment } from '../../types';
import { extractTimeString } from '../../utils/helpers';

interface WeekViewProps {
  onOpenModal: (_appointment?: Appointment, _selectedDate?: Date) => void;
}

const WeekView: React.FC<WeekViewProps> = ({ onOpenModal }) => {
  const {
    currentDate,
    setCurrentDate,
    getAppointmentsForDay,
    getCustomerName,
    getServiceName,
    getStaffName,
    getStaffColor,
    getStatusColor,
    getStatusLabel,
  } = useCalendarLogic();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentDate(addDays(currentDate, -7))}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">
              {format(weekStart, 'MMMM yyyy', { locale: it })}
            </h2>
            <p className="text-sm text-gray-600">
              Settimana {format(weekStart, 'w', { locale: it })}
            </p>
          </div>

          <button
            onClick={() => setCurrentDate(addDays(currentDate, 7))}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayAppointments = getAppointmentsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`card ${isToday ? 'ring-2 ring-primary-500' : ''}`}
            >
              <div className="mb-4">
                <div
                  className={`text-center ${isToday ? 'text-primary-600 font-bold' : 'text-gray-900'}`}
                >
                  <div className="text-sm font-semibold">
                    {format(day, 'EEEE', { locale: it })}
                  </div>
                  <div className="text-2xl font-bold">
                    {format(day, 'd')}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOpenModal(undefined, day)}
                className="w-full mb-3 px-3 py-2 bg-primary-50 text-primary-600 rounded-md hover:bg-primary-100 transition-colors text-sm font-semibold"
              >
                <Plus size={16} className="inline mr-1" />
                Aggiungi
              </button>

              <div className="space-y-2">
                {dayAppointments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Nessun appuntamento
                  </p>
                ) : (
                  dayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3 rounded-md border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                      style={{ borderLeftColor: getStaffColor(apt.staffId) }}
                      onClick={() => onOpenModal(apt)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-900">
                          {extractTimeString(apt.startTime)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(apt.status)}`}
                        >
                          {getStatusLabel(apt.status)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {getCustomerName(apt.customerId)}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {getServiceName(apt.serviceId)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {getStaffName(apt.staffId)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekView;
