import React, { useEffect, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { useCalendarLogic } from '../../hooks/useCalendarLogic';
import { Appointment } from '../../types';

interface DayViewProps {
  onOpenModal: (_appointment?: Appointment, _selectedDate?: Date) => void;
}

const DayView: React.FC<DayViewProps> = ({ onOpenModal }) => {
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

  const dayAppointments = getAppointmentsForDay(currentDate);
  const isToday = isSameDay(currentDate, new Date());
  const scheduleContainerRef = useRef<HTMLDivElement>(null);

  // Genera le fasce orarie dalle 6:00 alle 22:00
  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 6;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const getAppointmentsForTimeSlot = (time: string) => {
    return dayAppointments.filter((apt) => {
      const aptHour = parseInt(apt.startTime.split(':')[0]);
      const slotHour = parseInt(time.split(':')[0]);
      return aptHour === slotHour;
    });
  };

  // Auto-scroll to current time when viewing today
  useEffect(() => {
    if (isToday && scheduleContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();

      // Find the time slot element for the current hour or closest earlier hour
      let targetHour = currentHour;
      // Ensure we're within the visible range (6-22)
      if (targetHour < 6) targetHour = 6;
      if (targetHour > 22) targetHour = 22;

      const timeSlotId = `time-slot-${targetHour}`;
      const targetElement = document.getElementById(timeSlotId);

      if (targetElement) {
        // Scroll with a small delay to ensure DOM is fully rendered
        setTimeout(() => {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 100);
      }
    }
  }, [isToday, currentDate]);

  return (
    <div className="space-y-4">
      {/* Day Navigation */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentDate(addDays(currentDate, -1))}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-center flex-1 min-w-0 px-2">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {format(currentDate, 'EEEE d MMMM yyyy', { locale: it })}
            </h2>
            {isToday && (
              <p className="text-sm text-primary-600 font-semibold">Oggi</p>
            )}
          </div>

          <button
            onClick={() => setCurrentDate(addDays(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Quick Add Button */}
      <button
        onClick={() => onOpenModal(undefined, currentDate)}
        className="w-full btn-primary"
      >
        <Plus size={20} className="inline mr-2" />
        Nuovo Appuntamento
      </button>

      {/* Day Schedule */}
      <div className="card" ref={scheduleContainerRef}>
        <div className="space-y-1">
          {timeSlots.map((time) => {
            const slotAppointments = getAppointmentsForTimeSlot(time);
            const slotHour = parseInt(time.split(':')[0]);

            return (
              <div
                key={time}
                id={`time-slot-${slotHour}`}
                className="flex border-b border-gray-200 last:border-b-0"
              >
                {/* Time Column - Responsive width */}
                <div className="w-12 sm:w-16 md:w-20 flex-shrink-0 py-3 pr-2 sm:pr-3 md:pr-4 text-right">
                  <span className="text-xs sm:text-sm font-semibold text-gray-600">
                    {time}
                  </span>
                </div>

                {/* Appointments Column */}
                <div className="flex-1 py-2 min-h-[60px]">
                  {slotAppointments.length === 0 ? (
                    <button
                      onClick={() => onOpenModal(undefined, currentDate)}
                      className="w-full h-full flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors touch-manipulation"
                    >
                      <Plus size={16} />
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {slotAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="p-2 sm:p-3 rounded-md border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
                          style={{ borderLeftColor: getStaffColor(apt.staffId) }}
                          onClick={() => onOpenModal(apt)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-xs sm:text-sm font-bold text-gray-900">
                                  {apt.startTime} - {apt.endTime}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${getStatusColor(apt.status)}`}
                                >
                                  {getStatusLabel(apt.status)}
                                </span>
                              </div>
                              <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                                {getCustomerName(apt.customerId)}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600 truncate">
                                {getServiceName(apt.serviceId)}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-500 truncate">
                                {getStaffName(apt.staffId)}
                              </p>
                              {apt.notes && (
                                <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">
                                  {apt.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="card bg-primary-50">
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Totale appuntamenti oggi
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-primary-600">
            {dayAppointments.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DayView;
