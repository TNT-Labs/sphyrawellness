import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Bell, CheckCircle, Clock, Mail, MessageSquare, Smartphone, Send, RefreshCw, XCircle, AlertCircle, ChevronDown, Search } from 'lucide-react';
import { format, parseISO, addHours, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { remindersApi } from '../api/reminders';
import { logger } from '../utils/logger';
import { extractTimeString } from '../utils/helpers';

const Reminders: React.FC = () => {
  const { appointments, customers, services, staff, reminders, refreshAppointments, refreshReminders } = useApp();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();
  const [sendingReminders, setSendingReminders] = useState<Set<string>>(new Set());
  const [sendingAll, setSendingAll] = useState(false);

  // Stati per lo storico reminder
  const [historicExpanded, setHistoricExpanded] = useState(false);
  const [historicSearch, setHistoricSearch] = useState('');
  const [historicPage, setHistoricPage] = useState(0);
  const HISTORIC_PAGE_SIZE = 20;

  const upcomingAppointments = appointments
    .filter((apt) => {
      try {
        const dateStr = format(parseISO(apt.date), 'yyyy-MM-dd');
        const timeStr = format(parseISO(apt.startTime), 'HH:mm');
        const aptDateTime = parseISO(`${dateStr}T${timeStr}`);
        return aptDateTime > new Date() && apt.status === 'scheduled';
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      try {
        const dateA = format(parseISO(a.date), 'yyyy-MM-dd');
        const timeA = format(parseISO(a.startTime), 'HH:mm');
        const dateB = format(parseISO(b.date), 'yyyy-MM-dd');
        const timeB = format(parseISO(b.startTime), 'HH:mm');
        return parseISO(`${dateA}T${timeA}`).getTime() - parseISO(`${dateB}T${timeB}`).getTime();
      } catch {
        return 0;
      }
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
    try {
      const dateStr = format(parseISO(apt.date), 'yyyy-MM-dd');
      const timeStr = format(parseISO(apt.startTime), 'HH:mm');
      const aptDateTime = parseISO(`${dateStr}T${timeStr}`);
      const reminderTime = addHours(new Date(), 24);
      return aptDateTime <= reminderTime && aptDateTime > new Date();
    } catch {
      return false;
    }
  };

  const appointmentsNeedingReminders = upcomingAppointments.filter(needsReminder);

  // Separazione reminder: oggi vs storico
  const { todayReminders, historicalReminders } = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const todayRems: typeof reminders = [];
    const historicalRems: typeof reminders = [];

    reminders.forEach((reminder) => {
      if (!reminder.sentAt) return;

      try {
        const sentDate = parseISO(reminder.sentAt);
        if (sentDate >= todayStart && sentDate <= todayEnd) {
          todayRems.push(reminder);
        } else {
          historicalRems.push(reminder);
        }
      } catch {
        // Se non riesco a parsare la data, lo metto nello storico
        historicalRems.push(reminder);
      }
    });

    // Ordina entrambe le liste per data decrescente (più recenti prima)
    const sortByDate = (a: typeof reminders[0], b: typeof reminders[0]) => {
      const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
      const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
      return dateB - dateA;
    };

    return {
      todayReminders: todayRems.sort(sortByDate),
      historicalReminders: historicalRems.sort(sortByDate),
    };
  }, [reminders]);

  // Filtro e paginazione dello storico
  const filteredHistoricReminders = useMemo(() => {
    let filtered = historicalReminders;

    // Applica ricerca
    if (historicSearch.trim()) {
      filtered = filtered.filter((reminder) => {
        const appointment = appointments.find((apt) => apt.id === reminder.appointmentId);
        if (!appointment) return false;

        const customerName = getCustomerName(appointment.customerId).toLowerCase();
        const serviceName = getServiceName(appointment.serviceId).toLowerCase();
        const searchLower = historicSearch.toLowerCase();

        return (
          customerName.includes(searchLower) ||
          serviceName.includes(searchLower)
        );
      });
    }

    // Applica paginazione
    const endIndex = (historicPage + 1) * HISTORIC_PAGE_SIZE;
    return filtered.slice(0, endIndex);
  }, [historicalReminders, historicSearch, historicPage, appointments]);

  const hasMoreHistoric = filteredHistoricReminders.length < (
    historicSearch.trim()
      ? historicalReminders.filter((reminder) => {
          const appointment = appointments.find((apt) => apt.id === reminder.appointmentId);
          if (!appointment) return false;
          const customerName = getCustomerName(appointment.customerId).toLowerCase();
          const serviceName = getServiceName(appointment.serviceId).toLowerCase();
          const searchLower = historicSearch.toLowerCase();
          return customerName.includes(searchLower) || serviceName.includes(searchLower);
        }).length
      : historicalReminders.length
  );

  const handleSendReminder = async (
    appointmentId: string,
    type: 'email' | 'sms' | 'whatsapp'
  ) => {
    // Currently only email and SMS are supported
    if (type === 'whatsapp') {
      showError(`Invio WhatsApp non ancora implementato.`);
      return;
    }

    // Get customer to check for required data
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) {
      showError('Appuntamento non trovato');
      return;
    }

    const customer = customers.find(c => c.id === appointment.customerId);
    if (!customer) {
      showError('Cliente non trovato');
      return;
    }

    // Validate customer has required contact info
    if (type === 'email' && !customer.email) {
      showError('Cliente non ha un indirizzo email');
      return;
    }

    if (type === 'sms' && !customer.phone) {
      showError('Cliente non ha un numero di telefono');
      return;
    }

    // Check GDPR consent
    if (type === 'email' && !customer.consents?.emailReminderConsent) {
      showError('Cliente non ha dato consenso per reminder via email');
      return;
    }

    if (type === 'sms' && !customer.consents?.smsReminderConsent) {
      showError('Cliente non ha dato consenso per reminder via SMS');
      return;
    }

    setSendingReminders(prev => new Set(prev).add(appointmentId));

    try {
      await remindersApi.sendForAppointment(appointmentId, type);
      showSuccess(`Reminder ${type === 'email' ? 'email' : 'SMS'} inviato con successo!`);

      // Refresh data from database
      await refreshAppointments();
      await refreshReminders();
    } catch (error: any) {
      logger.error('Error sending reminder:', error);
      showError(`Errore nell'invio del reminder: ${error.message}`);
    } finally {
      setSendingReminders(prev => {
        const newSet = new Set(prev);
        newSet.delete(appointmentId);
        return newSet;
      });
    }
  };

  const handleSendAllReminders = async () => {
    if (appointmentsNeedingReminders.length === 0) {
      showError('Nessun reminder da inviare');
      return;
    }

    const confirmed = await confirm({
      title: 'Conferma Invio Reminder',
      message: `Confermi l'invio di ${appointmentsNeedingReminders.length} reminder via email?`,
      confirmText: 'Invia',
      cancelText: 'Annulla',
    });

    if (!confirmed) return;

    setSendingAll(true);

    try {
      const result = await remindersApi.sendAll();

      if (result.sent > 0) {
        showSuccess(`${result.sent} reminder inviati con successo!`);
      }

      if (result.failed > 0) {
        showError(`${result.failed} reminder non sono stati inviati`);
      }

      // Refresh data from database
      await refreshAppointments();
      await refreshReminders();
    } catch (error: any) {
      logger.error('Error sending reminders:', error);
      showError(`Errore nell'invio dei reminder: ${error.message}`);
    } finally {
      setSendingAll(false);
    }
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
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">
              Sistema di Reminder Email
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              I reminder vengono inviati automaticamente via email 24 ore prima
              dell'appuntamento. Le email contengono un link per confermare l'appuntamento.
              Configura l'orario di invio nelle Impostazioni.
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Bell className="mr-2 text-orange-600" size={24} />
              Appuntamenti entro 24 ore - Invia Reminder
            </h2>
            <button
              onClick={handleSendAllReminders}
              disabled={sendingAll}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {sendingAll ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Invia Tutti ({appointmentsNeedingReminders.length})
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {appointmentsNeedingReminders.map((apt) => {
              const contact = getCustomerContact(apt.customerId);
              const customer = customers.find(c => c.id === apt.customerId);
              const hasSmsConsent = customer?.consents?.smsReminderConsent === true;
              const hasPhone = !!contact.phone;
              const smsEnabled = hasSmsConsent && hasPhone && !sendingReminders.has(apt.id) && !sendingAll;

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
                          alle {extractTimeString(apt.startTime)}
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
                        disabled={sendingReminders.has(apt.id) || sendingAll}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center justify-center touch-manipulation whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingReminders.has(apt.id) ? (
                          <>
                            <RefreshCw size={16} className="mr-2 animate-spin" />
                            Invio...
                          </>
                        ) : (
                          <>
                            <Mail size={16} className="mr-2" />
                            Invia Email
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleSendReminder(apt.id, 'sms')}
                        disabled={!smsEnabled}
                        className={`px-4 py-2 rounded-md transition-colors text-sm font-semibold flex items-center justify-center touch-manipulation whitespace-nowrap ${
                          smsEnabled
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-400 text-white cursor-not-allowed opacity-50'
                        }`}
                        title={
                          !hasSmsConsent
                            ? 'Cliente non ha dato consenso per SMS'
                            : !hasPhone
                            ? 'Cliente non ha un numero di telefono'
                            : 'Invia SMS reminder'
                        }
                      >
                        <MessageSquare size={16} className="mr-2" />
                        SMS
                      </button>
                      <button
                        onClick={() => handleSendReminder(apt.id, 'whatsapp')}
                        disabled
                        className="px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed opacity-50 text-sm font-semibold flex items-center justify-center touch-manipulation whitespace-nowrap"
                        title="Non ancora implementato"
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

      {/* Reminder Inviati Oggi */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <CheckCircle className="mr-2 text-green-600" size={24} />
          Reminder Inviati Oggi
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({todayReminders.length})
          </span>
        </h2>

        {todayReminders.length === 0 ? (
          <div className="text-center py-8">
            <Bell size={40} className="mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">Nessun reminder inviato oggi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayReminders.map((reminder) => {
              const appointment = appointments.find(apt => apt.id === reminder.appointmentId);
              if (!appointment) return null;

              const channelIcon = reminder.type === 'email' ? Mail :
                                reminder.type === 'sms' ? MessageSquare :
                                Smartphone;

              const channelColor = reminder.type === 'email' ? 'text-blue-600' :
                                 reminder.type === 'sms' ? 'text-green-600' :
                                 'text-purple-600';

              const channelBg = reminder.type === 'email' ? 'bg-blue-100' :
                              reminder.type === 'sms' ? 'bg-green-100' :
                              'bg-purple-100';

              const ChannelIcon = channelIcon;

              return (
                <div
                  key={reminder.id}
                  className={`p-4 rounded-lg border ${
                    reminder.sent
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">
                          {getCustomerName(appointment.customerId)}
                        </h3>

                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${channelBg} ${channelColor} text-xs font-medium rounded-full`}>
                          <ChannelIcon size={12} />
                          {reminder.type === 'email' ? 'Email' :
                           reminder.type === 'sms' ? 'SMS' :
                           'WhatsApp'}
                        </span>

                        {reminder.sent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            <CheckCircle size={12} />
                            Inviato
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            <XCircle size={12} />
                            Fallito
                          </span>
                        )}
                      </div>

                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>
                          <strong>Servizio:</strong> {getServiceName(appointment.serviceId)}
                        </p>
                        <p>
                          <strong>Appuntamento:</strong>{' '}
                          {format(parseISO(appointment.date), 'dd MMMM yyyy', {
                            locale: it,
                          })}{' '}
                          alle {extractTimeString(appointment.startTime)}
                        </p>
                        {reminder.sentAt && (
                          <p>
                            <strong>Inviato il:</strong>{' '}
                            {format(parseISO(reminder.sentAt), 'dd MMMM yyyy \'alle\' HH:mm', {
                              locale: it,
                            })}
                          </p>
                        )}
                        {!reminder.sent && reminder.errorMessage && (
                          <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-red-700 flex items-start gap-2">
                            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                            <span className="text-xs">{reminder.errorMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-sm text-gray-500">
                        {reminder.sentAt ? (
                          format(parseISO(reminder.sentAt), 'HH:mm', { locale: it })
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Storico Reminder (Collassabile) */}
      {historicalReminders.length > 0 && (
        <div className="card">
          <button
            onClick={() => setHistoricExpanded(!historicExpanded)}
            className="w-full flex items-center justify-between text-left group"
          >
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Clock className="mr-2 text-gray-600" size={24} />
              Storico
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({historicalReminders.length} reminder precedenti)
              </span>
            </h2>
            <ChevronDown
              className={`transition-transform text-gray-600 group-hover:text-gray-900 ${
                historicExpanded ? 'rotate-180' : ''
              }`}
              size={24}
            />
          </button>

          {historicExpanded && (
            <div className="mt-4 space-y-4">
              {/* Barra di ricerca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="search"
                  placeholder="Cerca per nome cliente o servizio..."
                  value={historicSearch}
                  onChange={(e) => {
                    setHistoricSearch(e.target.value);
                    setHistoricPage(0); // Reset pagination on search
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Lista paginata */}
              {filteredHistoricReminders.length === 0 ? (
                <div className="text-center py-8">
                  <Search size={40} className="mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">Nessun risultato trovato</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {filteredHistoricReminders.map((reminder) => {
                      const appointment = appointments.find(apt => apt.id === reminder.appointmentId);
                      if (!appointment) return null;

                      const channelIcon = reminder.type === 'email' ? Mail :
                                        reminder.type === 'sms' ? MessageSquare :
                                        Smartphone;

                      const channelColor = reminder.type === 'email' ? 'text-blue-600' :
                                         reminder.type === 'sms' ? 'text-green-600' :
                                         'text-purple-600';

                      const channelBg = reminder.type === 'email' ? 'bg-blue-100' :
                                      reminder.type === 'sms' ? 'bg-green-100' :
                                      'bg-purple-100';

                      const ChannelIcon = channelIcon;

                      return (
                        <div
                          key={reminder.id}
                          className={`p-4 rounded-lg border ${
                            reminder.sent
                              ? 'bg-gray-50 border-gray-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-gray-900">
                                  {getCustomerName(appointment.customerId)}
                                </h3>

                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${channelBg} ${channelColor} text-xs font-medium rounded-full`}>
                                  <ChannelIcon size={12} />
                                  {reminder.type === 'email' ? 'Email' :
                                   reminder.type === 'sms' ? 'SMS' :
                                   'WhatsApp'}
                                </span>

                                {reminder.sent ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                    <CheckCircle size={12} />
                                    Inviato
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                    <XCircle size={12} />
                                    Fallito
                                  </span>
                                )}
                              </div>

                              <div className="mt-2 space-y-1 text-sm text-gray-600">
                                <p>
                                  <strong>Servizio:</strong> {getServiceName(appointment.serviceId)}
                                </p>
                                <p>
                                  <strong>Appuntamento:</strong>{' '}
                                  {format(parseISO(appointment.date), 'dd MMMM yyyy', {
                                    locale: it,
                                  })}{' '}
                                  alle {extractTimeString(appointment.startTime)}
                                </p>
                                {reminder.sentAt && (
                                  <p>
                                    <strong>Inviato il:</strong>{' '}
                                    {format(parseISO(reminder.sentAt), 'dd MMMM yyyy \'alle\' HH:mm', {
                                      locale: it,
                                    })}
                                  </p>
                                )}
                                {!reminder.sent && reminder.errorMessage && (
                                  <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-red-700 flex items-start gap-2">
                                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                    <span className="text-xs">{reminder.errorMessage}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <div className="text-sm text-gray-500">
                                {reminder.sentAt ? (
                                  format(parseISO(reminder.sentAt), 'dd/MM', { locale: it })
                                ) : (
                                  'N/A'
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pulsante carica altri */}
                  {hasMoreHistoric && (
                    <button
                      onClick={() => setHistoricPage((p) => p + 1)}
                      className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={16} />
                      Carica altri {Math.min(HISTORIC_PAGE_SIZE, historicalReminders.length - filteredHistoricReminders.length)} reminder
                    </button>
                  )}
                </>
              )}
            </div>
          )}
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
                      <div className="text-sm text-gray-600">{extractTimeString(apt.startTime)}</div>
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
                  showSuccess('Notifiche abilitate con successo!');
                } else {
                  showError('Permesso negato. Abilita le notifiche nelle impostazioni del browser.');
                }
              });
            } else {
              showError('Il tuo browser non supporta le notifiche push.');
            }
          }}
          className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
        >
          Abilita Notifiche
        </button>
      </div>

      <ConfirmationDialog />
    </div>
  );
};

export default Reminders;
