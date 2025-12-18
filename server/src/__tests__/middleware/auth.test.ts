import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../../middleware/auth.js';

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn()
  }
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    nextFunction = vi.fn();
    vi.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should call next() with valid token', async () => {
      const jwt = await import('jsonwebtoken');

      mockRequest.headers = {
        authorization: 'Bearer valid-token-123'
      };

      vi.mocked(jwt.default.verify).mockReturnValue({ userId: '123' } as any);

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 without authorization header', () => {
      mockRequest.headers = {};

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 with malformed authorization header', () => {
      mockRequest.headers = {
        authorization: 'Bearer' // Missing token part
      };

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 with invalid token', async () => {
      const jwt = await import('jsonwebtoken');

      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      vi.mocked(jwt.default.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
