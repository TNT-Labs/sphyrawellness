import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Appointment } from '../types';
import { isSameDay, parseISO } from 'date-fns';

export type CalendarView = 'day' | 'week' | 'month';

export const useCalendarLogic = () => {
  const {
    appointments,
    customers,
    services,
    staff,
    staffRoles,
  } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarView>('week');

  const getAppointmentsForDay = (date: Date) => {
    return appointments
      .filter((apt) => isSameDay(parseISO(apt.date), date))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer ? `${customer.firstName} ${customer.lastName}` : 'N/A';
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    return service?.name || 'N/A';
  };

  const getStaffName = (staffId: string) => {
    const member = staff.find((s) => s.id === staffId);
    return member ? `${member.firstName} ${member.lastName}` : 'N/A';
  };

  const getStaffColor = (staffId: string) => {
    const member = staff.find((s) => s.id === staffId);
    return member?.color || '#ec4899';
  };

  const getStaffRoleName = (roleId: string) => {
    const role = staffRoles.find((r) => r.id === roleId);
    return role?.name || roleId;
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'confirmed':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'no-show':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return 'Programmato';
      case 'confirmed':
        return 'Confermato';
      case 'completed':
        return 'Completato';
      case 'cancelled':
        return 'Cancellato';
      case 'no-show':
        return 'Non presentato';
      default:
        return status;
    }
  };

  const checkAppointmentConflicts = (
    date: string,
    startTime: string,
    endTime: string,
    customerId: string,
    staffId: string,
    excludeAppointmentId?: string
  ) => {
    const dayAppointments = appointments.filter(
      (apt) => apt.date === date && apt.id !== excludeAppointmentId
    );

    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const newStartMinutes = timeToMinutes(startTime);
    const newEndMinutes = timeToMinutes(endTime);

    for (const apt of dayAppointments) {
      const aptStartMinutes = timeToMinutes(apt.startTime);
      const aptEndMinutes = timeToMinutes(apt.endTime);

      const hasTimeOverlap =
        newStartMinutes < aptEndMinutes && newEndMinutes > aptStartMinutes;

      if (hasTimeOverlap) {
        const hasSameCustomer = apt.customerId === customerId;
        const hasSameStaff = apt.staffId === staffId;

        if (hasSameCustomer || hasSameStaff) {
          const conflictCustomer = customers.find((c) => c.id === apt.customerId);
          const conflictStaff = staff.find((s) => s.id === apt.staffId);
          const conflictService = services.find((s) => s.id === apt.serviceId);

          return {
            hasConflict: true,
            message: hasSameCustomer
              ? `Il cliente ${conflictCustomer?.firstName} ${conflictCustomer?.lastName} ha già un appuntamento alle ${apt.startTime} - ${apt.endTime}`
              : `L'operatore ${conflictStaff?.firstName} ${conflictStaff?.lastName} ha già un appuntamento alle ${apt.startTime} - ${apt.endTime} (${conflictService?.name})`,
          };
        }
      }
    }

    return { hasConflict: false };
  };

  return {
    // State
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,

    // Data
    appointments,
    customers,
    services,
    staff,
    staffRoles,

    // Helper functions
    getAppointmentsForDay,
    getCustomerName,
    getServiceName,
    getStaffName,
    getStaffColor,
    getStaffRoleName,
    getStatusColor,
    getStatusLabel,
    checkAppointmentConflicts,
  };
};
