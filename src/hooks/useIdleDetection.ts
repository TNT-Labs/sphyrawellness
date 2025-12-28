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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const onIdleRef = useRef(onIdle);
  const enabledRef = useRef(enabled);
  const timeoutMinutesRef = useRef(timeoutMinutes);

  // Keep refs up to date
  useEffect(() => {
    onIdleRef.current = onIdle;
    enabledRef.current = enabled;
    timeoutMinutesRef.current = timeoutMinutes;
  }, [onIdle, enabled, timeoutMinutes]);

  // Reset idle timer - stable function that doesn't change
  const resetIdle = useCallback(() => {
    setIsIdle(false);
    lastActivityRef.current = Date.now();

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Set new timeout only if enabled and timeout > 0
    if (enabledRef.current && timeoutMinutesRef.current > 0) {
      const timeoutMs = timeoutMinutesRef.current * 60 * 1000;
      timeoutRef.current = setTimeout(() => {
        setIsIdle(true);
        if (onIdleRef.current) {
          onIdleRef.current();
        }
      }, timeoutMs);
    }
  }, []); // No dependencies - stable function

  // Handle user activity - stable function that doesn't change
  const handleActivity = useCallback(() => {
    // Only reset if enough time has passed (debounce)
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    if (timeSinceLastActivity > 1000) {
      resetIdle();
    }
  }, [resetIdle]);

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
  }, [timeoutMinutes, enabled]); // Only re-run when timeout or enabled changes, not when callbacks change

  return {
    isIdle,
    resetIdle,
  };
};
