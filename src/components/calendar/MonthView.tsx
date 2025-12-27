import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  parseISO,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { useCalendarLogic } from '../../hooks/useCalendarLogic';
import { Appointment } from '../../types';
import { extractTimeString } from '../../utils/helpers';

interface MonthViewProps {
  onOpenModal: (_appointment?: Appointment, _selectedDate?: Date) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ onOpenModal }) => {
  const {
    currentDate,
    setCurrentDate,
    getAppointmentsForDay,
    getCustomerName,
    getStaffColor,
  } = useCalendarLogic();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, -1))}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">
              {format(currentDate, 'MMMM yyyy', { locale: it })}
            </h2>
          </div>

          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Calendar Grid - Mobile First Responsive */}
      <div className="card">
        {/* Week Day Headers - Hidden on mobile, shown on tablet+ */}
        <div className="hidden md:grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Mobile: Abbreviated headers */}
        <div className="grid grid-cols-7 gap-1 mb-2 md:hidden">
          {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, idx) => (
            <div
              key={idx}
              className="text-center text-xs font-semibold text-gray-600 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days - Responsive Grid */}
        <div className="grid grid-cols-7 gap-0.5 md:gap-1">
          {calendarDays.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[80px] sm:min-h-[100px] md:min-h-[120px] p-1 sm:p-1.5 md:p-2 border rounded-sm md:rounded-md ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                } ${isToday ? 'ring-1 md:ring-2 ring-primary-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs sm:text-sm font-semibold ${
                      isToday
                        ? 'bg-primary-600 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs'
                        : isCurrentMonth
                          ? 'text-gray-900'
                          : 'text-gray-400'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  <button
                    onClick={() => onOpenModal(undefined, day)}
                    className="opacity-100 md:opacity-0 md:hover:opacity-100 transition-opacity p-0.5 sm:p-1 hover:bg-primary-50 rounded touch-manipulation"
                    aria-label="Aggiungi appuntamento"
                  >
                    <Plus size={12} className="sm:hidden text-primary-600" />
                    <Plus size={14} className="hidden sm:block text-primary-600" />
                  </button>
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  {/* Mobile: mostra solo dots, Tablet+: mostra dettagli */}
                  {dayAppointments.length > 0 && (
                    <>
                      {/* Mobile: solo dots colorati */}
                      <div className="md:hidden flex flex-wrap gap-0.5">
                        {dayAppointments.slice(0, 6).map((apt) => (
                          <button
                            key={apt.id}
                            className="w-1.5 h-1.5 rounded-full touch-manipulation"
                            style={{ backgroundColor: getStaffColor(apt.staffId) }}
                            onClick={() => onOpenModal(apt)}
                            title={`${extractTimeString(apt.startTime)} - ${getCustomerName(apt.customerId)}`}
                          />
                        ))}
                        {dayAppointments.length > 6 && (
                          <span className="text-[8px] text-gray-500 ml-0.5">+{dayAppointments.length - 6}</span>
                        )}
                      </div>

                      {/* Tablet+: dettagli completi */}
                      <div className="hidden md:block">
                        {dayAppointments.slice(0, 3).map((apt) => (
                          <div
                            key={apt.id}
                            className="text-xs p-1 rounded border-l-2 bg-gray-50 hover:bg-gray-100 cursor-pointer truncate"
                            style={{ borderLeftColor: getStaffColor(apt.staffId) }}
                            onClick={() => onOpenModal(apt)}
                            title={`${extractTimeString(apt.startTime)} - ${getCustomerName(apt.customerId)}`}
                          >
                            <div className="font-semibold text-gray-900">
                              {extractTimeString(apt.startTime)}
                            </div>
                            <div className="text-gray-600 truncate">
                              {getCustomerName(apt.customerId)}
                            </div>
                          </div>
                        ))}
                        {dayAppointments.length > 3 && (
                          <div className="text-xs text-gray-500 font-semibold pl-1">
                            +{dayAppointments.length - 3} altri
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Legenda</h3>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-full bg-primary-600"></div>
            <span className="text-gray-600">Oggi</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm ring-2 ring-primary-500"></div>
            <span className="text-gray-600">Giorno corrente</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthView;
