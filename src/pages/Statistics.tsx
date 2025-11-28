import React, { useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Award,
  Clock,
} from 'lucide-react';
import { parseISO, format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';

const Statistics: React.FC = () => {
  const { appointments, payments, customers, services, staff, serviceCategories } = useApp();

  // Memoize expensive calculations
  const stats = useMemo(() => {
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalCustomers = customers.length;
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(
      (apt) => apt.status === 'completed'
    ).length;

    // This month stats
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const thisMonthAppointments = appointments.filter((apt) => {
      const aptDate = parseISO(apt.date);
      return isWithinInterval(aptDate, { start: monthStart, end: monthEnd });
    });

    const thisMonthPayments = payments.filter((p) => {
      const payDate = parseISO(p.date);
      return isWithinInterval(payDate, { start: monthStart, end: monthEnd });
    });

    const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

    // Average appointment value
    const avgAppointmentValue =
      completedAppointments > 0 ? totalRevenue / completedAppointments : 0;

    // Customer retention
    const customersWithMultipleAppointments = customers.filter((customer) => {
      const customerAppointments = appointments.filter(
        (apt) => apt.customerId === customer.id
      );
      return customerAppointments.length > 1;
    });

    const retentionRate =
      totalCustomers > 0
        ? (customersWithMultipleAppointments.length / totalCustomers) * 100
        : 0;

    return {
      totalRevenue,
      totalCustomers,
      totalAppointments,
      completedAppointments,
      thisMonthAppointments,
      thisMonthRevenue,
      avgAppointmentValue,
      retentionRate,
      now,
    };
  }, [appointments, payments, customers]);

  // Category statistics - memoized
  const categoryStats = useMemo(() => {
    const stats = serviceCategories.map((category) => {
      // Get all services in this category
      const categoryServices = services.filter(
        (service) => service.category === category.id
      );
      const categoryServiceIds = categoryServices.map((s) => s.id);

      // Count appointments for services in this category
      const categoryAppointments = appointments.filter((apt) =>
        categoryServiceIds.includes(apt.serviceId)
      );

      // Calculate revenue for this category
      const revenue = payments
        .filter((p) => {
          const apt = appointments.find((a) => a.id === p.appointmentId);
          return apt && categoryServiceIds.includes(apt.serviceId);
        })
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        category,
        count: categoryAppointments.length,
        revenue,
      };
    });

    return stats.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [serviceCategories, services, appointments, payments]);

  // Service statistics - memoized
  const serviceStats = useMemo(() => {
    const stats = services.map((service) => {
      const serviceAppointments = appointments.filter(
        (apt) => apt.serviceId === service.id
      );
      const revenue = payments
        .filter((p) => {
          const apt = appointments.find((a) => a.id === p.appointmentId);
          return apt?.serviceId === service.id;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        service,
        count: serviceAppointments.length,
        revenue,
      };
    });

    return stats.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [services, appointments, payments]);

  // Staff statistics - memoized
  const staffStats = useMemo(() => {
    const stats = staff.map((member) => {
      const memberAppointments = appointments.filter(
        (apt) => apt.staffId === member.id
      );
      const completedCount = memberAppointments.filter(
        (apt) => apt.status === 'completed'
      ).length;

      return {
        member,
        count: memberAppointments.length,
        completed: completedCount,
      };
    });

    return stats.sort((a, b) => b.completed - a.completed).slice(0, 5);
  }, [staff, appointments]);

  // Status statistics - memoized
  const statusCounts = useMemo(() => ({
    scheduled: appointments.filter((apt) => apt.status === 'scheduled').length,
    confirmed: appointments.filter((apt) => apt.status === 'confirmed').length,
    completed: appointments.filter((apt) => apt.status === 'completed').length,
    cancelled: appointments.filter((apt) => apt.status === 'cancelled').length,
    'no-show': appointments.filter((apt) => apt.status === 'no-show').length,
  }), [appointments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Statistiche</h1>
        <p className="text-gray-600 mt-1">
          Analizza le performance del tuo centro estetico
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <DollarSign size={32} className="mb-3" />
          <p className="text-sm opacity-90">Fatturato Totale</p>
          <p className="text-3xl font-bold mt-2">€{stats.totalRevenue.toFixed(2)}</p>
          <p className="text-sm opacity-75 mt-2">
            Media: €{stats.avgAppointmentValue.toFixed(2)}/appuntamento
          </p>
        </div>

        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <Users size={32} className="mb-3" />
          <p className="text-sm opacity-90">Clienti Totali</p>
          <p className="text-3xl font-bold mt-2">{stats.totalCustomers}</p>
          <p className="text-sm opacity-75 mt-2">
            Retention: {stats.retentionRate.toFixed(1)}%
          </p>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <Calendar size={32} className="mb-3" />
          <p className="text-sm opacity-90">Appuntamenti Totali</p>
          <p className="text-3xl font-bold mt-2">{stats.totalAppointments}</p>
          <p className="text-sm opacity-75 mt-2">
            Completati: {stats.completedAppointments}
          </p>
        </div>

        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <TrendingUp size={32} className="mb-3" />
          <p className="text-sm opacity-90">Questo Mese</p>
          <p className="text-3xl font-bold mt-2">
            €{stats.thisMonthRevenue.toFixed(2)}
          </p>
          <p className="text-sm opacity-75 mt-2">
            {stats.thisMonthAppointments.length} appuntamenti
          </p>
        </div>
      </div>

      {/* Top Categories */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="mr-2 text-purple-600" size={24} />
          Categorie Più Richieste
        </h2>

        {categoryStats.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nessun dato disponibile
          </p>
        ) : (
          <div className="space-y-4">
            {categoryStats.map((item, index) => (
              <div key={item.category.id} className="flex items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4"
                  style={{
                    backgroundColor: `${item.category.color}20`,
                    color: item.category.color,
                  }}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {item.category.name}
                    </h3>
                    <span className="text-sm text-gray-600">
                      {item.count} prenotazioni
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${stats.totalAppointments > 0 ? (item.count / stats.totalAppointments) * 100 : 0}%`,
                        backgroundColor: item.category.color,
                      }}
                    />
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <span className="font-bold text-gray-900">
                    €{item.revenue.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Services */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Award className="mr-2 text-primary-600" size={24} />
          Servizi Più Richiesti
        </h2>

        {serviceStats.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nessun dato disponibile
          </p>
        ) : (
          <div className="space-y-4">
            {serviceStats.map((item, index) => (
              <div key={item.service.id} className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold mr-4">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {item.service.name}
                    </h3>
                    <span className="text-sm text-gray-600">
                      {item.count} prenotazioni
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{
                        width: `${stats.totalAppointments > 0 ? (item.count / stats.totalAppointments) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <span className="font-bold text-gray-900">
                    €{item.revenue.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Staff Performance */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Users className="mr-2 text-blue-600" size={24} />
          Performance del Personale
        </h2>

        {staffStats.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nessun dato disponibile
          </p>
        ) : (
          <div className="space-y-4">
            {staffStats.map((item, index) => (
              <div key={item.member.id} className="flex items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4"
                  style={{
                    backgroundColor: `${item.member.color}20`,
                    color: item.member.color,
                  }}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {item.member.firstName} {item.member.lastName}
                    </h3>
                    <span className="text-sm text-gray-600">
                      {item.completed} completati / {item.count} totali
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${item.count > 0 ? (item.completed / item.count) * 100 : 0}%`,
                        backgroundColor: item.member.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Appointment Status Distribution */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Clock className="mr-2 text-purple-600" size={24} />
          Stato Appuntamenti
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">
              {statusCounts.scheduled}
            </p>
            <p className="text-sm text-gray-600 mt-1">Programmati</p>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">
              {statusCounts.confirmed}
            </p>
            <p className="text-sm text-gray-600 mt-1">Confermati</p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-600">
              {statusCounts.completed}
            </p>
            <p className="text-sm text-gray-600 mt-1">Completati</p>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">
              {statusCounts.cancelled}
            </p>
            <p className="text-sm text-gray-600 mt-1">Cancellati</p>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-3xl font-bold text-orange-600">
              {statusCounts['no-show']}
            </p>
            <p className="text-sm text-gray-600 mt-1">Non Presentati</p>
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="card bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
        <h2 className="text-xl font-bold mb-4">
          Riepilogo {format(stats.now, 'MMMM yyyy', { locale: it })}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm opacity-90">Appuntamenti</p>
            <p className="text-3xl font-bold mt-1">
              {stats.thisMonthAppointments.length}
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90">Fatturato</p>
            <p className="text-3xl font-bold mt-1">
              €{stats.thisMonthRevenue.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90">Valore Medio</p>
            <p className="text-3xl font-bold mt-1">
              €
              {stats.thisMonthAppointments.length > 0
                ? (stats.thisMonthRevenue / stats.thisMonthAppointments.length).toFixed(2)
                : '0.00'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
