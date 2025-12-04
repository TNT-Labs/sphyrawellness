import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Bell, CheckCircle, Clock, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { format, parseISO, addHours } from 'date-fns';
import { it } from 'date-fns/locale';

const Reminders: React.FC = () => {
  const { appointments, customers, services, staff, reminders } = useApp();

  const upcomingAppointments = appointments
    .filter((apt) => {
      const aptDateTime = parseISO(`${apt.date}T${apt.startTime}`);
      return aptDateTime > new Date() && apt.status === 'scheduled';
    })
    .sort((a, b) => {
      const dateA = parseISO(`${a.date}T${a.startTime}`);
      const dateB = parseISO(`${b.date}T${b.startTime}`);
      return dateA.getTime() - dateB.getTime();
    });

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer ? `${customer.firstName} ${customer.lastName}` : 'N/A';
  };

  const getCustomerContact = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer
      ? { email: customer.email, phone: customer.phone }
      : { email: '', phone: '' };
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    return service?.name || 'N/A';
  };

  const getStaffName = (staffId: string) => {
    const member = staff.find((s) => s.id === staffId);
    return member ? `${member.firstName} ${member.lastName}` : 'N/A';
  };

  const needsReminder = (apt: typeof appointments[0]) => {
    const aptDateTime = parseISO(`${apt.date}T${apt.startTime}`);
    const reminderTime = addHours(new Date(), 24);
    return aptDateTime <= reminderTime && aptDateTime > new Date();
  };

  const appointmentsNeedingReminders = upcomingAppointments.filter(needsReminder);

  const handleSendReminder = (
    appointmentId: string,
    type: 'email' | 'sms' | 'whatsapp'
  ) => {
    // In a real app, this would trigger actual notifications
    alert(
      `In una implementazione reale, invieresti un reminder via ${type} per l'appuntamento ${appointmentId}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reminder</h1>
        <p className="text-gray-600 mt-1">
          Gestisci i promemoria per gli appuntamenti
        </p>
      </div>

      {/* Info Card */}
      <div className="card bg-blue-50 border-l-4 border-blue-400">
        <div className="flex items-start">
          <Bell className="text-blue-600 mr-3 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-blue-900">
              Sistema di Notifiche
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              In una implementazione completa, i reminder verrebbero inviati
              automaticamente via email, SMS o WhatsApp 24 ore prima
              dell'appuntamento. Per abilitare le notifiche push del browser,
              abilita i permessi quando richiesto.
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Prossimi Appuntamenti
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {upcomingAppointments.length}
              </p>
            </div>
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              <Clock size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Reminder da Inviare
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {appointmentsNeedingReminders.length}
              </p>
            </div>
            <div className="bg-orange-100 text-orange-600 p-3 rounded-lg">
              <Bell size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Reminder Inviati</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {reminders.filter((r) => r.sent).length}
              </p>
            </div>
            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Appointments Needing Reminders */}
      {appointmentsNeedingReminders.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Bell className="mr-2 text-orange-600" size={24} />
            Appuntamenti entro 24 ore - Invia Reminder
          </h2>

          <div className="space-y-4">
            {appointmentsNeedingReminders.map((apt) => {
              const contact = getCustomerContact(apt.customerId);
              return (
                <div
                  key={apt.id}
                  className="p-4 bg-orange-50 border border-orange-200 rounded-lg"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {getCustomerName(apt.customerId)}
                      </h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>
                          <strong>Servizio:</strong> {getServiceName(apt.serviceId)}
                        </p>
                        <p>
                          <strong>Operatore:</strong> {getStaffName(apt.staffId)}
                        </p>
                        <p>
                          <strong>Data e Ora:</strong>{' '}
                          {format(parseISO(apt.date), 'dd MMMM yyyy', {
                            locale: it,
                          })}{' '}
                          alle {apt.startTime}
                        </p>
                        <p>
                          <strong>Email:</strong> {contact.email}
                        </p>
                        <p>
                          <strong>Telefono:</strong> {contact.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleSendReminder(apt.id, 'email')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center justify-center touch-manipulation whitespace-nowrap"
                      >
                        <Mail size={16} className="mr-2" />
                        Invia Email
                      </button>
                      <button
                        onClick={() => handleSendReminder(apt.id, 'sms')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-semibold flex items-center justify-center touch-manipulation whitespace-nowrap"
                      >
                        <MessageSquare size={16} className="mr-2" />
                        Invia SMS
                      </button>
                      <button
                        onClick={() => handleSendReminder(apt.id, 'whatsapp')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-semibold flex items-center justify-center touch-manipulation whitespace-nowrap"
                      >
                        <Smartphone size={16} className="mr-2" />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Upcoming Appointments */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Tutti i Prossimi Appuntamenti
        </h2>

        {upcomingAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={48} className="mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">Nessun appuntamento programmato</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.map((apt) => {
              const needsRem = needsReminder(apt);
              return (
                <div
                  key={apt.id}
                  className={`p-4 rounded-lg border ${
                    needsRem
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {getCustomerName(apt.customerId)}
                        </h3>
                        {needsRem && (
                          <span className="inline-block px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full">
                            <Bell size={12} className="inline mr-1" />
                            Entro 24h
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {getServiceName(apt.serviceId)} •{' '}
                        {getStaffName(apt.staffId)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {format(parseISO(apt.date), 'dd MMM', { locale: it })}
                      </div>
                      <div className="text-sm text-gray-600">{apt.startTime}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Push Notifications Setup */}
      <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
        <h2 className="text-xl font-bold mb-4">Abilita Notifiche Push</h2>
        <p className="mb-4 text-primary-100">
          Ricevi notifiche push sul tuo dispositivo per non perdere mai un
          appuntamento. Le notifiche funzionano anche quando l'app è chiusa.
        </p>
        <button
          onClick={() => {
            if ('Notification' in window) {
              Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                  alert('Notifiche abilitate con successo!');
                } else {
                  alert(
                    'Permesso negato. Abilita le notifiche nelle impostazioni del browser.'
                  );
                }
              });
            } else {
              alert('Il tuo browser non supporta le notifiche push.');
            }
          }}
          className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
        >
          Abilita Notifiche
        </button>
      </div>
    </div>
  );
};

export default Reminders;
