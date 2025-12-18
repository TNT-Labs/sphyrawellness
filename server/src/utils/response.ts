import { Response } from 'express';

/**
 * Standard API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Custom API Error class with additional properties
 */
export class ApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

/**
 * Sends a successful API response
 *
 * @param res - Express response object
 * @param data - Data to be sent in the response
 * @param message - Optional success message
 * @returns Express response object
 *
 * @example
 * sendSuccess(res, appointments, 'Appointments fetched successfully');
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  };
  return res.json(response);
}

/**
 * Sends an error API response
 *
 * @param res - Express response object
 * @param error - Error message or Error object
 * @param statusCode - HTTP status code (default: 500)
 * @returns Express response object
 *
 * @example
 * sendError(res, 'Appointment not found', 404);
 * sendError(res, new ApiError('Validation failed', 400, 'VALIDATION_ERROR'));
 */
export function sendError(
  res: Response,
  error: string | Error | ApiError,
  statusCode: number = 500
): Response {
  let errorMessage: string;
  let errorCode: string | undefined;
  let finalStatusCode = statusCode;

  if (error instanceof ApiError) {
    errorMessage = error.message;
    errorCode = error.code;
    finalStatusCode = error.statusCode;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = error;
  }

  const response: ApiResponse = {
    success: false,
    error: errorMessage,
    ...(errorCode && { code: errorCode })
  };

  return res.status(finalStatusCode).json(response);
}

/**
 * Extracts error message from unknown error type
 * Safely handles different error types in catch blocks
 *
 * @param error - Unknown error caught in try-catch
 * @returns Error message string
 *
 * @example
 * try {
 *   // some code
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   sendError(res, message, 500);
 * }
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Handles errors in async route handlers
 * Safely extracts error information and sends appropriate response
 *
 * @param error - Unknown error caught in try-catch
 * @param res - Express response object
 * @param defaultMessage - Default error message if none can be extracted
 * @param defaultStatusCode - Default HTTP status code (default: 500)
 *
 * @example
 * try {
 *   await someAsyncOperation();
 * } catch (error) {
 *   handleRouteError(error, res, 'Operation failed');
 * }
 */
export function handleRouteError(
  error: unknown,
  res: Response,
  defaultMessage: string = 'Internal server error',
  defaultStatusCode: number = 500
): Response {
  if (error instanceof ApiError) {
    return sendError(res, error);
  }

  const errorMessage = error instanceof Error
    ? error.message
    : defaultMessage;

  return sendError(res, errorMessage, defaultStatusCode);
}
