import React, { useState } from 'react';
import { Clock, X, Check } from 'lucide-react';
import type { BusinessHours, DayOfWeek, DaySchedule } from '../types';

interface BusinessHoursSettingsProps {
  businessHours: BusinessHours;
  onChange: (businessHours: BusinessHours) => void;
}

const DAYS_IT: Record<DayOfWeek, string> = {
  monday: 'Lunedì',
  tuesday: 'Martedì',
  wednesday: 'Mercoledì',
  thursday: 'Giovedì',
  friday: 'Venerdì',
  saturday: 'Sabato',
  sunday: 'Domenica',
};

const DAYS_ORDER: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const BusinessHoursSettings: React.FC<BusinessHoursSettingsProps> = ({ businessHours, onChange }) => {
  const [expanded, setExpanded] = useState<DayOfWeek | null>(null);

  const updateDay = (day: DayOfWeek, updates: Partial<DaySchedule>) => {
    onChange({
      ...businessHours,
      [day]: {
        ...businessHours[day],
        ...updates,
      },
    });
  };

  const copyToAll = (day: DayOfWeek) => {
    const schedule = businessHours[day];
    const newHours = { ...businessHours };
    DAYS_ORDER.forEach((d) => {
      newHours[d] = { ...schedule };
    });
    onChange(newHours);
    setExpanded(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="text-primary-600" size={20} />
        <h3 className="text-lg font-semibold text-gray-900">Orari di Apertura</h3>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {DAYS_ORDER.map((day) => {
            const schedule = businessHours[day];
            const isExpanded = expanded === day;

            return (
              <div key={day} className="hover:bg-gray-50 transition-colors">
                {/* Row principale */}
                <div className="p-4">
                  <div className="flex items-center gap-2 sm:gap-4">
                    {/* Checkbox Aperto/Chiuso */}
                    <div className="flex items-center min-w-0 sm:min-w-[120px] flex-shrink-0">
                      <input
                        type="checkbox"
                        id={`${day}-enabled`}
                        checked={schedule.enabled}
                        onChange={(e) => updateDay(day, { enabled: e.target.checked })}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <label htmlFor={`${day}-enabled`} className="ml-2 font-medium text-gray-900 text-sm sm:text-base">
                        {DAYS_IT[day]}
                      </label>
                    </div>

                    {/* Mostra orari o "Chiuso" */}
                    <div className="flex-1 min-w-0">
                      {schedule.enabled ? (
                        <div className="text-xs sm:text-sm text-gray-600">
                          {schedule.type === 'continuous' ? (
                            <span className="whitespace-nowrap">
                              {schedule.morning.start} - {schedule.morning.end}
                            </span>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                              <span className="whitespace-nowrap">{schedule.morning.start}-{schedule.morning.end}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="whitespace-nowrap">{schedule.afternoon?.start}-{schedule.afternoon?.end}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs sm:text-sm text-gray-400">Chiuso</span>
                      )}
                    </div>

                    {/* Bottone Modifica */}
                    {schedule.enabled && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : day)}
                        className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      >
                        {isExpanded ? 'Chiudi' : 'Modifica'}
                      </button>
                    )}
                  </div>

                  {/* Panel espanso per configurazione */}
                  {isExpanded && schedule.enabled && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                      {/* Tipo orario */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Orario</label>
                        <div className="flex gap-3">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`${day}-type`}
                              checked={schedule.type === 'continuous'}
                              onChange={() => updateDay(day, { type: 'continuous', afternoon: undefined })}
                              className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Orario Continuato</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`${day}-type`}
                              checked={schedule.type === 'split'}
                              onChange={() =>
                                updateDay(day, {
                                  type: 'split',
                                  afternoon: { start: '15:00', end: '19:00' },
                                })
                              }
                              className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Mattina / Pomeriggio</span>
                          </label>
                        </div>
                      </div>

                      {/* Orari Mattina */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {schedule.type === 'continuous' ? 'Orario' : 'Mattina'}
                        </label>
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                          <input
                            type="time"
                            value={schedule.morning.start}
                            onChange={(e) =>
                              updateDay(day, {
                                morning: { ...schedule.morning, start: e.target.value },
                              })
                            }
                            className="input flex-1 min-w-[120px]"
                          />
                          <span className="text-gray-500 flex-shrink-0">-</span>
                          <input
                            type="time"
                            value={schedule.morning.end}
                            onChange={(e) =>
                              updateDay(day, {
                                morning: { ...schedule.morning, end: e.target.value },
                              })
                            }
                            className="input flex-1 min-w-[120px]"
                          />
                        </div>
                      </div>

                      {/* Orari Pomeriggio (solo se split) */}
                      {schedule.type === 'split' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Pomeriggio</label>
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                            <input
                              type="time"
                              value={schedule.afternoon?.start || '15:00'}
                              onChange={(e) =>
                                updateDay(day, {
                                  afternoon: {
                                    start: e.target.value,
                                    end: schedule.afternoon?.end || '19:00',
                                  },
                                })
                              }
                              className="input flex-1 min-w-[120px]"
                            />
                            <span className="text-gray-500 flex-shrink-0">-</span>
                            <input
                              type="time"
                              value={schedule.afternoon?.end || '19:00'}
                              onChange={(e) =>
                                updateDay(day, {
                                  afternoon: {
                                    start: schedule.afternoon?.start || '15:00',
                                    end: e.target.value,
                                  },
                                })
                              }
                              className="input flex-1 min-w-[120px]"
                            />
                          </div>
                        </div>
                      )}

                      {/* Azioni */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <button
                          onClick={() => copyToAll(day)}
                          className="px-3 py-2 text-xs sm:text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors flex items-center gap-1.5 justify-center min-h-[44px] touch-manipulation"
                        >
                          <Check size={16} className="flex-shrink-0" />
                          <span>Applica a Tutti i Giorni</span>
                        </button>
                        <button
                          onClick={() => setExpanded(null)}
                          className="px-3 py-2 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors flex items-center gap-1.5 justify-center min-h-[44px] touch-manipulation"
                        >
                          <X size={16} className="flex-shrink-0" />
                          <span>Chiudi</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Gli orari configurati qui determineranno gli slot disponibili per le prenotazioni
          pubbliche. I clienti potranno prenotare solo negli orari in cui l'attività è aperta.
        </p>
      </div>
    </div>
  );
};

export default BusinessHoursSettings;
