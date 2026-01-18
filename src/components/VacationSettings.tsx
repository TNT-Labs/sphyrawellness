import React, { useState } from 'react';
import { Plane, Plus, Trash2, Calendar } from 'lucide-react';

export interface VacationPeriod {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason?: string;
}

interface VacationSettingsProps {
  vacationPeriods: VacationPeriod[];
  onChange: (periods: VacationPeriod[]) => void;
}

const VacationSettings: React.FC<VacationSettingsProps> = ({ vacationPeriods, onChange }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newPeriod, setNewPeriod] = useState<Omit<VacationPeriod, 'id'>>({
    startDate: '',
    endDate: '',
    reason: '',
  });

  const handleAdd = () => {
    if (!newPeriod.startDate || !newPeriod.endDate) {
      return;
    }

    if (new Date(newPeriod.endDate) < new Date(newPeriod.startDate)) {
      alert('La data di fine deve essere successiva alla data di inizio');
      return;
    }

    const period: VacationPeriod = {
      id: Date.now().toString(),
      ...newPeriod,
    };

    onChange([...vacationPeriods, period]);
    setNewPeriod({ startDate: '', endDate: '', reason: '' });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    onChange(vacationPeriods.filter(p => p.id !== id));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plane className="text-primary-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">Periodi di Chiusura / Ferie</h3>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} />
          Aggiungi Periodo
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Durante i periodi di chiusura, le prenotazioni online saranno bloccate
          per le date selezionate. I clienti vedranno un messaggio informativo e potranno prenotare
          solo per date al di fuori del periodo di chiusura.
        </p>
      </div>

      {/* Lista periodi esistenti */}
      {vacationPeriods.length > 0 && (
        <div className="space-y-3">
          {vacationPeriods.map(period => (
            <div
              key={period.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <Calendar className="text-gray-500" size={20} />
                <div>
                  <div className="font-medium text-gray-900">
                    {formatDate(period.startDate)} - {formatDate(period.endDate)}
                  </div>
                  {period.reason && (
                    <div className="text-sm text-gray-600 mt-1">{period.reason}</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(period.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Elimina periodo"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form aggiungi nuovo periodo */}
      {isAdding && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-4">
          <h4 className="font-medium text-gray-900">Nuovo Periodo di Chiusura</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inizio
              </label>
              <input
                type="date"
                value={newPeriod.startDate}
                onChange={(e) => setNewPeriod({ ...newPeriod, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fine
              </label>
              <input
                type="date"
                value={newPeriod.endDate}
                onChange={(e) => setNewPeriod({ ...newPeriod, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo (opzionale)
            </label>
            <input
              type="text"
              value={newPeriod.reason}
              onChange={(e) => setNewPeriod({ ...newPeriod, reason: e.target.value })}
              placeholder="es. Ferie estive, Chiusura natalizia..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setIsAdding(false);
                setNewPeriod({ startDate: '', endDate: '', reason: '' });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleAdd}
              disabled={!newPeriod.startDate || !newPeriod.endDate}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Aggiungi
            </button>
          </div>
        </div>
      )}

      {vacationPeriods.length === 0 && !isAdding && (
        <div className="text-center py-8 text-gray-500">
          <Plane className="mx-auto mb-2 text-gray-400" size={32} />
          <p className="text-sm">Nessun periodo di chiusura configurato</p>
        </div>
      )}
    </div>
  );
};

export default VacationSettings;
