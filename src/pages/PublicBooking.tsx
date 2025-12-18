import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Mail, Phone, CheckCircle, ArrowRight, ArrowLeft, Loader } from 'lucide-react';
import type { Service, ServiceCategory, Staff } from '../types';
import { format, addDays, startOfWeek, isBefore, startOfDay, parse } from 'date-fns';
import { it } from 'date-fns/locale';
import { getImageUrl } from '../services/uploadService';

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
}

interface TimeSlot {
  time: string;
  available: boolean;
  staffId?: string;
}

const PublicBooking: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  const [bookingData, setBookingData] = useState<BookingData>({
    serviceId: '',
    date: '',
    startTime: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Partial<BookingData>>({});

  // Carica servizi e categorie all'avvio
  useEffect(() => {
    loadServices();
  }, []);

  // Carica slot disponibili quando servizio e data sono selezionati
  useEffect(() => {
    if (bookingData.serviceId && bookingData.date) {
      loadAvailableSlots(bookingData.serviceId, bookingData.date);
    }
  }, [bookingData.serviceId, bookingData.date]);

  const loadServices = async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const loadAvailableSlots = async (serviceId: string, date: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/public/available-slots?serviceId=${serviceId}&date=${date}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Errore nel caricamento degli slot');
      }

      setAvailableSlots(data.data?.slots || []);
    } catch (error: any) {
      console.error('Errore nel caricamento degli slot:', error);
      setAvailableSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedService = services.find(s => s.id === bookingData.serviceId);

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Partial<BookingData> = {};

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
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/public/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Errore nella prenotazione');
      }

      setStep(4);
    } catch (error: any) {
      // Handle network errors with clearer messages
      if (error.message === 'Failed to fetch' || error.name === 'TypeError' && error.message.includes('fetch')) {
        const apiUrl = API_URL.replace('/api', '');
        alert(
          `Impossibile connettersi al server.\n\n` +
          `Possibili cause:\n` +
          `• Il server non è in esecuzione\n` +
          `• Problema di connessione\n` +
          `• Configurazione CORS\n\n` +
          `URL: ${apiUrl}`
        );
      } else {
        alert(error.message || 'Errore durante la prenotazione. Riprova.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Selezione Servizio
  const renderServiceSelection = () => {
    const groupedServices: Record<string, Service[]> = {};

    services.forEach(service => {
      const categoryId = service.category || 'other';
      if (!groupedServices[categoryId]) {
        groupedServices[categoryId] = [];
      }
      groupedServices[categoryId].push(service);
    });

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Scegli il tuo servizio</h2>
          <p className="text-gray-600">Seleziona il trattamento che desideri prenotare</p>
        </div>

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
                          €{service.price.toFixed(2)}
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
          <p className="text-red-600 text-sm text-center">{errors.serviceId}</p>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            disabled={!bookingData.serviceId}
            className="btn-primary flex items-center gap-2"
          >
            Avanti
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  // Step 2: Selezione Data e Ora
  const renderDateTimeSelection = () => {
    const today = startOfDay(new Date());
    const nextDays = Array.from({ length: 14 }, (_, i) => addDays(today, i));

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Scegli data e ora</h2>
          <p className="text-gray-600">
            {selectedService?.name} - {selectedService?.duration} minuti
          </p>
        </div>

        {/* Selezione Data */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <Calendar className="inline w-4 h-4 mr-2" />
            Seleziona una data
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {nextDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <button
                  key={dateStr}
                  onClick={() => setBookingData({ ...bookingData, date: dateStr, startTime: '' })}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    bookingData.date === dateStr
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300 bg-white'
                  } ${isWeekend ? 'opacity-50' : ''}`}
                  disabled={isWeekend}
                >
                  <div className="text-xs text-gray-600 uppercase">
                    {format(day, 'EEE', { locale: it })}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {format(day, 'dd')}
                  </div>
                  <div className="text-xs text-gray-600">
                    {format(day, 'MMM', { locale: it })}
                  </div>
                </button>
              );
            })}
          </div>
          {errors.date && <p className="text-red-600 text-sm mt-2">{errors.date}</p>}
        </div>

        {/* Selezione Ora */}
        {bookingData.date && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <Clock className="inline w-4 h-4 mr-2" />
              Seleziona un orario
            </label>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader className="animate-spin text-primary-600" size={32} />
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-center text-gray-600 py-8">
                Nessuno slot disponibile per questa data. Prova un'altra data.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {availableSlots.map(slot => (
                  <button
                    key={slot.time}
                    onClick={() => setBookingData({ ...bookingData, startTime: slot.time })}
                    disabled={!slot.available}
                    className={`p-3 rounded-lg border-2 text-center font-semibold transition-all ${
                      bookingData.startTime === slot.time
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : slot.available
                        ? 'border-gray-200 hover:border-primary-300 bg-white text-gray-900'
                        : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {slot.time}
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
            <p><strong>Prezzo:</strong> €{selectedService?.price.toFixed(2)}</p>
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

        <div className="flex justify-between pt-4">
          <button onClick={handleBack} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={20} />
            Indietro
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn-primary flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Prenotazione...
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
          onClick={() => window.location.href = '/'}
          className="btn-primary"
        >
          Torna alla Home
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header con logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">Sphyra Wellness Lab</h1>
          <p className="text-gray-600">Prenota il tuo appuntamento online</p>
        </div>

        {/* Progress Steps */}
        {step < 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-center">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      step >= s
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-16 h-1 mx-2 ${
                        step > s ? 'bg-primary-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-center mt-2 text-sm text-gray-600">
              <div className="w-32 text-center">Servizio</div>
              <div className="w-32 text-center">Data e Ora</div>
              <div className="w-32 text-center">Dati</div>
            </div>
          </div>
        )}

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
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
