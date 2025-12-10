import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Calendar } from 'lucide-react';
import { appointmentsApi } from '../utils/api';
import type { Appointment } from '../types';

const ConfirmAppointment: React.FC = () => {
  const { appointmentId, token } = useParams<{ appointmentId: string; token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);

  const confirmAppointment = useCallback(async () => {
    if (!appointmentId || !token) return;

    try {
      const confirmedAppointment = await appointmentsApi.confirm(appointmentId, token);
      setAppointment(confirmedAppointment);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Errore durante la conferma dell\'appuntamento');
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId, token]);

  useEffect(() => {
    // Check if coming from redirect with success/error params
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('message');

    if (successParam === 'true') {
      setSuccess(true);
      setIsLoading(false);
      return;
    }

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setIsLoading(false);
      return;
    }

    // Otherwise, confirm via API
    if (appointmentId && token) {
      confirmAppointment();
    } else {
      setError('Link non valido. Parametri mancanti.');
      setIsLoading(false);
    }
  }, [appointmentId, token, searchParams, confirmAppointment]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Loader className="animate-spin text-primary-600 mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Conferma in corso...</h1>
          <p className="text-gray-600">Stiamo confermando il tuo appuntamento</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={48} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Appuntamento Confermato!</h1>
            <p className="text-gray-600">
              Il tuo appuntamento è stato confermato con successo.
            </p>
          </div>

          {appointment && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="text-primary-600" size={16} />
                <span className="font-semibold text-gray-900">Dettagli Appuntamento:</span>
              </div>
              <div className="text-sm text-gray-700 space-y-1 ml-6">
                <p>
                  <span className="text-gray-600">Data:</span>{' '}
                  <span className="font-semibold">{new Date(appointment.date).toLocaleDateString('it-IT')}</span>
                </p>
                <p>
                  <span className="text-gray-600">Orario:</span>{' '}
                  <span className="font-semibold">{appointment.startTime}</span>
                </p>
                <p>
                  <span className="text-gray-600">Stato:</span>{' '}
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                    Confermato
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              Ti aspettiamo! Se hai bisogno di modificare o cancellare l'appuntamento, contattaci.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full btn-primary"
            >
              Torna alla Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <XCircle className="text-red-600" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Errore di Conferma</h1>
          <p className="text-gray-600 mb-4">
            Non è stato possibile confermare il tuo appuntamento.
          </p>
          <div className="bg-red-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800 font-semibold">{error}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-600 text-center">
            Il link potrebbe essere scaduto o non valido. Se hai bisogno di assistenza, contattaci direttamente.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full btn-primary"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmAppointment;
