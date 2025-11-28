import { useState, useEffect, useCallback, useRef } from 'react';

interface UseIdleDetectionOptions {
  timeoutMinutes: number; // Timeout in minutes
  onIdle?: () => void; // Callback when user becomes idle
  enabled?: boolean; // Whether idle detection is enabled
}

/**
 * Hook to detect user inactivity
 * @param options Configuration options
 * @returns Object with isIdle state and resetIdle function
 */
export const useIdleDetection = ({
  timeoutMinutes,
  onIdle,
  enabled = true,
}: UseIdleDetectionOptions) => {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Reset idle timer
  const resetIdle = useCallback(() => {
    setIsIdle(false);
    lastActivityRef.current = Date.now();

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout only if enabled and timeout > 0
    if (enabled && timeoutMinutes > 0) {
      const timeoutMs = timeoutMinutes * 60 * 1000;
      timeoutRef.current = setTimeout(() => {
        setIsIdle(true);
        if (onIdle) {
          onIdle();
        }
      }, timeoutMs);
    }
  }, [timeoutMinutes, onIdle, enabled]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    // Only reset if currently idle or if enough time has passed (debounce)
    const now = Date.now();
    if (isIdle || now - lastActivityRef.current > 1000) {
      resetIdle();
    }
  }, [isIdle, resetIdle]);

  useEffect(() => {
    // If not enabled or timeout is 0, don't set up listeners
    if (!enabled || timeoutMinutes === 0) {
      setIsIdle(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start idle timer
    resetIdle();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [timeoutMinutes, enabled, handleActivity, resetIdle]);

  return {
    isIdle,
    resetIdle,
  };
};
