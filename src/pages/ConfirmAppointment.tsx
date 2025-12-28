import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Calendar, Clock, User, Sparkles, Heart, Home } from 'lucide-react';
import { format, parse } from 'date-fns';
import { it } from 'date-fns/locale';
import { appointmentsApi } from '../utils/api';
import type { Appointment } from '../types';

const ConfirmAppointment: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get('id');
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const confirmAppointment = useCallback(async () => {
    if (!appointmentId || !token) {
      setError('Link non valido. Parametri mancanti.');
      setIsLoading(false);
      return;
    }

    try {
      const confirmedAppointment = await appointmentsApi.confirm(appointmentId, token);
      setAppointment(confirmedAppointment);
      setSuccess(true);
      setShowConfetti(true);
      // Hide confetti after 3 seconds
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Errore durante la conferma dell\'appuntamento');
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId, token]);

  useEffect(() => {
    confirmAppointment();
  }, [confirmAppointment]);

  // Confetti animation
  const renderConfetti = () => {
    if (!showConfetti) return null;

    const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      rotation: Math.random() * 360,
      color: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][i % 5],
    }));

    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {confettiPieces.map((piece) => (
          <div
            key={piece.id}
            className="absolute w-3 h-3 opacity-80 animate-confetti"
            style={{
              left: `${piece.left}%`,
              top: '-10%',
              backgroundColor: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              transform: `rotate(${piece.rotation}deg)`,
            }}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-12 max-w-md w-full text-center transform transition-all duration-500 hover:scale-105">
          <div className="relative mb-6">
            <Loader className="animate-spin text-primary-600 mx-auto" size={64} />
            <div className="absolute inset-0 animate-ping opacity-20">
              <Loader className="text-primary-400 mx-auto" size={64} />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Conferma in corso...
          </h1>
          <p className="text-gray-600 text-lg">Stiamo confermando il tuo appuntamento</p>
          <div className="mt-6 flex justify-center gap-2">
            <div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
          <div className="absolute top-40 right-10 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000" />
        </div>

        {renderConfetti()}

        <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-12 max-w-2xl w-full transform transition-all duration-500 hover:shadow-3xl">
          {/* Success Icon with animation */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75" />
              <div className="relative bg-gradient-to-br from-green-400 to-emerald-500 rounded-full w-28 h-28 flex items-center justify-center mx-auto mb-6 shadow-lg transform transition-transform hover:scale-110">
                <CheckCircle className="text-white drop-shadow-lg" size={64} strokeWidth={2.5} />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="text-yellow-500 animate-pulse" size={24} />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Confermato!
              </h1>
              <Sparkles className="text-yellow-500 animate-pulse" size={24} />
            </div>

            <p className="text-xl text-gray-700 mb-2 font-medium">
              Il tuo appuntamento è stato confermato con successo
            </p>
            <div className="flex items-center justify-center gap-2 text-green-600">
              <Heart className="animate-pulse" size={20} />
              <p className="text-lg">Grazie per aver scelto Sphyra Wellness Lab!</p>
            </div>
          </div>

          {/* Appointment Details Card */}
          {appointment && (
            <div className="bg-gradient-to-br from-gray-50 to-green-50 rounded-2xl p-6 mb-8 border border-green-100 shadow-inner">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-green-200">
                <Calendar className="text-green-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Dettagli Appuntamento</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-green-100 rounded-lg p-3">
                    <Calendar className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Data</p>
                    <p className="text-lg font-bold text-gray-900">
                      {format(parse(appointment.date, 'yyyy-MM-dd', new Date()), 'EEEE d MMMM yyyy', { locale: it })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-emerald-100 rounded-lg p-3">
                    <Clock className="text-emerald-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Orario</p>
                    <p className="text-lg font-bold text-gray-900">{appointment.startTime}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-teal-100 rounded-lg p-3">
                    <User className="text-teal-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Stato</p>
                    <span className="inline-block px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-sm font-bold shadow-md">
                      ✓ Confermato
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Thank you message and CTA */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-6 border border-green-200">
              <p className="text-center text-gray-800 leading-relaxed">
                <span className="font-semibold text-green-700">Ti aspettiamo!</span>
                <br />
                Se hai bisogno di modificare o cancellare l'appuntamento, non esitare a contattarci.
                <br />
                <span className="text-sm text-gray-600 mt-2 block">
                  Riceverai un promemoria via email prima dell'appuntamento.
                </span>
              </p>
            </div>

            <button
              onClick={() => navigate('/prenota')}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
            >
              <Home size={20} />
              Torna alla Prenotazione
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-12 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-br from-red-400 to-pink-500 rounded-full w-28 h-28 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <XCircle className="text-white drop-shadow-lg" size={64} strokeWidth={2.5} />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-3">
            Ops! Qualcosa non ha funzionato
          </h1>
          <p className="text-xl text-gray-700 mb-6">
            Non è stato possibile confermare il tuo appuntamento
          </p>

          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 mb-6 border border-red-200">
            <p className="text-red-800 font-semibold mb-2">Motivo:</p>
            <p className="text-red-700">{error}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200">
            <p className="text-center text-gray-800 leading-relaxed">
              <span className="font-semibold text-orange-700">Niente panico!</span>
              <br />
              Il link potrebbe essere scaduto o già utilizzato.
              <br />
              <span className="text-sm text-gray-600 mt-2 block">
                Se hai bisogno di assistenza, contattaci direttamente. Saremo felici di aiutarti!
              </span>
            </p>
          </div>

          <button
            onClick={() => navigate('/prenota')}
            className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
          >
            <Home size={20} />
            Torna alla Prenotazione
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmAppointment;
