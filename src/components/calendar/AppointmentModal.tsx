import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Appointment } from '../../types';
import { Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { generateId, calculateEndTime } from '../../utils/helpers';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import { useCalendarLogic } from '../../hooks/useCalendarLogic';
import { logger } from '../../utils/logger';
import SearchableSelect, { SearchableOption } from '../SearchableSelect';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAppointment: Appointment | null;
  selectedDate?: Date;
  initialCustomerId?: string;
  initialServiceId?: string;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  editingAppointment,
  selectedDate,
  initialCustomerId,
  initialServiceId,
}) => {
  const {
    addAppointment,
    updateAppointment,
    deleteAppointment,
    customers,
    services,
    staff,
  } = useApp();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();
  const { getStaffRoleName, checkAppointmentConflicts } = useCalendarLogic();

  const [formData, setFormData] = useState({
    customerId: '',
    serviceId: '',
    staffId: '',
    date: format(selectedDate || new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    notes: '',
    status: 'scheduled' as Appointment['status'],
  });

  // Prepara le opzioni per il SearchableSelect dei clienti
  const customerOptions: SearchableOption[] = useMemo(() => {
    return customers.map((customer) => ({
      id: customer.id,
      label: `${customer.firstName} ${customer.lastName}`,
      secondaryLabel: customer.email,
      metadata: customer.phone,
    }));
  }, [customers]);

  // Prepara le opzioni per il SearchableSelect dei servizi
  const serviceOptions: SearchableOption[] = useMemo(() => {
    return services.map((service) => ({
      id: service.id,
      label: service.name,
      secondaryLabel: service.description,
      metadata: `€${service.price.toFixed(2)} • ${service.duration} min`,
    }));
  }, [services]);

  useEffect(() => {
    if (editingAppointment) {
      setFormData({
        customerId: editingAppointment.customerId,
        serviceId: editingAppointment.serviceId,
        staffId: editingAppointment.staffId,
        date: editingAppointment.date,
        startTime: editingAppointment.startTime,
        notes: editingAppointment.notes || '',
        status: editingAppointment.status,
      });
    } else {
      setFormData({
        customerId: initialCustomerId || '',
        serviceId: initialServiceId || '',
        staffId: '',
        date: selectedDate
          ? format(selectedDate, 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        notes: '',
        status: 'scheduled',
      });
    }
  }, [editingAppointment, selectedDate, initialCustomerId, initialServiceId]);

  useEscapeKey(onClose, isOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const service = services.find((s) => s.id === formData.serviceId);
    if (!service) {
      showError('Servizio non trovato');
      return;
    }

    const endTime = calculateEndTime(formData.startTime, service.duration);
    if (!endTime) {
      showError("Errore nel calcolo dell'ora di fine. Verifica l'orario inserito.");
      return;
    }

    const conflictCheck = checkAppointmentConflicts(
      formData.date,
      formData.startTime,
      endTime,
      formData.customerId,
      formData.staffId,
      editingAppointment?.id
    );

    if (conflictCheck.hasConflict) {
      showError(conflictCheck.message || 'Appuntamento in conflitto con un altro appuntamento');
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

    try {
      if (editingAppointment) {
        await updateAppointment(appointmentData);
        showSuccess('Appuntamento aggiornato con successo!');
      } else {
        await addAppointment(appointmentData);
        showSuccess('Appuntamento aggiunto con successo!');
      }
      onClose();
    } catch (error) {
      showError("Errore durante il salvataggio dell'appuntamento");
      logger.error('Error saving appointment:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const appointment = editingAppointment;
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
      try {
        await deleteAppointment(id);
        showSuccess('Appuntamento eliminato con successo');
        onClose();
      } catch (error) {
        showError("Errore durante l'eliminazione dell'appuntamento");
        logger.error('Error saving appointment:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-x-hidden">
        <div className="bg-white rounded-lg w-full max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingAppointment
                ? 'Modifica Appuntamento'
                : 'Nuovo Appuntamento'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <SearchableSelect
                label="Cliente"
                options={customerOptions}
                value={formData.customerId}
                onChange={(value) =>
                  setFormData({ ...formData, customerId: value })
                }
                placeholder="Cerca cliente per nome, email o telefono..."
                noOptionsMessage="Nessun cliente trovato"
                required
              />

              <SearchableSelect
                label="Servizio"
                options={serviceOptions}
                value={formData.serviceId}
                onChange={(newServiceId) => {
                  const newService = services.find(s => s.id === newServiceId);
                  const currentStaff = staff.find(s => s.id === formData.staffId);

                  // Se l'operatore corrente non ha la specializzazione per il nuovo servizio, resettalo
                  let newStaffId = formData.staffId;
                  if (newService && currentStaff && !currentStaff.specializations.includes(newService.category)) {
                    newStaffId = '';
                  }

                  setFormData({
                    ...formData,
                    serviceId: newServiceId,
                    staffId: newStaffId
                  });
                }}
                placeholder="Cerca servizio per nome o descrizione..."
                noOptionsMessage="Nessun servizio trovato"
                required
              />

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
                    .filter((s) => {
                      if (!s.isActive) return false;

                      // Se un servizio è selezionato, mostra solo operatori con la specializzazione corretta
                      if (formData.serviceId) {
                        const selectedService = services.find(srv => srv.id === formData.serviceId);
                        if (selectedService) {
                          return s.specializations.includes(selectedService.category);
                        }
                      }

                      // Se nessun servizio è selezionato, mostra tutti gli operatori attivi
                      return true;
                    })
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName} - {getStaffRoleName(member.role)}
                      </option>
                    ))}
                </select>
                {formData.serviceId && staff.filter((s) => {
                  if (!s.isActive) return false;
                  const selectedService = services.find(srv => srv.id === formData.serviceId);
                  return selectedService && s.specializations.includes(selectedService.category);
                }).length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    Nessun operatore disponibile con la specializzazione richiesta per questo servizio
                  </p>
                )}
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
                <button type="submit" className="btn-primary flex-1 touch-manipulation">
                  {editingAppointment
                    ? 'Salva Modifiche'
                    : 'Crea Appuntamento'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary flex-1 touch-manipulation"
                >
                  Annulla
                </button>
              </div>

              {editingAppointment && (
                <button
                  type="button"
                  onClick={() => handleDelete(editingAppointment.id)}
                  className="w-full px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm font-semibold touch-manipulation"
                >
                  <Trash2 size={16} className="inline mr-1" />
                  Elimina Appuntamento
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      <ConfirmationDialog />
    </>
  );
};

export default AppointmentModal;
