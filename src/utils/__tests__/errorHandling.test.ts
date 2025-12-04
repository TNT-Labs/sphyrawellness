/**
 * Tests for error handling utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  classifyError,
  getUserFriendlyMessage,
  ErrorType,
  retryWithBackoff,
  safeJsonParse,
} from '../errorHandling';

describe('Error Classification', () => {
  it('should classify QuotaExceededError', () => {
    const error = new Error('Storage quota exceeded');
    error.name = 'QuotaExceededError';

    const type = classifyError(error);
    expect(type).toBe(ErrorType.STORAGE_QUOTA_EXCEEDED);
  });

  it('should classify SyntaxError as corrupted storage', () => {
    const error = new SyntaxError('Unexpected token');

    const type = classifyError(error);
    expect(type).toBe(ErrorType.STORAGE_CORRUPTED);
  });

  it('should classify network errors', () => {
    const error = new Error('fetch failed');

    const type = classifyError(error);
    expect(type).toBe(ErrorType.NETWORK_ERROR);
  });

  it('should classify validation errors', () => {
    const error = new Error('validation failed');

    const type = classifyError(error);
    expect(type).toBe(ErrorType.VALIDATION_ERROR);
  });

  it('should return UNKNOWN for unclassified errors', () => {
    const error = new Error('Something went wrong');

    const type = classifyError(error);
    expect(type).toBe(ErrorType.UNKNOWN);
  });
});

describe('User-Friendly Messages', () => {
  it('should provide Italian error messages', () => {
    const error = new Error('Storage quota exceeded');
    error.name = 'QuotaExceededError';

    const message = getUserFriendlyMessage(error);
    expect(message).toContain('archiviazione');
  });

  it('should include context in message', () => {
    const error = new Error('validation error');
    const message = getUserFriendlyMessage(error, 'Salvataggio cliente');

    expect(message).toContain('Salvataggio cliente');
  });
});

describe('Retry with Backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should retry failed operations', async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Failed');
      }
      return 'success';
    });

    const promise = retryWithBackoff(fn, { maxRetries: 3, baseDelay: 100 });

    // Fast-forward through all retries
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it('should throw after max retries', async () => {
    const fn = vi.fn(async () => {
      throw new Error('Always fails');
    });

    const promise = retryWithBackoff(fn, { maxRetries: 2, baseDelay: 10 });

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Always fails');
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries

    vi.useRealTimers();
  });

  it('should call onRetry callback', async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Failed');
      }
      return 'success';
    });

    const onRetry = vi.fn();

    const promise = retryWithBackoff(fn, { maxRetries: 2, baseDelay: 10, onRetry });

    await vi.runAllTimersAsync();

    await promise;
    expect(onRetry).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

describe('Safe JSON Parse', () => {
  it('should parse valid JSON', () => {
    const json = '{"name": "Test", "value": 123}';
    const result = safeJsonParse(json);

    expect(result).toEqual({ name: 'Test', value: 123 });
  });

  it('should return null for invalid JSON', () => {
    const json = '{invalid json}';
    const result = safeJsonParse(json);

    expect(result).toBeNull();
  });

  it('should validate parsed data with validator', () => {
    const json = '{"name": "Test"}';
    const validator = (data: unknown): data is { name: string; required: string } =>
      typeof data === 'object' &&
      data !== null &&
      'name' in data &&
      'required' in data;

    const result = safeJsonParse(json, validator);

    expect(result).toBeNull(); // Should fail validation
  });

  it('should accept valid data with validator', () => {
    const json = '{"name": "Test", "required": "value"}';
    const validator = (data: unknown): data is { name: string; required: string } =>
      typeof data === 'object' &&
      data !== null &&
      'name' in data &&
      'required' in data;

    const result = safeJsonParse(json, validator);

    expect(result).toEqual({ name: 'Test', required: 'value' });
  });
});
