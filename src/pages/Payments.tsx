import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Payment } from '../types';
import { DollarSign, Plus, CreditCard, Banknote, Building2, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { generateId } from '../utils/helpers';

const Payments: React.FC = () => {
  const { payments, addPayment, appointments, customers, services } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    appointmentId: '',
    amount: 0,
    method: 'cash' as Payment['method'],
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const completedAppointments = appointments.filter(
    (apt) => apt.status === 'completed'
  );

  const paidAppointmentIds = new Set(payments.map((p) => p.appointmentId));
  const unpaidAppointments = completedAppointments.filter(
    (apt) => !paidAppointmentIds.has(apt.id)
  );

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer ? `${customer.firstName} ${customer.lastName}` : 'N/A';
  };

  const getServicePrice = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    return service?.price || 0;
  };

  const getAppointmentDetails = (appointmentId: string) => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return null;
    return {
      customer: getCustomerName(apt.customerId),
      service: services.find((s) => s.id === apt.serviceId)?.name || 'N/A',
      date: apt.date,
    };
  };

  const filteredPayments = payments.filter((payment) => {
    const details = getAppointmentDetails(payment.appointmentId);
    if (!details) return false;
    const searchLower = searchTerm.toLowerCase();
    return (
      details.customer.toLowerCase().includes(searchLower) ||
      details.service.toLowerCase().includes(searchLower) ||
      payment.method.toLowerCase().includes(searchLower)
    );
  });

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  const revenueByMethod = payments.reduce((acc, p) => {
    acc[p.method] = (acc[p.method] || 0) + p.amount;
    return acc;
  }, {} as Record<Payment['method'], number>);

  const handleOpenModal = () => {
    setFormData({
      appointmentId: '',
      amount: 0,
      method: 'cash',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const paymentData: Payment = {
      id: generateId(),
      ...formData,
      notes: formData.notes || undefined,
    };

    addPayment(paymentData);
    handleCloseModal();
  };

  const handleAppointmentChange = (appointmentId: string) => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (apt) {
      const price = getServicePrice(apt.serviceId);
      setFormData({
        ...formData,
        appointmentId,
        amount: price,
      });
    }
  };

  const getMethodIcon = (method: Payment['method']) => {
    switch (method) {
      case 'cash':
        return <Banknote size={20} />;
      case 'card':
        return <CreditCard size={20} />;
      case 'transfer':
        return <Building2 size={20} />;
      default:
        return <DollarSign size={20} />;
    }
  };

  const getMethodLabel = (method: Payment['method']) => {
    switch (method) {
      case 'cash':
        return 'Contanti';
      case 'card':
        return 'Carta';
      case 'transfer':
        return 'Bonifico';
      case 'other':
        return 'Altro';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pagamenti</h1>
          <p className="text-gray-600 mt-1">Gestisci gli incassi del centro</p>
        </div>
        <button onClick={handleOpenModal} className="btn-primary">
          <Plus size={20} className="inline mr-2" />
          Registra Pagamento
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <DollarSign size={32} className="mb-3" />
          <p className="text-sm opacity-90">Fatturato Totale</p>
          <p className="text-3xl font-bold mt-2">€{totalRevenue.toFixed(2)}</p>
        </div>

        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <Banknote size={32} className="mb-3" />
          <p className="text-sm opacity-90">Contanti</p>
          <p className="text-3xl font-bold mt-2">
            €{(revenueByMethod.cash || 0).toFixed(2)}
          </p>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CreditCard size={32} className="mb-3" />
          <p className="text-sm opacity-90">Carta</p>
          <p className="text-3xl font-bold mt-2">
            €{(revenueByMethod.card || 0).toFixed(2)}
          </p>
        </div>

        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <Building2 size={32} className="mb-3" />
          <p className="text-sm opacity-90">Bonifico</p>
          <p className="text-3xl font-bold mt-2">
            €{(revenueByMethod.transfer || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Unpaid Appointments Alert */}
      {unpaidAppointments.length > 0 && (
        <div className="card bg-yellow-50 border-l-4 border-yellow-400">
          <div className="flex items-start">
            <DollarSign className="text-yellow-600 mr-3 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-semibold text-yellow-900">
                Appuntamenti da pagare
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Ci sono {unpaidAppointments.length} appuntamenti completati senza
                pagamento registrato
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="card">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Cerca pagamento per cliente, servizio o metodo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Payments List */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Storico Pagamenti
        </h2>

        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign size={48} className="mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">
              {searchTerm
                ? 'Nessun pagamento trovato'
                : 'Nessun pagamento registrato'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Data
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Cliente
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Servizio
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Metodo
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">
                    Importo
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                  .map((payment) => {
                    const details = getAppointmentDetails(payment.appointmentId);
                    if (!details) return null;

                    return (
                      <tr
                        key={payment.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-gray-900">
                          {format(parseISO(payment.date), 'dd MMM yyyy', {
                            locale: it,
                          })}
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {details.customer}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {details.service}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center text-gray-600">
                            {getMethodIcon(payment.method)}
                            <span className="ml-2">
                              {getMethodLabel(payment.method)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          €{payment.amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Registra Pagamento
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Appuntamento *</label>
                  <select
                    required
                    value={formData.appointmentId}
                    onChange={(e) => handleAppointmentChange(e.target.value)}
                    className="input"
                  >
                    <option value="">Seleziona un appuntamento</option>
                    {unpaidAppointments.map((apt) => (
                      <option key={apt.id} value={apt.id}>
                        {getCustomerName(apt.customerId)} -{' '}
                        {services.find((s) => s.id === apt.serviceId)?.name} (
                        {format(parseISO(apt.date), 'dd MMM yyyy', {
                          locale: it,
                        })}
                        )
                      </option>
                    ))}
                  </select>
                  {unpaidAppointments.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Non ci sono appuntamenti completati senza pagamento
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Importo (€) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amount: parseFloat(e.target.value),
                        })
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">Metodo di Pagamento *</label>
                    <select
                      required
                      value={formData.method}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          method: e.target.value as Payment['method'],
                        })
                      }
                      className="input"
                    >
                      <option value="cash">Contanti</option>
                      <option value="card">Carta</option>
                      <option value="transfer">Bonifico</option>
                      <option value="other">Altro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Data Pagamento *</label>
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
                  <label className="label">Note</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="input"
                    rows={3}
                    placeholder="Note aggiuntive sul pagamento..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={unpaidAppointments.length === 0}
                  >
                    Registra Pagamento
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary flex-1"
                  >
                    Annulla
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
