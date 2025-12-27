import React, { useState } from 'react';
import { Customer, CustomerConsents, ConsentHistoryEntry } from '../types';
import { Shield, CheckCircle2, XCircle, Edit2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ConsentManagementProps {
  customer: Customer;
  onUpdateConsents: (customerId: string, consents: Partial<CustomerConsents>) => Promise<void>;
  readOnly?: boolean;
}

const ConsentManagement: React.FC<ConsentManagementProps> = ({
  customer,
  onUpdateConsents,
  readOnly = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedConsents, setEditedConsents] = useState<Partial<CustomerConsents>>({});

  const consents = customer.consents;

  // Se il cliente non ha ancora consensi, mostriamo un messaggio compatto
  if (!consents) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center gap-2 text-gray-600">
          <Shield size={16} />
          <span className="font-medium text-sm">Consensi GDPR</span>
          <span className="text-xs text-gray-500 ml-auto">Nessun consenso registrato</span>
        </div>
      </div>
    );
  }

  const consentItems = [
    {
      key: 'privacyConsent',
      label: 'Privacy e Trattamento Dati',
      description: 'Consenso al trattamento dei dati personali (obbligatorio)',
      value: consents.privacyConsent,
      date: consents.privacyConsentDate,
      required: true,
      type: 'privacy' as const,
    },
    {
      key: 'emailReminderConsent',
      label: 'Promemoria via Email',
      description: 'Ricezione promemoria appuntamenti via email',
      value: consents.emailReminderConsent,
      date: consents.emailReminderConsentDate,
      required: false,
      type: 'emailReminder' as const,
    },
    {
      key: 'smsReminderConsent',
      label: 'Promemoria via SMS',
      description: 'Ricezione promemoria appuntamenti via SMS',
      value: consents.smsReminderConsent,
      date: consents.smsReminderConsentDate,
      required: false,
      type: 'smsReminder' as const,
    },
    {
      key: 'healthDataConsent',
      label: 'Dati Sanitari',
      description: 'Consenso al trattamento di dati sanitari (allergie, note mediche)',
      value: consents.healthDataConsent,
      date: consents.healthDataConsentDate,
      required: false,
      type: 'healthData' as const,
    },
    {
      key: 'marketingConsent',
      label: 'Marketing',
      description: 'Ricezione comunicazioni commerciali e promozionali',
      value: consents.marketingConsent || false,
      date: consents.marketingConsentDate,
      required: false,
      type: 'marketing' as const,
    },
  ];

  const handleStartEdit = () => {
    // Inizializza i consensi modificabili con i valori attuali
    setEditedConsents({
      emailReminderConsent: consents.emailReminderConsent,
      smsReminderConsent: consents.smsReminderConsent,
      healthDataConsent: consents.healthDataConsent,
      marketingConsent: consents.marketingConsent || false,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedConsents({});
  };

  const handleToggleConsent = (key: string) => {
    setEditedConsents((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const handleSaveConsents = async () => {
    setIsSubmitting(true);
    try {
      // Prepara i consensi con le date di aggiornamento
      const now = new Date().toISOString();
      const updatedConsents: Partial<CustomerConsents> = {};

      // Aggiorna solo i consensi che sono cambiati
      if (editedConsents.emailReminderConsent !== consents.emailReminderConsent) {
        updatedConsents.emailReminderConsent = editedConsents.emailReminderConsent;
        updatedConsents.emailReminderConsentDate = now;
      }

      if (editedConsents.smsReminderConsent !== consents.smsReminderConsent) {
        updatedConsents.smsReminderConsent = editedConsents.smsReminderConsent;
        updatedConsents.smsReminderConsentDate = now;
      }

      if (editedConsents.healthDataConsent !== consents.healthDataConsent) {
        updatedConsents.healthDataConsent = editedConsents.healthDataConsent;
        updatedConsents.healthDataConsentDate = now;
      }

      if (editedConsents.marketingConsent !== (consents.marketingConsent || false)) {
        updatedConsents.marketingConsent = editedConsents.marketingConsent;
        updatedConsents.marketingConsentDate = now;
      }

      // Crea la storia dei consensi
      const history: ConsentHistoryEntry[] = [];

      if (updatedConsents.emailReminderConsent !== undefined) {
        history.push({
          type: 'emailReminder',
          action: updatedConsents.emailReminderConsent ? 'granted' : 'revoked',
          timestamp: now,
        });
      }

      if (updatedConsents.smsReminderConsent !== undefined) {
        history.push({
          type: 'smsReminder',
          action: updatedConsents.smsReminderConsent ? 'granted' : 'revoked',
          timestamp: now,
        });
      }

      if (updatedConsents.healthDataConsent !== undefined) {
        history.push({
          type: 'healthData',
          action: updatedConsents.healthDataConsent ? 'granted' : 'revoked',
          timestamp: now,
        });
      }

      if (updatedConsents.marketingConsent !== undefined) {
        history.push({
          type: 'marketing',
          action: updatedConsents.marketingConsent ? 'granted' : 'revoked',
          timestamp: now,
        });
      }

      // Aggiungi la storia esistente
      if (consents.consentHistory) {
        updatedConsents.consentHistory = [...consents.consentHistory, ...history];
      } else {
        updatedConsents.consentHistory = history;
      }

      await onUpdateConsents(customer.id, updatedConsents);
      setIsEditing(false);
      setEditedConsents({});
    } catch (error) {
      console.error('Error updating consents:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Conteggio consensi attivi
  const activeConsents = consentItems.filter(item => item.value).length;
  const totalConsents = consentItems.length;

  // Versione compatta (default) - mostra solo riassunto
  if (!isEditing) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-blue-300 transition-colors">
        <div className="flex items-center gap-3">
          <Shield size={16} className="text-gray-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm text-gray-900">Consensi GDPR</span>
            <span className="text-xs text-gray-500 ml-2">
              {activeConsents}/{totalConsents} attivi
            </span>
          </div>
          {!readOnly && (
            <button
              onClick={handleStartEdit}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded transition-colors flex-shrink-0"
              title="Modifica consensi"
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Versione espansa (quando si modifica)
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-blue-900">
          <Shield size={18} />
          <span className="font-semibold text-sm">Modifica Consensi GDPR</span>
        </div>
        <button
          onClick={handleCancelEdit}
          className="text-gray-600 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition-colors"
          title="Chiudi"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-2">
        {consentItems.map((item) => {
          const currentValue = isEditing && !item.required
            ? editedConsents[item.key as keyof typeof editedConsents]
            : item.value;

          return (
            <div
              key={item.key}
              className={`flex items-start gap-2 p-2 rounded-md ${
                isEditing && !item.required
                  ? 'bg-white cursor-pointer hover:bg-blue-50'
                  : 'bg-white/50'
              }`}
              onClick={() => {
                if (isEditing && !item.required) {
                  handleToggleConsent(item.key);
                }
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {currentValue ? (
                  <CheckCircle2 size={16} className="text-green-600" />
                ) : (
                  <XCircle size={16} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-900">{item.label}</p>
                  {item.required && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                      Obbligatorio
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-600">{item.description}</p>
                {item.date && (
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {currentValue ? 'Concesso' : 'Revocato'} il{' '}
                    {format(new Date(item.date), 'dd MMM yyyy', { locale: it })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-blue-200">
        <button
          onClick={handleSaveConsents}
          disabled={isSubmitting}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}
        </button>
        <button
          onClick={handleCancelEdit}
          disabled={isSubmitting}
          className="flex-1 px-3 py-2 bg-white text-gray-700 rounded-md hover:bg-gray-100 transition-colors text-sm font-semibold border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Annulla
        </button>
      </div>

      {consents.privacyConsentVersion && (
        <div className="mt-2 pt-2 border-t border-blue-200">
          <p className="text-[10px] text-gray-500">
            Privacy Policy v{consents.privacyConsentVersion}
          </p>
        </div>
      )}
    </div>
  );
};

export default ConsentManagement;
