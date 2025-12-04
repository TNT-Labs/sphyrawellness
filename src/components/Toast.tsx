import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 5000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <XCircle size={20} />;
      case 'warning':
        return <AlertCircle size={20} />;
      case 'info':
        return <Info size={20} />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-orange-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${getStyles()} animate-slide-in`}
      role="alert"
    >
      {getIcon()}
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="p-1 rounded hover:bg-white/20 transition-colors touch-manipulation"
        aria-label="Chiudi notifica"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
