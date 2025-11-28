import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Appointment } from '../types';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { generateId, calculateEndTime } from '../utils/helpers';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';

const CalendarPage: React.FC = () => {
  const {
    appointments,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    customers,
    services,
    staff,
  } = useApp();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(
    null
  );

  const [formData, setFormData] = useState({
    customerId: '',
    serviceId: '',
    staffId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    notes: '',
    status: 'scheduled' as Appointment['status'],
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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

  const handleOpenModal = (appointment?: Appointment, selectedDate?: Date) => {
    if (appointment) {
      setEditingAppointment(appointment);
      setFormData({
        customerId: appointment.customerId,
        serviceId: appointment.serviceId,
        staffId: appointment.staffId,
        date: appointment.date,
        startTime: appointment.startTime,
        notes: appointment.notes || '',
        status: appointment.status,
      });
    } else {
      setEditingAppointment(null);
      setFormData({
        customerId: '',
        serviceId: '',
        staffId: '',
        date: selectedDate
          ? format(selectedDate, 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        notes: '',
        status: 'scheduled',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAppointment(null);

  // ESC key to close modal
  useEscapeKey(handleCloseModal, isModalOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const service = services.find((s) => s.id === formData.serviceId);
    if (!service) {
      showError('Servizio non trovato');
      return;
    }

    const endTime = calculateEndTime(formData.startTime, service.duration);
    if (!endTime) {
      showError('Errore nel calcolo dell\'ora di fine. Verifica l\'orario inserito.');
      return;
    }

    const appointmentData: Appointment = {
      id: editingAppointment?.id || generateId(),
      customerId: formData.customerId,
      serviceId: formData.serviceId,
      staffId: formData.staffId,
      date: formData.date,
      startTime: formData.startTime,
      endTime: endTime,
      status: formData.status,
      notes: formData.notes || undefined,
      createdAt: editingAppointment?.createdAt || new Date().toISOString(),
    };

    if (editingAppointment) {
      updateAppointment(appointmentData);
      showSuccess('Appuntamento aggiornato con successo!');
    } else {
      addAppointment(appointmentData);
      showSuccess('Appuntamento aggiunto con successo!');
    }

    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    const appointment = appointments.find((a) => a.id === id);
    if (!appointment) return;

    const customer = customers.find((c) => c.id === appointment.customerId);
    const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Cliente';

    const confirmed = await confirm({
      title: 'Conferma Eliminazione',
      message: `Sei sicuro di voler eliminare l'appuntamento di ${customerName} del ${format(parseISO(appointment.date), 'dd/MM/yyyy')} alle ${appointment.startTime}? Questa azione non può essere annullata.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      variant: 'danger',
    });

    if (confirmed) {
      deleteAppointment(id);
      showSuccess('Appuntamento eliminato con successo');
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
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
                onClick={() => handleOpenModal(undefined, day)}
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
                      onClick={() => handleOpenModal(apt)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-900">
                          {apt.startTime}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingAppointment
                  ? 'Modifica Appuntamento'
                  : 'Nuovo Appuntamento'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Cliente *</label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) =>
                      setFormData({ ...formData, customerId: e.target.value })
                    }
                    className="input"
                  >
                    <option value="">Seleziona un cliente</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.firstName} {customer.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Servizio *</label>
                  <select
                    required
                    value={formData.serviceId}
                    onChange={(e) =>
                      setFormData({ ...formData, serviceId: e.target.value })
                    }
                    className="input"
                  >
                    <option value="">Seleziona un servizio</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - €{service.price} ({service.duration} min)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Operatore *</label>
                  <select
                    required
                    value={formData.staffId}
                    onChange={(e) =>
                      setFormData({ ...formData, staffId: e.target.value })
                    }
                    className="input"
                  >
                    <option value="">Seleziona un operatore</option>
                    {staff
                      .filter((s) => s.isActive)
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName} - {member.role}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Data *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">Ora Inizio *</label>
                    <input
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Stato</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as Appointment['status'],
                      })
                    }
                    className="input"
                  >
                    <option value="scheduled">Programmato</option>
                    <option value="confirmed">Confermato</option>
                    <option value="completed">Completato</option>
                    <option value="cancelled">Cancellato</option>
                    <option value="no-show">Non presentato</option>
                  </select>
                </div>

                <div>
                  <label className="label">Note</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="input"
                    rows={3}
                    placeholder="Note aggiuntive sull'appuntamento..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    {editingAppointment
                      ? 'Salva Modifiche'
                      : 'Crea Appuntamento'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary flex-1"
                  >
                    Annulla
                  </button>
                </div>

                {editingAppointment && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDelete(editingAppointment.id);
                      handleCloseModal();
                    }}
                    className="w-full px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm font-semibold"
                  >
                    <Trash2 size={16} className="inline mr-1" />
                    Elimina Appuntamento
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </div>
  );
};

export default CalendarPage;
