import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  onConfirm,
  onCancel,
  variant = 'warning',
}) => {
  useEscapeKey(onCancel, isOpen);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: 'text-red-600',
          iconBg: 'bg-red-100',
          button: 'bg-red-600 hover:bg-red-700',
        };
      case 'warning':
        return {
          icon: 'text-orange-600',
          iconBg: 'bg-orange-100',
          button: 'bg-orange-600 hover:bg-orange-700',
        };
      case 'info':
        return {
          icon: 'text-blue-600',
          iconBg: 'bg-blue-100',
          button: 'bg-blue-600 hover:bg-blue-700',
        };
    }
  };

  const styles = getVariantStyles();

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

            <p className="text-sm text-gray-600 mb-6">{message}</p>

            <div className="flex gap-3 justify-end">
              <button onClick={onCancel} className="btn-secondary touch-manipulation">
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
                className={`${styles.button} text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 touch-manipulation`}
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

export default ConfirmDialog;
