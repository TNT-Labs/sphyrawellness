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

  // Genera le fasce orarie dalle 8:00 alle 20:00
  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 8;
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
      // Ensure we're within the visible range (8-20)
      if (targetHour < 8) targetHour = 8;
      if (targetHour > 20) targetHour = 20;

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

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">
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
                {/* Time Column */}
                <div className="w-20 flex-shrink-0 py-3 pr-4 text-right">
                  <span className="text-sm font-semibold text-gray-600">
                    {time}
                  </span>
                </div>

                {/* Appointments Column */}
                <div className="flex-1 py-2 min-h-[60px]">
                  {slotAppointments.length === 0 ? (
                    <button
                      onClick={() => onOpenModal(undefined, currentDate)}
                      className="w-full h-full flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {slotAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="p-3 rounded-md border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                          style={{ borderLeftColor: getStaffColor(apt.staffId) }}
                          onClick={() => onOpenModal(apt)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-900">
                                  {apt.startTime} - {apt.endTime}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(apt.status)}`}
                                >
                                  {getStatusLabel(apt.status)}
                                </span>
                              </div>
                              <p className="text-base font-semibold text-gray-900">
                                {getCustomerName(apt.customerId)}
                              </p>
                              <p className="text-sm text-gray-600">
                                {getServiceName(apt.serviceId)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {getStaffName(apt.staffId)}
                              </p>
                              {apt.notes && (
                                <p className="text-xs text-gray-500 mt-1 italic">
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
          <p className="text-3xl font-bold text-primary-600">
            {dayAppointments.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DayView;
