import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface ConfirmWithInputDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  expectedInput: string;
  inputLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmWithInputDialog: React.FC<ConfirmWithInputDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  expectedInput,
  inputLabel,
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  useEscapeKey(onCancel, isOpen);

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: 'text-red-600',
          iconBg: 'bg-red-100',
          button: 'bg-red-600 hover:bg-red-700 disabled:bg-red-300',
        };
      case 'warning':
        return {
          icon: 'text-orange-600',
          iconBg: 'bg-orange-100',
          button: 'bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300',
        };
      case 'info':
        return {
          icon: 'text-blue-600',
          iconBg: 'bg-blue-100',
          button: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300',
        };
    }
  };

  const styles = getVariantStyles();
  const isInputValid = inputValue === expectedInput;

  const handleConfirmClick = () => {
    if (!isInputValid) {
      setError('Il testo inserito non corrisponde');
      return;
    }
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`${styles.iconBg} p-3 rounded-full flex-shrink-0`}>
            <AlertTriangle className={styles.icon} size={24} />
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3
                id="confirm-dialog-title"
                className="text-lg font-semibold text-gray-900"
              >
                {title}
              </h3>
              <button
                onClick={onCancel}
                className="p-1 rounded hover:bg-gray-100 transition-colors touch-manipulation"
                aria-label="Chiudi"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">{message}</p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {inputLabel || `Digita "${expectedInput}" per confermare`}
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setError('');
                }}
                className={`input w-full ${error ? 'border-red-500' : ''}`}
                placeholder={expectedInput}
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={onCancel} className="btn-secondary touch-manipulation">
                {cancelText}
              </button>
              <button
                onClick={handleConfirmClick}
                disabled={!isInputValid}
                className={`${styles.button} text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed touch-manipulation`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmWithInputDialog;
