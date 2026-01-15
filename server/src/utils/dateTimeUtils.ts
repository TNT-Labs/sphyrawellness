/**
 * Date and Time Utilities
 *
 * Standardized timezone handling for the application.
 * All dates are stored in UTC in the database, converted to local only for display.
 *
 * IMPORTANT: Always use these utilities instead of raw Date() constructors
 * to ensure consistent timezone handling across the application.
 */

/**
 * Parse a date string (YYYY-MM-DD) to UTC Date at noon
 * Use this for appointment dates to avoid timezone issues
 *
 * @param dateString - Date in format "YYYY-MM-DD"
 * @returns Date object representing noon UTC on that date
 *
 * @example
 * const appointmentDate = parseDateToUTC('2024-03-15'); // 2024-03-15T12:00:00.000Z
 */
export function parseDateToUTC(dateString: string): Date {
  // Set to noon UTC to avoid DST issues and ensure consistent behavior
  return new Date(`${dateString}T12:00:00.000Z`);
}

/**
 * Parse a time string (HH:mm) to a Date object with base date 1970-01-01 UTC
 * Use this for appointment start/end times
 *
 * @param timeString - Time in format "HH:mm" (24-hour)
 * @returns Date object with time set, base date 1970-01-01
 *
 * @example
 * const startTime = parseTimeToUTC('14:30'); // 1970-01-01T14:30:00.000Z
 */
export function parseTimeToUTC(timeString: string): Date {
  // Use epoch date (1970-01-01) as base for time-only values
  return new Date(`1970-01-01T${timeString}:00.000Z`);
}

/**
 * Combine a date and time into a single UTC DateTime
 * Use this when you need a full timestamp (e.g., for reminders)
 *
 * @param dateString - Date in format "YYYY-MM-DD"
 * @param timeString - Time in format "HH:mm"
 * @returns Combined DateTime in UTC
 *
 * @example
 * const appointmentDateTime = combineDateTimeUTC('2024-03-15', '14:30');
 * // 2024-03-15T14:30:00.000Z
 */
export function combineDateTimeUTC(dateString: string, timeString: string): Date {
  return new Date(`${dateString}T${timeString}:00.000Z`);
}

/**
 * Format a Date object to date string (YYYY-MM-DD)
 *
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * const dateStr = formatDateToString(new Date()); // "2024-03-15"
 */
export function formatDateToString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a Date object to time string (HH:mm)
 * Extracts time from a Date object in UTC
 *
 * @param date - Date object with time
 * @returns Time string in HH:mm format
 *
 * @example
 * const timeStr = formatTimeToString(new Date()); // "14:30"
 */
export function formatTimeToString(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get current date at noon UTC (for today's appointments)
 *
 * @returns Date object representing today at noon UTC
 *
 * @example
 * const today = getTodayAtNoonUTC(); // 2024-03-15T12:00:00.000Z
 */
export function getTodayAtNoonUTC(): Date {
  const now = new Date();
  const dateString = formatDateToString(now);
  return parseDateToUTC(dateString);
}

/**
 * Check if two Date objects represent the same calendar date (ignoring time)
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if same calendar date
 *
 * @example
 * const same = isSameDate(
 *   new Date('2024-03-15T10:00:00Z'),
 *   new Date('2024-03-15T14:00:00Z')
 * ); // true
 */
export function isSameDate(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Add days to a date
 *
 * @param date - Base date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 *
 * @example
 * const tomorrow = addDays(new Date(), 1);
 * const yesterday = addDays(new Date(), -1);
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Add hours to a date
 *
 * @param date - Base date
 * @param hours - Number of hours to add (can be negative)
 * @returns New date with hours added
 *
 * @example
 * const inTwoHours = addHours(new Date(), 2);
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setUTCHours(result.getUTCHours() + hours);
  return result;
}

/**
 * Get date range for queries (start and end of day in UTC)
 *
 * @param dateString - Date in format "YYYY-MM-DD"
 * @returns Object with start (00:00:00 UTC) and end (23:59:59 UTC)
 *
 * @example
 * const { start, end } = getDateRange('2024-03-15');
 * // start: 2024-03-15T00:00:00.000Z
 * // end: 2024-03-15T23:59:59.999Z
 */
export function getDateRange(dateString: string): { start: Date; end: Date } {
  const start = new Date(`${dateString}T00:00:00.000Z`);
  const end = new Date(`${dateString}T23:59:59.999Z`);
  return { start, end };
}

/**
 * Calculate duration between two times in minutes
 *
 * @param startTime - Start time Date object
 * @param endTime - End time Date object
 * @returns Duration in minutes
 *
 * @example
 * const start = parseTimeToUTC('14:00');
 * const end = parseTimeToUTC('15:30');
 * const duration = getDurationMinutes(start, end); // 90
 */
export function getDurationMinutes(startTime: Date, endTime: Date): number {
  const diffMs = endTime.getTime() - startTime.getTime();
  return Math.round(diffMs / (1000 * 60));
}

/**
 * Convert legacy Date objects to consistent UTC format
 * Use this for migration/compatibility with old code
 *
 * @param value - Can be Date, string, or already processed
 * @param type - 'date' for dates, 'time' for times
 * @returns Standardized Date object in UTC
 */
export function normalizeDateTimeValue(
  value: Date | string | unknown,
  type: 'date' | 'time'
): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    if (type === 'date') {
      return parseDateToUTC(value);
    } else {
      return parseTimeToUTC(value);
    }
  }

  throw new Error(`Invalid ${type} value: ${value}`);
}

/**
 * TIMEZONE CONVERSION NOTES:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Backend (this file):
 * - ALL dates/times stored in UTC
 * - Database columns are `@db.Date` and `@db.Time` with UTC values
 * - Never do timezone conversion on backend
 *
 * Frontend:
 * - Convert UTC to local timezone only for DISPLAY
 * - Use browser's Intl.DateTimeFormat or date-fns-tz
 * - When sending to backend, convert local back to UTC
 *
 * Example frontend code:
 * ```typescript
 * // Display UTC date in user's timezone
 * const utcDate = new Date(appointment.date); // From backend (UTC)
 * const localDate = utcDate.toLocaleDateString('it-IT', {
 *   timeZone: 'Europe/Rome',
 *   year: 'numeric',
 *   month: '2-digit',
 *   day: '2-digit'
 * });
 *
 * // Convert user input back to UTC for backend
 * const userInput = '2024-03-15 14:30'; // User's local time
 * const localDate = new Date(userInput); // Browser interprets as local
 * const utcDate = new Date(localDate.toISOString()); // Convert to UTC
 * ```
 *
 * Migration Strategy:
 * 1. Use these utilities for all NEW code
 * 2. Gradually refactor existing code file-by-file
 * 3. Test thoroughly after each refactor
 * 4. Document any timezone assumptions in comments
 *
 * Common Pitfalls to Avoid:
 * ❌ new Date(dateString) without explicit UTC - Browser uses local timezone!
 * ❌ date.getHours() instead of date.getUTCHours() - Gives local time!
 * ❌ Mixing local and UTC dates in comparisons - Results are unpredictable!
 * ✅ Always use parseDate ToUTC(), parseTimeToUTC() from this file
 * ✅ Always use getUTC*() methods when reading Date properties
 * ✅ Always store in UTC, convert to local only for display
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
