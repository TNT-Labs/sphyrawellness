import { useState, useCallback } from 'react';
import React from 'react';
import ConfirmWithInputDialog from '../components/ConfirmWithInputDialog';

interface ConfirmWithInputOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  expectedInput: string;
  inputLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface UseConfirmWithInputReturn {
  confirm: (options: ConfirmWithInputOptions) => Promise<boolean>;
  ConfirmationDialog: React.FC;
}

export const useConfirmWithInput = (): UseConfirmWithInputReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmWithInputOptions>({
    title: '',
    message: '',
    expectedInput: '',
  });
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(
    null
  );

  const confirm = useCallback((opts: ConfirmWithInputOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);

    return new Promise((resolve) => {
      setResolveRef(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolveRef) {
      resolveRef(true);
    }
    setIsOpen(false);
  }, [resolveRef]);

  const handleCancel = useCallback(() => {
    if (resolveRef) {
      resolveRef(false);
    }
    setIsOpen(false);
  }, [resolveRef]);

  const ConfirmationDialog: React.FC = useCallback(
    () => (
      <ConfirmWithInputDialog
        isOpen={isOpen}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        expectedInput={options.expectedInput}
        inputLabel={options.inputLabel}
        variant={options.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
    [isOpen, options, handleConfirm, handleCancel]
  );

  return { confirm, ConfirmationDialog };
};
