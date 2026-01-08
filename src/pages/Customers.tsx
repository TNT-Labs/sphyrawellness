import React, { useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { useDebounce } from '../hooks/useDebounce';
import { Customer, CustomerConsents } from '../types';
import { Plus, Search, Edit, Trash2, Phone, Mail, User, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { generateId, isValidEmail, isValidPhone, formatPhoneNumber } from '../utils/helpers';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { logger } from '../utils/logger';
import AppointmentModal from '../components/calendar/AppointmentModal';
import ConsentManagement from '../components/ConsentManagement';
import LoadingSpinner from '../components/LoadingSpinner';
import { customersApi } from '../api/customers';

const Customers: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, appointments, isLoading } = useApp();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmationDialog } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);

  // Paginazione
  const [currentPage, setCurrentPage] = useState(0);
  const CUSTOMERS_PER_PAGE = 30;

  // Check if filter=today is present
  const filterToday = searchParams.get('filter') === 'today';

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    notes: '',
    allergies: '',
    privacyConsent: false,
    emailReminderConsent: false,
  });

  // Track initial form data to detect unsaved changes
  const initialFormDataRef = useRef(formData);

  // Get customer IDs with appointments today
  const todayCustomerIds = useMemo(() => {
    if (!filterToday) return null;
    const todayAppointments = appointments.filter((apt) => isToday(parseISO(apt.date)));
    return new Set(todayAppointments.map((apt) => apt.customerId));
  }, [appointments, filterToday]);

  // Memoize filtered customers with debounced search
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      // Filter by today's appointments if enabled
      if (filterToday && todayCustomerIds && !todayCustomerIds.has(customer.id)) {
        return false;
      }

      // Filter by search term
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        customer.firstName.toLowerCase().includes(searchLower) ||
        customer.lastName.toLowerCase().includes(searchLower) ||
        (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
        (customer.phone && customer.phone.includes(debouncedSearchTerm))
      );
    });
  }, [customers, debouncedSearchTerm, filterToday, todayCustomerIds]);

  // Paginazione dei clienti filtrati
  const totalPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    const startIndex = currentPage * CUSTOMERS_PER_PAGE;
    return filteredCustomers.slice(startIndex, startIndex + CUSTOMERS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  // Reset page quando cambia la ricerca o il filtro
  React.useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearchTerm, filterToday]);

  const handleOpenModal = (customer?: Customer) => {
    let newFormData;
    if (customer) {
      setEditingCustomer(customer);

      // Extract yyyy-MM-dd from dateOfBirth (in case backend returns ISO timestamp)
      let dateOfBirth = customer.dateOfBirth || '';
      if (dateOfBirth && dateOfBirth.includes('T')) {
        dateOfBirth = dateOfBirth.split('T')[0];
      }

      newFormData = {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email || '',
        phone: customer.phone || '',
        dateOfBirth: dateOfBirth,
        notes: customer.notes || '',
        allergies: customer.allergies || '',
        privacyConsent: (customer as any).privacyConsent ?? true,
        emailReminderConsent: customer.emailReminderConsent || false,
      };
    } else {
      setEditingCustomer(null);
      newFormData = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        notes: '',
        allergies: '',
        privacyConsent: true,
        emailReminderConsent: false,
      };
    }
    setFormData(newFormData);
    initialFormDataRef.current = newFormData;
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    // Check for unsaved changes
    const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(initialFormDataRef.current);

    if (hasUnsavedChanges) {
      const shouldClose = window.confirm('Ci sono modifiche non salvate. Sei sicuro di voler chiudere?');
      if (!shouldClose) {
        return;
      }
    }

    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  // ESC key to close modal
  useEscapeKey(handleCloseModal, isModalOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // At least one contact method is required
    if (!formData.email?.trim() && !formData.phone?.trim()) {
      showError('Inserisci almeno un metodo di contatto (email o telefono)');
      return;
    }

    // Validate email only if provided
    if (formData.email?.trim() && !isValidEmail(formData.email)) {
      showError('Inserisci un indirizzo email valido');
      return;
    }

    // Validate phone only if provided
    if (formData.phone?.trim() && !isValidPhone(formData.phone)) {
      showError('Inserisci un numero di telefono valido (es: +39 333 1234567)');
      return;
    }

    const customerData: Customer = {
      id: editingCustomer?.id || generateId(),
      ...formData,
      email: formData.email?.trim() || undefined,
      phone: formData.phone?.trim() ? formatPhoneNumber(formData.phone) : undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      notes: formData.notes || undefined,
      allergies: formData.allergies || undefined,
      createdAt: editingCustomer?.createdAt || new Date().toISOString(),
    };

    try {
      if (editingCustomer) {
        await updateCustomer(customerData);
        showSuccess('Cliente aggiornato con successo!');
      } else {
        await addCustomer(customerData);
        showSuccess('Cliente aggiunto con successo!');
      }
      handleCloseModal();
    } catch (error) {
      showError('Errore durante il salvataggio del cliente');
      logger.error('Error saving customer:', error);
    }
  };

  const handleDelete = async (customer: Customer) => {
    const confirmed = await confirm({
      title: 'Elimina Cliente',
      message: `Sei sicuro di voler eliminare ${customer.firstName} ${customer.lastName}? Questa azione non può essere annullata.`,
      confirmText: 'Elimina',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await deleteCustomer(customer.id);
        showSuccess('Cliente eliminato con successo!');
      } catch (error) {
        // Backend will return an error if customer has future appointments
        const errorMessage = error instanceof Error ? error.message : 'Errore durante l\'eliminazione del cliente';
        showError(errorMessage);
        logger.error('Error deleting customer:', error);
      }
    }
  };

  const handleOpenAppointmentModal = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setIsAppointmentModalOpen(true);
  };

  const handleCloseAppointmentModal = () => {
    setIsAppointmentModalOpen(false);
    setSelectedCustomerId(undefined);
  };

  const handleUpdateConsents = async (customerId: string, consents: Partial<CustomerConsents>) => {
    try {
      // Chiama l'API per aggiornare i consensi (usa apiClient con JWT)
      const updatedCustomer = await customersApi.updateConsents(customerId, consents);

      // Aggiorna lo stato globale tramite AppContext
      // Questo triggera un re-render della lista clienti
      await updateCustomer(updatedCustomer);

      showSuccess('Consensi aggiornati con successo!');
    } catch (error) {
      logger.error('Error updating consents:', error);
      showError('Errore durante l\'aggiornamento dei consensi');
      throw error;
    }
  };

  return (
    <>
      <ConfirmationDialog />
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Clienti</h1>
            {filterToday && (
              <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                Solo Oggi
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">
            {filterToday
              ? 'Clienti con appuntamenti oggi'
              : 'Gestisci i clienti del tuo centro estetico'
            }
          </p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus size={20} className="inline mr-2" />
          Nuovo Cliente
        </button>
      </div>

      {/* Filter Badge and Search Bar */}
      {filterToday && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-green-600" />
              <p className="text-sm text-green-700 font-medium">
                Visualizzazione filtrata: solo clienti con appuntamenti oggi
              </p>
            </div>
            <button
              onClick={() => setSearchParams({})}
              className="text-green-600 hover:text-green-700 font-semibold text-sm flex items-center gap-1"
            >
              <X size={16} />
              Mostra Tutti
            </button>
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
            placeholder="Cerca cliente per nome, email o telefono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <LoadingSpinner size="lg" message="Caricamento clienti..." />
      ) : (
        /* Customers Grid */
        filteredCustomers.length === 0 ? (
        <div className="card text-center py-12">
          <User size={48} className="mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">
            {searchTerm
              ? 'Nessun cliente trovato'
              : 'Nessun cliente registrato'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary mt-4"
            >
              Aggiungi il primo cliente
            </button>
          )}
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedCustomers.map((customer) => (
            <div key={customer.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <User size={24} className="text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">
                      {customer.firstName} {customer.lastName}
                    </h3>
                    {customer.dateOfBirth && (
                      <p className="text-xs text-gray-500">
                        {format(new Date(customer.dateOfBirth), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {customer.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail size={16} className="mr-2 text-gray-400" />
                    {customer.email}
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone size={16} className="mr-2 text-gray-400" />
                    {customer.phone}
                  </div>
                )}
                {!customer.email && !customer.phone && (
                  <div className="text-sm text-gray-400 italic">
                    Nessun contatto disponibile
                  </div>
                )}
              </div>

              {customer.allergies && (
                <div className="mb-4">
                  <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                    Allergie: {customer.allergies}
                  </span>
                </div>
              )}

              {customer.notes && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {customer.notes}
                </p>
              )}

              {/* Consent Management */}
              <div className="mb-4">
                <ConsentManagement
                  customer={customer}
                  onUpdateConsents={handleUpdateConsents}
                />
              </div>

              <div className="space-y-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleOpenAppointmentModal(customer.id)}
                  className="w-full px-3 py-2 bg-primary-50 text-primary-600 rounded-md hover:bg-primary-100 transition-colors text-sm font-semibold touch-manipulation"
                >
                  <Calendar size={16} className="inline mr-1" />
                  Nuovo Appuntamento
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(customer)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-semibold touch-manipulation"
                  >
                    <Edit size={16} className="inline mr-1" />
                    Modifica
                  </button>
                  <button
                    onClick={() => handleDelete(customer)}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm font-semibold touch-manipulation"
                  >
                    <Trash2 size={16} className="inline mr-1" />
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Controlli di paginazione */}
        {totalPages > 1 && (
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {currentPage * CUSTOMERS_PER_PAGE + 1} -{' '}
                {Math.min((currentPage + 1) * CUSTOMERS_PER_PAGE, filteredCustomers.length)} di{' '}
                {filteredCustomers.length} clienti
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Precedente
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i).map((page) => {
                    // Mostra solo alcune pagine intorno alla pagina corrente
                    if (
                      page === 0 ||
                      page === totalPages - 1 ||
                      (page >= currentPage - 2 && page <= currentPage + 2)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 rounded-md transition-colors ${
                            currentPage === page
                              ? 'bg-primary-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page + 1}
                        </button>
                      );
                    } else if (
                      page === currentPage - 3 ||
                      page === currentPage + 3
                    ) {
                      return (
                        <span key={page} className="px-2 text-gray-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  Successiva
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        )
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-x-hidden">
          <div className="bg-white rounded-lg w-full max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingCustomer ? 'Modifica Cliente' : 'Nuovo Cliente'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nome *</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">Cognome *</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        const email = e.target.value;
                        // Auto-enable email reminder consent when email is provided
                        setFormData({
                          ...formData,
                          email,
                          emailReminderConsent: email.trim() !== '' ? true : formData.emailReminderConsent
                        });
                      }}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">Telefono</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Data di Nascita</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Allergie</label>
                  <input
                    type="text"
                    value={formData.allergies}
                    onChange={(e) =>
                      setFormData({ ...formData, allergies: e.target.value })
                    }
                    className="input"
                    placeholder="Es. Nichel, Lattice..."
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
                    placeholder="Note aggiuntive sul cliente..."
                  />
                </div>

                {/* Email Reminder Consent */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="emailReminderConsent"
                      checked={formData.emailReminderConsent}
                      onChange={(e) =>
                        setFormData({ ...formData, emailReminderConsent: e.target.checked })
                      }
                      className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="emailReminderConsent"
                        className="text-sm font-semibold text-gray-900 cursor-pointer"
                      >
                        Consenso invio promemoria via email
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        Il cliente acconsente a ricevere promemoria degli appuntamenti via email.
                        {formData.email ? (
                          <span className="block mt-1 text-green-600 font-medium">
                            ✓ Email fornita: {formData.email}
                          </span>
                        ) : (
                          <span className="block mt-1 text-orange-600 font-medium">
                            ⚠ Inserisci un'email per abilitare i promemoria
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1 touch-manipulation">
                    {editingCustomer ? 'Salva Modifiche' : 'Crea Cliente'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary flex-1 touch-manipulation"
                  >
                    Annulla
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={handleCloseAppointmentModal}
        editingAppointment={null}
        initialCustomerId={selectedCustomerId}
      />
    </div>
    </>
  );
};

export default Customers;
