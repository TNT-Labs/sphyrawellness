import { useEffect, useRef } from 'react';

/**
 * Hook per implementare focus trap nei modal
 * Mantiene il focus all'interno del modal quando è aperto
 *
 * @param isActive - Indica se il focus trap è attivo
 */
export function useFocusTrap(isActive: boolean) {
  const elementRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Salva l'elemento attivo corrente
    previousActiveElement.current = document.activeElement as HTMLElement;

    const element = elementRef.current;
    if (!element) return;

    // Trova tutti gli elementi focusabili
    const getFocusableElements = (): HTMLElement[] => {
      const selector = [
        'a[href]',
        'area[href]',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'button:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');

      return Array.from(element.querySelectorAll<HTMLElement>(selector));
    };

    // Focus sul primo elemento focusabile
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Gestisce il tab per mantenere il focus all'interno
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      element.removeEventListener('keydown', handleKeyDown);

      // Ripristina il focus all'elemento precedente
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive]);

  return elementRef;
}
