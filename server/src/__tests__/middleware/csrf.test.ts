import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { generateCsrfToken, validateCsrfToken, csrfProtection, attachCsrfToken } from '../../middleware/csrf.js';

describe('CSRF Protection Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      headers: {}
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn()
    };
    nextFunction = vi.fn();
    vi.clearAllMocks();
  });

  describe('generateCsrfToken', () => {
    it('should generate token with correct format', () => {
      const token = generateCsrfToken();
      const parts = token.split(':');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toMatch(/^[a-f0-9]{64}$/); // 32 bytes hex = 64 chars
      expect(parts[1]).toMatch(/^\d+$/); // timestamp
      expect(parts[2]).toMatch(/^[a-f0-9]{64}$/); // HMAC signature
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('validateCsrfToken', () => {
    it('should validate a freshly generated token', () => {
      const token = generateCsrfToken();
      const isValid = validateCsrfToken(token);

      expect(isValid).toBe(true);
    });

    it('should reject token with invalid format', () => {
      expect(validateCsrfToken('invalid')).toBe(false);
      expect(validateCsrfToken('part1:part2')).toBe(false);
      expect(validateCsrfToken('')).toBe(false);
    });

    it('should reject token with invalid timestamp', () => {
      const token = 'abc123:notanumber:def456';
      expect(validateCsrfToken(token)).toBe(false);
    });

    it('should reject expired token', () => {
      // Create token with old timestamp (20 minutes ago)
      const oldTimestamp = Date.now() - (20 * 60 * 1000);
      const token = `${'a'.repeat(64)}:${oldTimestamp}:${'b'.repeat(64)}`;

      expect(validateCsrfToken(token)).toBe(false);
    });

    it('should reject token with invalid signature', () => {
      const validToken = generateCsrfToken();
      const parts = validToken.split(':');

      // Tamper with signature
      const tamperedToken = `${parts[0]}:${parts[1]}:${'x'.repeat(64)}`;

      expect(validateCsrfToken(tamperedToken)).toBe(false);
    });
  });

  describe('csrfProtection middleware', () => {
    it('should allow GET requests without token', () => {
      mockRequest.method = 'GET';

      csrfProtection(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow HEAD requests without token', () => {
      mockRequest.method = 'HEAD';

      csrfProtection(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow OPTIONS requests without token', () => {
      mockRequest.method = 'OPTIONS';

      csrfProtection(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject POST request without token', () => {
      mockRequest.method = 'POST';
      mockRequest.headers = {};

      csrfProtection(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'CSRF token missing'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject POST request with invalid token', () => {
      mockRequest.method = 'POST';
      mockRequest.headers = {
        'x-csrf-token': 'invalid-token'
      };

      csrfProtection(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired CSRF token'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow POST request with valid token', () => {
      const validToken = generateCsrfToken();
      mockRequest.method = 'POST';
      mockRequest.headers = {
        'x-csrf-token': validToken
      };

      csrfProtection(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('attachCsrfToken middleware', () => {
    it('should attach CSRF token to response headers', () => {
      attachCsrfToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-CSRF-Token',
        expect.stringMatching(/^[a-f0-9]+:\d+:[a-f0-9]+$/)
      );
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
