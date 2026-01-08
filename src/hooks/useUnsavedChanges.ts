import { useCallback } from 'react';
import { useBeforeUnload } from 'react-router-dom';

/**
 * Hook to prevent navigation when there are unsaved changes
 * Shows a confirmation dialog before leaving the page (browser tab close/refresh)
 *
 * Note: This hook only prevents browser navigation (closing tab, refreshing, navigating away from domain).
 * For in-app navigation (React Router), implement custom logic in components.
 *
 * @param hasUnsavedChanges - Boolean indicating if there are unsaved changes
 * @param message - Optional custom message to show in the confirmation dialog
 *
 * @example
 * const [formData, setFormData] = useState(initialData);
 * const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
 * useUnsavedChanges(hasChanges);
 */
export function useUnsavedChanges(
  hasUnsavedChanges: boolean,
  message: string = 'Ci sono modifiche non salvate. Sei sicuro di voler uscire?'
) {
  // Prevent browser tab/window close or refresh
  useBeforeUnload(
    useCallback(
      (event) => {
        if (hasUnsavedChanges) {
          event.preventDefault();
          // Modern browsers ignore custom messages and show their own
          return (event.returnValue = message);
        }
      },
      [hasUnsavedChanges, message]
    ),
    { capture: true }
  );
}

/**
 * Hook to track if form data has been modified
 * Compares current form state with initial state
 *
 * @param currentData - Current form data object
 * @param initialData - Initial form data object (reference to compare against)
 * @returns Boolean indicating if data has been modified
 *
 * @example
 * const [formData, setFormData] = useState(initialFormData);
 * const initialDataRef = useRef(initialFormData);
 * const hasChanges = useFormModified(formData, initialDataRef.current);
 * useUnsavedChanges(hasChanges);
 */
export function useFormModified<T extends Record<string, any>>(
  currentData: T,
  initialData: T
): boolean {
  // Deep comparison of form data
  const currentJson = JSON.stringify(currentData);
  const initialJson = JSON.stringify(initialData);

  return currentJson !== initialJson;
}

/**
 * Combined hook for form with unsaved changes protection
 * Automatically tracks changes and shows warnings
 *
 * @param formData - Current form data
 * @param initialData - Initial form data
 * @param isSubmitting - Optional flag to disable warning during form submission
 *
 * @example
 * const [formData, setFormData] = useState(initialData);
 * const [isSubmitting, setIsSubmitting] = useState(false);
 *
 * useFormUnsavedChanges(formData, initialData, isSubmitting);
 *
 * const handleSubmit = async () => {
 *   setIsSubmitting(true);
 *   // ... submit logic
 *   setIsSubmitting(false);
 * };
 */
export function useFormUnsavedChanges<T extends Record<string, any>>(
  formData: T,
  initialData: T,
  isSubmitting: boolean = false
) {
  const hasChanges = useFormModified(formData, initialData);

  // Don't show warning if currently submitting
  useUnsavedChanges(hasChanges && !isSubmitting);
}
