import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, User, Mail, Phone, CheckCircle, ArrowRight, ArrowLeft, Loader, Search, ChevronLeft, ChevronRight, Shield, Plane, AlertCircle } from 'lucide-react';
import type { Service, ServiceCategory, Staff, VacationPeriod } from '../types';
import { format, addDays, startOfWeek, isBefore, startOfDay, parse, getDay, isWithinInterval, startOfMonth, endOfMonth, addMonths, isSameMonth, isSameDay, eachDayOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { getImageUrl } from '../services/uploadService';
import { formatCurrency } from '../utils/currency';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface BookingData {
  serviceId: string;
  date: string;
  startTime: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes?: string;
  privacyConsent?: boolean;
  emailReminderConsent?: boolean;
  smsReminderConsent?: boolean;
  healthDataConsent?: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
  staffId?: string;
}

interface BookingErrors {
  serviceId?: string;
  date?: string;
  startTime?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  privacyConsent?: string;
  emailReminderConsent?: string;
  smsReminderConsent?: string;
  healthDataConsent?: string;
}

const PublicBooking: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Separate loading states for better UX
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
  const [bookingWindowDays, setBookingWindowDays] = useState<number>(90);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfDay(new Date())); // Mese corrente per il calendario
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const SERVICES_PER_PAGE = 10;

  // Refs for AbortController to cancel previous requests
  const slotsAbortControllerRef = useRef<AbortController | null>(null);

  const [bookingData, setBookingData] = useState<BookingData>({
    serviceId: '',
    date: '',
    startTime: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
    privacyConsent: false,
    emailReminderConsent: false,
    smsReminderConsent: false,
    healthDataConsent: false
  });

  const [errors, setErrors] = useState<BookingErrors>({});

  // Debounce search query to avoid excessive re-renders
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Carica servizi, categorie e configurazioni all'avvio
  useEffect(() => {
    loadServices();
    loadSettings();
  }, []);

  // Carica slot disponibili quando servizio e data sono selezionati
  // Uses AbortController to prevent race conditions
  useEffect(() => {
    if (bookingData.serviceId && bookingData.date) {
      loadAvailableSlots(bookingData.serviceId, bookingData.date);
    } else {
      // Clear slots if service or date is deselected
      setAvailableSlots([]);
    }

    // Cleanup: abort pending requests when dependencies change
    return () => {
      if (slotsAbortControllerRef.current) {
        slotsAbortControllerRef.current.abort();
      }
    };
  }, [bookingData.serviceId, bookingData.date]);

  const loadServices = async () => {
    try {
      setIsLoadingServices(true);
      const response = await fetch(`${API_URL}/public/services`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Errore nel caricamento dei servizi');
      }

      setServices(data.data?.services || []);
      setCategories(data.data?.categories || []);
    } catch (error: any) {
      console.error('Errore nel caricamento dei servizi:', error);
      alert('Impossibile caricare i servizi. Riprova più tardi.');
    } finally {
      setIsLoadingServices(false);
    }
  };

  const loadSettings = async () => {
    try {
      // Carica vacation periods
      const vacationResponse = await fetch(`${API_URL}/settings/vacation-periods`);
      const vacationData = await vacationResponse.json();
      console.log('Vacation periods loaded:', vacationData);
      if (vacationData.success && vacationData.data?.vacationPeriods) {
        setVacationPeriods(vacationData.data.vacationPeriods);
        console.log('Vacation periods set to state:', vacationData.data.vacationPeriods);
      }

      // Carica booking window days
      const bookingWindowResponse = await fetch(`${API_URL}/settings/booking-window-days`);
      const bookingWindowData = await bookingWindowResponse.json();
      console.log('Booking window days loaded:', bookingWindowData);
      if (bookingWindowData.success && bookingWindowData.data?.bookingWindowDays) {
        setBookingWindowDays(bookingWindowData.data.bookingWindowDays);
      }
    } catch (error: any) {
      console.error('Errore nel caricamento delle impostazioni:', error);
      // Non mostriamo errore all'utente, usiamo i valori di default
    }
  };

  // Helper: verifica se una data è in un periodo di ferie
  const isDateInVacation = (date: Date): boolean => {
    return vacationPeriods.some(period => {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      return isWithinInterval(date, { start, end });
    });
  };

  // Helper: trova i periodi di ferie attivi (che si sovrappongono con la finestra di prenotazione)
  const getActiveVacationPeriods = (): VacationPeriod[] => {
    const today = startOfDay(new Date());
    const maxDate = addDays(today, bookingWindowDays);

    return vacationPeriods.filter(period => {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      // Verifica se il periodo si sovrappone con la finestra di prenotazione
      return (start <= maxDate && end >= today);
    });
  };

  const loadAvailableSlots = async (serviceId: string, date: string) => {
    // Abort previous request if still pending
    if (slotsAbortControllerRef.current) {
      slotsAbortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    slotsAbortControllerRef.current = abortController;

    try {
      setIsLoadingSlots(true);

      // Fetch available slots (business hours are now loaded from database on backend)
      const url = `${API_URL}/public/available-slots?serviceId=${serviceId}&date=${date}`;
      const response = await fetch(url, { signal: abortController.signal });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Errore nel caricamento degli slot');
      }

      // Only update state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setAvailableSlots(data.data?.slots || []);
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Errore nel caricamento degli slot:', error);
      if (!abortController.signal.aborted) {
        setAvailableSlots([]);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoadingSlots(false);
      }
    }
  };

  const selectedService = services.find(s => s.id === bookingData.serviceId);

  // Utility: check if health data consent is required
  const isHealthConsentRequired = useCallback(() => {
    return !!(bookingData.notes && bookingData.notes.trim());
  }, [bookingData.notes]);

  // Filtra e pagina i servizi (using debounced search query)
  const filteredServices = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return services;
    }

    const query = debouncedSearchQuery.toLowerCase();
    return services.filter(service =>
      service.name.toLowerCase().includes(query) ||
      service.description?.toLowerCase().includes(query) ||
      categories.find(c => c.id === service.category)?.name.toLowerCase().includes(query)
    );
  }, [services, debouncedSearchQuery, categories]);

  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * SERVICES_PER_PAGE;
    const endIndex = startIndex + SERVICES_PER_PAGE;
    return filteredServices.slice(startIndex, endIndex);
  }, [filteredServices, currentPage]);

  const totalPages = Math.ceil(filteredServices.length / SERVICES_PER_PAGE);

  // Reset alla prima pagina quando cambia la ricerca
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  const validateStep = (currentStep: number): boolean => {
    const newErrors: BookingErrors = {};

    if (currentStep === 1 && !bookingData.serviceId) {
      newErrors.serviceId = 'Seleziona un servizio';
    }

    if (currentStep === 2) {
      if (!bookingData.date) newErrors.date = 'Seleziona una data';
      if (!bookingData.startTime) newErrors.startTime = 'Seleziona un orario';
    }

    if (currentStep === 3) {
      if (!bookingData.firstName.trim()) newErrors.firstName = 'Il nome è obbligatorio';
      if (!bookingData.lastName.trim()) newErrors.lastName = 'Il cognome è obbligatorio';
      if (!bookingData.email.trim()) {
        newErrors.email = 'L\'email è obbligatoria';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.email)) {
        newErrors.email = 'Email non valida';
      }
      if (!bookingData.phone.trim()) {
        newErrors.phone = 'Il telefono è obbligatorio';
      }
      if (!bookingData.privacyConsent) {
        newErrors.privacyConsent = 'Devi accettare l\'informativa sulla privacy per procedere';
      }
      // Validazione consenso dati sensibili solo se ci sono note (centralized logic)
      if (isHealthConsentRequired() && !bookingData.healthDataConsent) {
        newErrors.healthDataConsent = 'Devi acconsentire al trattamento dei dati relativi ad allergie/condizioni di salute';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((step + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleBack = () => {
    setStep((step - 1) as 1 | 2 | 3 | 4);
    setErrors({});

    // Reset startTime when going back from step 3 to step 2
    // to avoid confusion if user changes date
    if (step === 3) {
      setBookingData(prev => ({ ...prev, startTime: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/public/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Specific error messages based on backend response
        const errorMessage = data.error || data.message || 'Errore nella prenotazione';

        // Check for specific error types
        if (errorMessage.includes('slot is no longer available') || errorMessage.includes('slot non')) {
          throw new Error('⏰ Questo orario non è più disponibile.\n\nQualcun altro potrebbe averlo prenotato.\nTorna indietro e scegli un altro orario.');
        } else if (errorMessage.includes('past date') || errorMessage.includes('data passata')) {
          throw new Error('📅 Non è possibile prenotare per date passate.\n\nSeleziona una data futura.');
        } else if (errorMessage.includes('consent') || errorMessage.includes('consenso')) {
          throw new Error('🔒 ' + errorMessage);
        } else {
          throw new Error(errorMessage);
        }
      }

      setStep(4);
    } catch (error: any) {
      console.error('Booking error:', error);

      // Handle network errors with clearer messages
      if (error.message === 'Failed to fetch' || error.name === 'TypeError' && error.message.includes('fetch')) {
        const apiUrl = API_URL.replace('/api', '');
        alert(
          `🌐 Impossibile connettersi al server.\n\n` +
          `Possibili cause:\n` +
          `• Il server non è in esecuzione\n` +
          `• Problema di connessione di rete\n` +
          `• Configurazione CORS\n\n` +
          `Server: ${apiUrl}\n\n` +
          `💡 Riprova tra qualche istante.`
        );
      } else if (error.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      } else {
        // Display the error message (which may have emoji and formatting)
        alert(error.message || '❌ Errore durante la prenotazione.\n\nRiprova più tardi o contattaci.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Selezione Servizio
  const renderServiceSelection = () => {
    const groupedServices: Record<string, Service[]> = {};

    paginatedServices.forEach(service => {
      const categoryId = service.category || 'other';
      if (!groupedServices[categoryId]) {
        groupedServices[categoryId] = [];
      }
      groupedServices[categoryId].push(service);
    });

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">Scegli il tuo servizio</h2>
          <p className="text-sm sm:text-base text-gray-600">Seleziona il trattamento che desideri prenotare</p>
        </div>

        {/* Barra di ricerca */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca servizio, categoria o descrizione..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              {filteredServices.length === 0
                ? 'Nessun servizio trovato'
                : `${filteredServices.length} servizio${filteredServices.length !== 1 ? 'i' : ''} trovato${filteredServices.length !== 1 ? 'i' : ''}`
              }
            </p>
          )}
        </div>

        {paginatedServices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {searchQuery ? 'Nessun servizio corrisponde alla ricerca' : 'Nessun servizio disponibile'}
            </p>
          </div>
        ) : (
          <>
            {Object.entries(groupedServices).map(([categoryId, categoryServices]) => {
          const category = categories.find(c => c.id === categoryId);
          return (
            <div key={categoryId}>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                {category?.name || 'Altri Servizi'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryServices.map(service => {
                  const imageUrl = getImageUrl(service.imageUrl);
                  return (
                    <button
                      key={service.id}
                      onClick={() => setBookingData({ ...bookingData, serviceId: service.id })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        bookingData.serviceId === service.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300 bg-white'
                      }`}
                    >
                      {imageUrl && (
                        <div className="mb-3">
                          <img
                            src={imageUrl}
                            alt={service.name}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        </div>
                      )}
                      <h4 className="font-semibold text-gray-900 mb-1">{service.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          <Clock className="inline w-4 h-4 mr-1" />
                          {service.duration} min
                        </span>
                        <span className="font-semibold text-primary-600">
                          {formatCurrency(service.price)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

            {errors.serviceId && (
              <p className="text-red-600 text-sm mt-2">{errors.serviceId}</p>
            )}

            {/* Paginazione */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 py-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg font-semibold ${
                        currentPage === page
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              {filteredServices.length > SERVICES_PER_PAGE && (
                <p className="text-sm text-gray-600">
                  Visualizzati {((currentPage - 1) * SERVICES_PER_PAGE) + 1}-{Math.min(currentPage * SERVICES_PER_PAGE, filteredServices.length)} di {filteredServices.length} servizi
                </p>
              )}
              <button
                onClick={handleNext}
                disabled={!bookingData.serviceId}
                className="btn-primary flex items-center gap-2 ml-auto"
              >
                Avanti
                <ArrowRight size={20} />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  // Step 2: Selezione Data e Ora
  const renderDateTimeSelection = () => {
    const today = startOfDay(new Date());
    const maxDate = addDays(today, bookingWindowDays);

    // Giorni del mese corrente visualizzato
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Calcola il primo giorno della settimana per allineamento (lunedì = 0)
    const firstDayOfMonth = monthStart.getDay();
    const startPadding = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Converte domenica=0 a 6

    // Aggiungi giorni vuoti all'inizio per allineamento
    const paddedDays = [
      ...Array(startPadding).fill(null),
      ...monthDays
    ];

    // Funzioni di navigazione mese
    const canGoPrevious = isSameMonth(currentMonth, today) === false && startOfMonth(currentMonth) > today;
    const canGoNext = startOfMonth(addMonths(currentMonth, 1)) < maxDate;

    const handlePreviousMonth = () => {
      if (canGoPrevious) {
        setCurrentMonth(addMonths(currentMonth, -1));
      }
    };

    const handleNextMonth = () => {
      if (canGoNext) {
        setCurrentMonth(addMonths(currentMonth, 1));
      }
    };

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">Scegli data e ora</h2>
          <p className="text-sm sm:text-base text-gray-600">
            {selectedService?.name} - {selectedService?.duration} minuti
          </p>
        </div>

        {/* Selezione Data - Calendario Mensile */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <Calendar className="inline w-4 h-4 mr-2" />
            Seleziona una data
          </label>

          {/* Header mese con navigazione */}
          <div className="flex items-center justify-between mb-4 bg-primary-50 rounded-lg p-3">
            <button
              onClick={handlePreviousMonth}
              disabled={!canGoPrevious}
              className={`p-2 rounded-lg transition-colors ${
                canGoPrevious
                  ? 'hover:bg-primary-100 text-primary-700'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Mese precedente"
            >
              <ChevronLeft size={24} />
            </button>

            <h3 className="text-lg font-bold text-primary-900">
              {format(currentMonth, 'MMMM yyyy', { locale: it })}
            </h3>

            <button
              onClick={handleNextMonth}
              disabled={!canGoNext}
              className={`p-2 rounded-lg transition-colors ${
                canGoNext
                  ? 'hover:bg-primary-100 text-primary-700'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Mese successivo"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Header giorni della settimana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Griglia calendario */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {paddedDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const dateStr = format(day, 'yyyy-MM-dd');
              const isPast = isBefore(day, today);
              const isFuture = day > maxDate;
              const isWeekend = day.getDay() === 0; // Solo domenica disabilitata
              const isVacation = isDateInVacation(day);
              const isSelected = bookingData.date === dateStr;
              const isToday = isSameDay(day, today);
              const isDisabled = isPast || isFuture || isWeekend || isVacation;

              return (
                <button
                  key={dateStr}
                  onClick={() => !isDisabled && setBookingData({ ...bookingData, date: dateStr, startTime: '' })}
                  disabled={isDisabled}
                  className={`aspect-square p-1 sm:p-2 rounded-lg border-2 text-center transition-all relative
                    ${isSelected
                      ? 'border-primary-500 bg-primary-500 text-white font-bold'
                      : isToday
                      ? 'border-primary-300 bg-white text-primary-700 font-semibold'
                      : 'border-gray-200 bg-white text-gray-900'
                    }
                    ${isDisabled
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:border-primary-300 hover:bg-primary-50 cursor-pointer'
                    }
                  `}
                  title={
                    isVacation
                      ? 'Chiuso per ferie'
                      : isWeekend
                      ? 'Chiuso'
                      : isPast
                      ? 'Data passata'
                      : isFuture
                      ? 'Oltre la finestra di prenotazione'
                      : ''
                  }
                >
                  {isVacation && (
                    <div className="absolute top-0.5 right-0.5">
                      <Plane className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-500" />
                    </div>
                  )}
                  <div className={`text-xs sm:text-sm ${isSelected ? 'font-bold' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </button>
              );
            })}
          </div>

          {errors.date && <p className="text-red-600 text-sm mt-2">{errors.date}</p>}

          {/* Legenda */}
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded border-2 border-primary-300 bg-white"></div>
              <span>Oggi</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded border-2 border-primary-500 bg-primary-500"></div>
              <span>Selezionato</span>
            </div>
            <div className="flex items-center gap-1">
              <Plane className="w-3 h-3 text-orange-500" />
              <span>Chiuso per ferie</span>
            </div>
          </div>
        </div>

        {/* Selezione Ora */}
        {bookingData.date && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <Clock className="inline w-4 h-4 mr-2" />
              Seleziona un orario
            </label>
            {isLoadingSlots ? (
              <div className="flex justify-center py-8">
                <Loader className="animate-spin text-primary-600" size={32} />
                <p className="ml-3 text-gray-600">Caricamento slot disponibili...</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-center text-gray-600 py-8">
                Nessuno slot disponibile per questa data. Prova un'altra data.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                {availableSlots.map(slot => (
                  <button
                    key={slot.time}
                    onClick={() => setBookingData({ ...bookingData, startTime: slot.time })}
                    disabled={!slot.available}
                    className={`p-2 sm:p-3 rounded-lg border-2 text-center font-semibold transition-all touch-manipulation min-h-[44px] ${
                      bookingData.startTime === slot.time
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : slot.available
                        ? 'border-gray-200 hover:border-primary-300 bg-white text-gray-900'
                        : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-sm sm:text-base">{slot.time}</span>
                  </button>
                ))}
              </div>
            )}
            {errors.startTime && <p className="text-red-600 text-sm mt-2">{errors.startTime}</p>}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <button onClick={handleBack} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={20} />
            Indietro
          </button>
          <button
            onClick={handleNext}
            disabled={!bookingData.date || !bookingData.startTime}
            className="btn-primary flex items-center gap-2"
          >
            Avanti
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  // Step 3: Dati Cliente
  const renderCustomerForm = () => {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">I tuoi dati</h2>
          <p className="text-gray-600">Inserisci le tue informazioni per completare la prenotazione</p>
        </div>

        <div className="bg-primary-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Riepilogo prenotazione:</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <p><strong>Servizio:</strong> {selectedService?.name}</p>
            <p><strong>Data:</strong> {bookingData.date && format(parse(bookingData.date, 'yyyy-MM-dd', new Date()), 'dd MMMM yyyy', { locale: it })}</p>
            <p><strong>Orario:</strong> {bookingData.startTime}</p>
            <p><strong>Durata:</strong> {selectedService?.duration} minuti</p>
            <p><strong>Prezzo:</strong> {formatCurrency(selectedService?.price)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <User className="inline w-4 h-4 mr-2" />
              Nome *
            </label>
            <input
              type="text"
              value={bookingData.firstName}
              onChange={(e) => setBookingData({ ...bookingData, firstName: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                errors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Mario"
            />
            {errors.firstName && <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Cognome *
            </label>
            <input
              type="text"
              value={bookingData.lastName}
              onChange={(e) => setBookingData({ ...bookingData, lastName: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                errors.lastName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Rossi"
            />
            {errors.lastName && <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Mail className="inline w-4 h-4 mr-2" />
            Email *
          </label>
          <input
            type="email"
            value={bookingData.email}
            onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="mario.rossi@esempio.it"
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Phone className="inline w-4 h-4 mr-2" />
            Telefono *
          </label>
          <input
            type="tel"
            value={bookingData.phone}
            onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="+39 333 1234567"
          />
          {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Note (opzionale)
          </label>
          <textarea
            value={bookingData.notes}
            onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            rows={3}
            placeholder="Allergie, note particolari..."
          />
        </div>

        {/* Sezione Consensi Privacy */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-pink-600" />
            <h3 className="font-semibold text-gray-900">Informativa Privacy e Consensi</h3>
          </div>

          {/* Consenso Privacy Obbligatorio */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="privacyConsent"
              checked={bookingData.privacyConsent || false}
              onChange={(e) => setBookingData({ ...bookingData, privacyConsent: e.target.checked })}
              className={`mt-1 w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500 ${
                errors.privacyConsent ? 'border-red-500' : ''
              }`}
            />
            <label htmlFor="privacyConsent" className="text-sm text-gray-700 flex-1">
              <span className="font-semibold text-red-600">* </span>
              Ho letto e accetto l'
              <Link
                to="/privacy"
                target="_blank"
                className="text-pink-600 hover:text-pink-700 underline font-semibold"
              >
                Informativa sulla Privacy
              </Link>
              {' '}e acconsento al trattamento dei miei dati personali per la gestione della prenotazione.
            </label>
          </div>
          {errors.privacyConsent && (
            <p className="text-red-600 text-sm ml-7">{errors.privacyConsent}</p>
          )}

          {/* Consenso Email Promemoria */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="emailReminderConsent"
              checked={bookingData.emailReminderConsent || false}
              onChange={(e) => setBookingData({ ...bookingData, emailReminderConsent: e.target.checked })}
              className="mt-1 w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
            />
            <label htmlFor="emailReminderConsent" className="text-sm text-gray-700 flex-1">
              Acconsento a ricevere <strong>email</strong> di promemoria automatiche relative agli appuntamenti prenotati.
            </label>
          </div>

          {/* Consenso SMS Promemoria */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="smsReminderConsent"
              checked={bookingData.smsReminderConsent || false}
              onChange={(e) => setBookingData({ ...bookingData, smsReminderConsent: e.target.checked })}
              className="mt-1 w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
            />
            <label htmlFor="smsReminderConsent" className="text-sm text-gray-700 flex-1">
              Acconsento a ricevere <strong>SMS</strong> di promemoria automatici relativi agli appuntamenti prenotati.
              <p className="text-xs text-gray-500 mt-1">
                Gli SMS verranno inviati al numero <strong>{bookingData.phone || '[numero telefono]'}</strong>.
                Potrebbero essere applicati i costi standard del tuo operatore telefonico.
              </p>
            </label>
          </div>

          {/* Consenso Dati Sensibili - Solo se ci sono note (centralized logic) */}
          {isHealthConsentRequired() && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="healthDataConsent"
                  checked={bookingData.healthDataConsent || false}
                  onChange={(e) => setBookingData({ ...bookingData, healthDataConsent: e.target.checked })}
                  className={`mt-1 w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500 ${
                    errors.healthDataConsent ? 'border-red-500' : ''
                  }`}
                />
                <label htmlFor="healthDataConsent" className="text-sm text-gray-700 flex-1">
                  <span className="font-semibold text-red-600">* </span>
                  Acconsento esplicitamente al trattamento dei dati particolari (allergie, condizioni di salute)
                  inseriti nelle note, necessari per garantire la mia sicurezza durante i trattamenti
                  (art. 9 GDPR - Dati particolari).
                </label>
              </div>
              {errors.healthDataConsent && (
                <p className="text-red-600 text-sm ml-7 mt-2">{errors.healthDataConsent}</p>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3">
            <span className="font-semibold text-red-600">* </span>
            Campi obbligatori. Per maggiori informazioni consulta la nostra{' '}
            <Link
              to="/privacy"
              target="_blank"
              className="text-pink-600 hover:text-pink-700 underline"
            >
              Informativa sulla Privacy
            </Link>.
          </p>
        </div>

        <div className="flex justify-between pt-4">
          <button onClick={handleBack} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={20} />
            Indietro
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader className="animate-spin" size={20} />
                Prenotazione in corso...
              </>
            ) : (
              <>
                Conferma Prenotazione
                <CheckCircle size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Step 4: Conferma
  const renderConfirmation = () => {
    return (
      <div className="text-center space-y-6">
        <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto">
          <CheckCircle className="text-green-600" size={56} />
        </div>

        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Prenotazione Completata!</h2>
          <p className="text-gray-600 text-lg">
            La tua prenotazione è stata registrata con successo.
          </p>
        </div>

        <div className="bg-primary-50 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="font-semibold text-gray-900 mb-4">Dettagli della prenotazione:</h3>
          <div className="text-left text-sm text-gray-700 space-y-2">
            <p><strong>Servizio:</strong> {selectedService?.name}</p>
            <p><strong>Data:</strong> {bookingData.date && format(parse(bookingData.date, 'yyyy-MM-dd', new Date()), 'dd MMMM yyyy', { locale: it })}</p>
            <p><strong>Orario:</strong> {bookingData.startTime}</p>
            <p><strong>Durata:</strong> {selectedService?.duration} minuti</p>
            <p><strong>Cliente:</strong> {bookingData.firstName} {bookingData.lastName}</p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-sm text-blue-900">
            <strong>📧 Controlla la tua email!</strong><br />
            Ti abbiamo inviato una conferma all'indirizzo <strong>{bookingData.email}</strong>.
            Clicca sul link nell'email per confermare definitivamente il tuo appuntamento.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Fai una Nuova Prenotazione
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-50 py-4 sm:py-6 md:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header con logo */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-600 mb-2">Sphyra Wellness Lab</h1>
          <p className="text-sm sm:text-base text-gray-600">Prenota il tuo appuntamento online</p>
        </div>

        {/* Vacation Notice */}
        {getActiveVacationPeriods().length > 0 && (
          <div className="mb-6 sm:mb-8 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-4 sm:p-6 shadow-md">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <Plane className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-orange-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Periodo di Chiusura
                </h3>
                <div className="space-y-2 text-sm sm:text-base text-orange-800">
                  {getActiveVacationPeriods().map((period, index) => (
                    <div key={period.id} className="flex items-start gap-2">
                      <span className="font-semibold">•</span>
                      <div>
                        <div className="font-medium">
                          Dal {format(new Date(period.startDate), 'dd MMMM yyyy', { locale: it })} al{' '}
                          {format(new Date(period.endDate), 'dd MMMM yyyy', { locale: it })}
                        </div>
                        {period.reason && (
                          <div className="text-sm text-orange-700 italic">{period.reason}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <p className="font-medium">
                      Le prenotazioni online sono disponibili per tutti gli altri giorni.
                    </p>
                    <p className="text-sm mt-1">
                      Seleziona una data disponibile dal calendario qui sotto per prenotare il tuo appuntamento.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        {step < 4 && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-center">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base ${
                      step >= s
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-8 sm:w-12 md:w-16 h-1 mx-1 sm:mx-2 ${
                        step > s ? 'bg-primary-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-center mt-2 text-xs sm:text-sm text-gray-600">
              <div className="w-20 sm:w-28 md:w-32 text-center">Servizio</div>
              <div className="w-20 sm:w-28 md:w-32 text-center">Data e Ora</div>
              <div className="w-20 sm:w-28 md:w-32 text-center">Dati</div>
            </div>
          </div>
        )}

        {/* Content Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8">
          {step === 1 && renderServiceSelection()}
          {step === 2 && renderDateTimeSelection()}
          {step === 3 && renderCustomerForm()}
          {step === 4 && renderConfirmation()}
        </div>
      </div>
    </div>
  );
};

export default PublicBooking;
