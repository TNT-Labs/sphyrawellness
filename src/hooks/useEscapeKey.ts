import { useEffect } from 'react';

/**
 * Hook to handle Escape key press
 * @param onEscape Callback to execute when Escape is pressed
 * @param isActive Whether the hook should be active (default: true)
 */
export const useEscapeKey = (onEscape: () => void, isActive = true): void => {
  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onEscape, isActive]);
};
