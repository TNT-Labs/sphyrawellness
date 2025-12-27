import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Appointment } from '../types';
import { Calendar, Users, TrendingUp, Clock, Bell, BellOff, UserCheck } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import AppointmentModal from '../components/calendar/AppointmentModal';
import { extractTimeString } from '../utils/helpers';

const Dashboard: React.FC = () => {
  const { customers, appointments, services, staff, refreshAppointments } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Statistics
  const todayAppointments = appointments.filter((apt) =>
    isToday(parseISO(apt.date))
  );

  // Clienti unici che hanno appuntamenti oggi
  const todayCustomers = new Set(
    todayAppointments.map((apt) => apt.customerId)
  ).size;

  // Servizi unici erogati oggi
  const todayServices = new Set(
    todayAppointments.map((apt) => apt.serviceId)
  ).size;

  // Personale impegnato oggi
  const todayStaff = new Set(
    todayAppointments.map((apt) => apt.staffId)
  ).size;

  const upcomingAppointments = appointments
    .filter((apt) => {
      if (!apt.date || !apt.startTime) return false;
      try {
        // Estrai solo la data da apt.date e l'ora da apt.startTime
        const dateStr = format(parseISO(apt.date), 'yyyy-MM-dd');
        const timeStr = format(parseISO(apt.startTime), 'HH:mm');
        const aptDateTime = parseISO(`${dateStr}T${timeStr}`);
        return aptDateTime >= new Date() && (apt.status === 'scheduled' || apt.status === 'confirmed');
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
    })
    .slice(0, 5);

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

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  };

  // Auto-refresh appointments every 30 seconds to detect reminder updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshAppointments().catch((error) => {
        console.error('Failed to refresh appointments:', error);
      });
    }, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [refreshAppointments]);

  const stats = [
    {
      name: 'Appuntamenti Oggi',
      value: todayAppointments.length,
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      link: '/calendario?view=day',
    },
    {
      name: 'Clienti Oggi',
      value: todayCustomers,
      icon: Users,
      color: 'text-green-600',
      bg: 'bg-green-100',
      link: '/clienti?filter=today',
    },
    {
      name: 'Servizi Oggi',
      value: todayServices,
      icon: TrendingUp,
      color: 'text-pink-600',
      bg: 'bg-pink-100',
      link: '/servizi?filter=today',
    },
    {
      name: 'Personale Oggi',
      value: todayStaff,
      icon: UserCheck,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      link: '/personale?filter=today',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Panoramica delle attività del centro estetico
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.name}
              to={stat.link}
              className="card hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.bg} ${stat.color} p-3 rounded-lg`}>
                  <Icon size={24} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Upcoming Appointments */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Clock className="mr-2 text-primary-600" size={24} />
            Prossimi Appuntamenti
          </h2>
          <Link
            to="/calendario"
            className="text-primary-600 hover:text-primary-700 text-sm font-semibold"
          >
            Vedi tutti →
          </Link>
        </div>

        {upcomingAppointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar size={48} className="mx-auto mb-3 text-gray-400" />
            <p>Nessun appuntamento programmato</p>
            <Link
              to="/calendario"
              className="text-primary-600 hover:text-primary-700 text-sm font-semibold mt-2 inline-block"
            >
              Crea un nuovo appuntamento
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.map((apt) => (
              <div
                key={apt.id}
                onClick={() => handleAppointmentClick(apt)}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                title="Clicca per visualizzare i dettagli"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      {getCustomerName(apt.customerId)}
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        apt.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {apt.status === 'confirmed' ? 'Confermato' : 'Programmato'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {getServiceName(apt.serviceId)} • {getStaffName(apt.staffId)}
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {format(parseISO(apt.date), 'dd MMM', { locale: it })}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{extractTimeString(apt.startTime)}</p>
                  </div>
                  <div className="flex items-center" title={apt.reminderSent ? 'Reminder inviato' : 'Reminder non inviato'}>
                    {apt.reminderSent ? (
                      <Bell size={20} className="text-green-600" />
                    ) : (
                      <BellOff size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/calendario"
          className="card hover:shadow-lg transition-shadow duration-200 bg-gradient-to-br from-primary-500 to-primary-600 text-white"
        >
          <Calendar size={32} className="mb-3" />
          <h3 className="text-lg font-semibold">Nuovo Appuntamento</h3>
          <p className="text-sm mt-1 text-primary-100">
            Aggiungi un nuovo appuntamento al calendario
          </p>
        </Link>

        <Link
          to="/clienti"
          className="card hover:shadow-lg transition-shadow duration-200 bg-gradient-to-br from-blue-500 to-blue-600 text-white"
        >
          <Users size={32} className="mb-3" />
          <h3 className="text-lg font-semibold">Gestisci Clienti</h3>
          <p className="text-sm mt-1 text-blue-100">
            Visualizza e gestisci la lista clienti
          </p>
        </Link>

        <Link
          to="/statistiche"
          className="card hover:shadow-lg transition-shadow duration-200 bg-gradient-to-br from-purple-500 to-purple-600 text-white"
        >
          <TrendingUp size={32} className="mb-3" />
          <h3 className="text-lg font-semibold">Vedi Statistiche</h3>
          <p className="text-sm mt-1 text-purple-100">
            Analizza le performance del centro
          </p>
        </Link>
      </div>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editingAppointment={selectedAppointment}
      />
    </div>
  );
};

export default Dashboard;
