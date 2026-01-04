/**
 * Retry Utility - Exponential backoff for failed operations
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
};

/**
 * Sleep utility
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  let currentDelay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      console.log(`[Retry] Attempt ${attempt}/${opts.maxAttempts}`);
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry this error
      if (!opts.shouldRetry(error)) {
        console.log(`[Retry] Error not retryable, throwing immediately`);
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt >= opts.maxAttempts) {
        console.log(`[Retry] Max attempts reached, throwing error`);
        throw error;
      }

      // Log and wait before retry
      console.log(
        `[Retry] Attempt ${attempt} failed: ${error.message}. Retrying in ${currentDelay}ms...`
      );

      await sleep(currentDelay);

      // Calculate next delay with exponential backoff
      currentDelay = Math.min(
        currentDelay * opts.backoffMultiplier,
        opts.maxDelayMs
      );
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError;
}

/**
 * Check if error is network-related and should be retried
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  // Check error message
  const message = error.message?.toLowerCase() || '';
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('econnrefused') ||
    message.includes('etimedout')
  ) {
    return true;
  }

  // Check error code
  const code = error.code?.toLowerCase() || '';
  if (
    code === 'econnrefused' ||
    code === 'etimedout' ||
    code === 'enotfound' ||
    code === 'econnreset'
  ) {
    return true;
  }

  // Check HTTP status codes that should be retried
  const status = error.response?.status;
  if (status === 408 || status === 429 || status === 500 || status >= 502) {
    return true;
  }

  return false;
}

/**
 * Retry options for network operations
 */
export const NETWORK_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 4,
  initialDelayMs: 2000,
  maxDelayMs: 16000,
  backoffMultiplier: 2,
  shouldRetry: isNetworkError,
};

/**
 * Retry options for critical operations (more attempts)
 */
export const CRITICAL_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 32000,
  backoffMultiplier: 2,
  shouldRetry: isNetworkError,
};
