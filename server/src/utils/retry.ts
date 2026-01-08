import logger from './logger.js';

export interface RetryOptions {
  /**
   * Maximum number of retry attempts (excluding the initial attempt)
   * Default: 3
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds before the first retry
   * Default: 1000ms (1 second)
   */
  initialDelayMs?: number;

  /**
   * Multiplier for exponential backoff
   * Each retry delay = previous delay * backoffMultiplier
   * Default: 2
   */
  backoffMultiplier?: number;

  /**
   * Maximum delay in milliseconds between retries
   * Prevents delays from growing too large
   * Default: 30000ms (30 seconds)
   */
  maxDelayMs?: number;

  /**
   * Function to determine if an error is retryable
   * If not provided, all errors are considered retryable
   */
  isRetryableError?: (error: any) => boolean;

  /**
   * Callback function called before each retry attempt
   * Useful for logging or custom logic
   */
  onRetry?: (error: any, attempt: number, delay: number) => void;
}

/**
 * Execute a function with exponential backoff retry logic
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 * @throws The last error if all retries are exhausted
 *
 * @example
 * const result = await withRetry(
 *   () => sendEmail(recipient, message),
 *   {
 *     maxRetries: 3,
 *     initialDelayMs: 1000,
 *     backoffMultiplier: 2,
 *     isRetryableError: (err) => err.statusCode >= 500
 *   }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    backoffMultiplier = 2,
    maxDelayMs = 30000,
    isRetryableError = () => true,
    onRetry
  } = options;

  let lastError: any;
  let currentDelay = initialDelayMs;

  // Initial attempt (not counted as a retry)
  try {
    return await fn();
  } catch (error) {
    lastError = error;

    // Check if error is retryable
    if (!isRetryableError(error)) {
      throw error;
    }
  }

  // Retry attempts
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Wait before retrying
    await sleep(currentDelay);

    // Call onRetry callback if provided
    if (onRetry) {
      onRetry(lastError, attempt, currentDelay);
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Calculate next delay with exponential backoff
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
    }
  }

  // All retries exhausted, throw the last error
  throw lastError;
}

/**
 * Sleep for the specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Common retry configurations for different scenarios
 */
export const RetryPresets = {
  /**
   * Fast retry for transient network errors
   * 3 retries with 500ms initial delay, 2x backoff
   */
  fastNetwork: {
    maxRetries: 3,
    initialDelayMs: 500,
    backoffMultiplier: 2,
    maxDelayMs: 5000
  } as RetryOptions,

  /**
   * Standard retry for API calls
   * 3 retries with 1s initial delay, 2x backoff
   */
  standardAPI: {
    maxRetries: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 10000
  } as RetryOptions,

  /**
   * Conservative retry for rate-limited services
   * 4 retries with 2s initial delay, 3x backoff
   */
  rateLimited: {
    maxRetries: 4,
    initialDelayMs: 2000,
    backoffMultiplier: 3,
    maxDelayMs: 30000
  } as RetryOptions,

  /**
   * Aggressive retry for critical operations
   * 5 retries with 500ms initial delay, 1.5x backoff
   */
  critical: {
    maxRetries: 5,
    initialDelayMs: 500,
    backoffMultiplier: 1.5,
    maxDelayMs: 15000
  } as RetryOptions
};

/**
 * Check if an HTTP error is retryable (5xx server errors or network errors)
 */
export function isRetryableHTTPError(error: any): boolean {
  // Network errors (ECONNRESET, ETIMEDOUT, etc.)
  if (error.code) {
    const retryableCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENETUNREACH',
      'EHOSTUNREACH',
      'ENOTFOUND',
      'EAI_AGAIN'
    ];
    if (retryableCodes.includes(error.code)) {
      return true;
    }
  }

  // HTTP 5xx errors (server errors)
  if (error.response && error.response.status) {
    const status = error.response.status;
    return status >= 500 && status < 600;
  }

  // HTTP 429 (Too Many Requests - rate limiting)
  if (error.response && error.response.status === 429) {
    return true;
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Check if a SendGrid error is retryable
 */
export function isRetryableSendGridError(error: any): boolean {
  // Check HTTP status codes
  if (error.code >= 500) {
    return true;
  }

  // SendGrid rate limiting
  if (error.code === 429) {
    return true;
  }

  // Network errors
  return isRetryableHTTPError(error);
}

/**
 * Check if an SMS gateway error is retryable
 */
export function isRetryableSMSError(error: any): boolean {
  // Use generic HTTP error checking
  return isRetryableHTTPError(error);
}
