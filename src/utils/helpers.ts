/**
 * Generate a secure unique ID using crypto.randomUUID() if available,
 * fallback to timestamp-based ID with random suffix
 */
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

/**
 * Validate and parse time string in HH:mm format
 * @param timeString Time in format HH:mm
 * @returns Object with hours and minutes, or null if invalid
 */
export const parseTimeString = (timeString: string): { hours: number; minutes: number } | null => {
  if (!timeString || typeof timeString !== 'string') {
    return null;
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  const match = timeString.match(timeRegex);

  if (!match) {
    return null;
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  return { hours, minutes };
};

/**
 * Calculate end time given start time and duration in minutes
 * @param startTime Time in format HH:mm
 * @param duration Duration in minutes
 * @returns End time in format HH:mm, or null if invalid
 */
export const calculateEndTime = (startTime: string, duration: number): string | null => {
  const parsed = parseTimeString(startTime);

  if (!parsed || !duration || duration <= 0) {
    return null;
  }

  const totalMinutes = parsed.hours * 60 + parsed.minutes + duration;
  const endHours = Math.floor(totalMinutes / 60) % 24; // Handle overflow past midnight
  const endMinutes = totalMinutes % 60;

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Italian format)
 */
export const isValidPhone = (phone: string): boolean => {
  // Accepts formats: +39 333 1234567, 333 1234567, 3331234567, +393331234567
  const phoneRegex = /^(\+39)?[\s]?[0-9]{3}[\s]?[0-9]{6,7}$/;
  return phoneRegex.test(phone.trim());
};

/**
 * Format phone number to standard format
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.startsWith('+39')) {
    const number = cleaned.substring(3);
    return `+39 ${number.substring(0, 3)} ${number.substring(3)}`;
  }
  if (cleaned.length >= 10) {
    return `+39 ${cleaned.substring(0, 3)} ${cleaned.substring(3)}`;
  }
  return phone;
};

/**
 * Validate and sanitize monetary amount
 * @param value Input value (string or number)
 * @param options Validation options
 * @returns Valid number or 0 if invalid
 */
export const validateAmount = (
  value: string | number,
  options: {
    min?: number;
    max?: number;
    allowZero?: boolean;
  } = {}
): number => {
  const { min = 0, max = 999999.99, allowZero = true } = options;

  // Convert to number
  let amount: number;
  if (typeof value === 'string') {
    // Remove any non-numeric characters except dot and minus
    const cleaned = value.replace(/[^0-9.-]/g, '');
    amount = parseFloat(cleaned);
  } else {
    amount = value;
  }

  // Check if valid number
  if (isNaN(amount) || !isFinite(amount)) {
    return 0;
  }

  // Apply min constraint
  if (amount < min) {
    return min;
  }

  // Apply max constraint
  if (amount > max) {
    return max;
  }

  // Check zero constraint
  if (!allowZero && amount === 0) {
    return min > 0 ? min : 0.01;
  }

  // Round to 2 decimal places
  return Math.round(amount * 100) / 100;
};

/**
 * Format amount as currency string
 * @param amount Numeric amount
 * @param options Formatting options
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  options: {
    currency?: string;
    locale?: string;
    showSymbol?: boolean;
  } = {}
): string => {
  const { currency = 'EUR', locale = 'it-IT', showSymbol = true } = options;

  if (showSymbol) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Validate and sanitize duration in minutes
 * @param value Input value (string or number)
 * @param options Validation options
 * @returns Valid duration in minutes or minimum value
 */
export const validateDuration = (
  value: string | number,
  options: {
    min?: number;
    max?: number;
    step?: number;
  } = {}
): number => {
  const { min = 15, max = 480, step = 15 } = options;

  // Convert to number
  let duration: number;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9]/g, '');
    duration = parseInt(cleaned, 10);
  } else {
    duration = Math.round(value);
  }

  // Check if valid number
  if (isNaN(duration) || !isFinite(duration) || duration < min) {
    return min;
  }

  // Apply max constraint
  if (duration > max) {
    return max;
  }

  // Round to nearest step
  return Math.round(duration / step) * step;
};
