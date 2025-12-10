import { logger } from './logger';

/**
 * Error types for user-friendly error handling
 */
/* eslint-disable no-unused-vars */
export enum ErrorType {
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_CORRUPTED = 'STORAGE_CORRUPTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNKNOWN = 'UNKNOWN',
}
/* eslint-enable no-unused-vars */

/**
 * User-friendly error messages in Italian
 */
export const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.STORAGE_QUOTA_EXCEEDED]:
    'Spazio di archiviazione esaurito. Elimina alcuni dati vecchi o esporta i dati prima di continuare.',
  [ErrorType.STORAGE_CORRUPTED]:
    'I dati salvati sono corrotti. Prova a ripristinare da un backup recente.',
  [ErrorType.NETWORK_ERROR]:
    'Problema di connessione. Verifica la tua connessione internet e riprova.',
  [ErrorType.VALIDATION_ERROR]:
    'I dati inseriti non sono validi. Controlla i campi e riprova.',
  [ErrorType.NOT_FOUND]:
    'Elemento non trovato. Potrebbe essere stato eliminato.',
  [ErrorType.PERMISSION_DENIED]:
    'Non hai i permessi per eseguire questa operazione.',
  [ErrorType.UNKNOWN]:
    'Si è verificato un errore imprevisto. Riprova o contatta il supporto.',
};

/**
 * Classify error type based on error instance
 */
export function classifyError(error: unknown): ErrorType {
  if (error instanceof Error) {
    // Storage quota exceeded
    if (error.name === 'QuotaExceededError') {
      return ErrorType.STORAGE_QUOTA_EXCEEDED;
    }

    // JSON parsing errors (corrupted data)
    if (error instanceof SyntaxError) {
      return ErrorType.STORAGE_CORRUPTED;
    }

    // Network errors
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return ErrorType.NETWORK_ERROR;
    }

    // Validation errors
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return ErrorType.VALIDATION_ERROR;
    }

    // Not found errors
    if (error.message.includes('not found')) {
      return ErrorType.NOT_FOUND;
    }

    // Permission errors
    if (error.message.includes('permission') || error.message.includes('denied')) {
      return ErrorType.PERMISSION_DENIED;
    }
  }

  return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown, context?: string): string {
  const errorType = classifyError(error);
  let message = ERROR_MESSAGES[errorType];

  if (context) {
    message = `${context}: ${message}`;
  }

  // Log technical error for debugging
  logger.error('Error occurred:', {
    type: errorType,
    context,
    error,
  });

  return message;
}

/**
 * Handle error with user-friendly message and optional callback
 */
export function handleError(
  error: unknown,
  options: {
    context?: string;
    showToast?: (message: string) => void;
    fallback?: () => void;
  } = {}
): void {
  const { context, showToast, fallback } = options;

  const userMessage = getUserFriendlyMessage(error, context);

  if (showToast) {
    showToast(userMessage);
  }

  if (fallback) {
    try {
      fallback();
    } catch (fallbackError) {
      logger.error('Fallback also failed:', fallbackError);
    }
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, onRetry } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

        if (onRetry) {
          onRetry(attempt + 1, error);
        }

        logger.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Validate data structure before saving
 */
export function validateDataStructure<T>(
  data: unknown,
  validator: (data: unknown) => data is T
): T {
  if (!validator(data)) {
    throw new Error('Invalid data structure');
  }
  return data;
}

/**
 * Safe JSON parse with validation
 */
export function safeJsonParse<T>(
  json: string,
  validator?: (data: unknown) => data is T
): T | null {
  try {
    const parsed = JSON.parse(json);

    if (validator && !validator(parsed)) {
      logger.warn('Parsed data failed validation');
      return null;
    }

    return parsed;
  } catch (error) {
    logger.error('JSON parse failed:', error);
    return null;
  }
}

/**
 * Get available storage space estimate
 */
export async function getStorageEstimate(): Promise<{
  available: number;
  used: number;
  quota: number;
  percentage: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const used = estimate.usage || 0;
      const available = quota - used;
      const percentage = quota > 0 ? (used / quota) * 100 : 0;

      return { available, used, quota, percentage };
    } catch (error) {
      logger.error('Failed to estimate storage:', error);
    }
  }

  // Fallback for browsers that don't support storage estimation
  return {
    available: 0,
    used: 0,
    quota: 0,
    percentage: 0,
  };
}

/**
 * Check if there's enough storage space for an operation
 */
export async function hasEnoughStorage(requiredBytes: number): Promise<boolean> {
  const { available } = await getStorageEstimate();

  // If we can't estimate, assume we have enough
  if (available === 0) {
    return true;
  }

  // Add 10% buffer
  const requiredWithBuffer = requiredBytes * 1.1;
  return available >= requiredWithBuffer;
}
