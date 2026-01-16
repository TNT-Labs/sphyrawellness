import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('JWT Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to get fresh config
    vi.resetModules();
    // Clone environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('JWT_SECRET', () => {
    it('should use JWT_SECRET from environment when provided', async () => {
      process.env.JWT_SECRET = 'test-secret-from-env-12345678901234567890';
      process.env.NODE_ENV = 'production';

      const { JWT_SECRET } = await import('../../config/jwt.js');

      expect(JWT_SECRET).toBe('test-secret-from-env-12345678901234567890');
    });

    it('should use default secret in development mode', async () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'development';

      const { JWT_SECRET } = await import('../../config/jwt.js');

      expect(JWT_SECRET).toBe('dev-secret-key-sphyra-wellness-2024');
    });

    it('should exit in production without JWT_SECRET', async () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'production';

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(async () => {
        await import('../../config/jwt.js');
      }).rejects.toThrow('process.exit called');

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('should reject weak secrets in production', async () => {
      process.env.JWT_SECRET = 'secret';
      process.env.NODE_ENV = 'production';

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(async () => {
        await import('../../config/jwt.js');
      }).rejects.toThrow('process.exit called');

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('should reject short secrets in production', async () => {
      process.env.JWT_SECRET = 'short';
      process.env.NODE_ENV = 'production';

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(async () => {
        await import('../../config/jwt.js');
      }).rejects.toThrow('process.exit called');

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });
  });

  describe('JWT_EXPIRES_IN', () => {
    it('should use JWT_EXPIRES_IN from environment when valid', async () => {
      process.env.JWT_SECRET = 'valid-secret-12345678901234567890';
      process.env.JWT_EXPIRES_IN = '24h';
      process.env.NODE_ENV = 'development';

      const { JWT_EXPIRES_IN } = await import('../../config/jwt.js');

      expect(JWT_EXPIRES_IN).toBe('24h');
    });

    it('should default to 7d when JWT_EXPIRES_IN is not set', async () => {
      process.env.JWT_SECRET = 'valid-secret-12345678901234567890';
      delete process.env.JWT_EXPIRES_IN;
      process.env.NODE_ENV = 'development';

      const { JWT_EXPIRES_IN } = await import('../../config/jwt.js');

      expect(JWT_EXPIRES_IN).toBe('7d');
    });

    it('should use default for invalid JWT_EXPIRES_IN format in production', async () => {
      process.env.JWT_SECRET = 'valid-secret-12345678901234567890';
      process.env.JWT_EXPIRES_IN = 'invalid-format';
      process.env.NODE_ENV = 'production';

      const { JWT_EXPIRES_IN } = await import('../../config/jwt.js');

      expect(JWT_EXPIRES_IN).toBe('7d');
    });

    it('should use default for invalid JWT_EXPIRES_IN format in development', async () => {
      process.env.JWT_SECRET = 'valid-secret-12345678901234567890';
      process.env.JWT_EXPIRES_IN = 'bad';
      process.env.NODE_ENV = 'development';

      const { JWT_EXPIRES_IN } = await import('../../config/jwt.js');

      expect(JWT_EXPIRES_IN).toBe('7d');
    });

    it('should accept valid time formats', async () => {
      const validFormats = ['60s', '60m', '24h', '7d'];

      for (const format of validFormats) {
        vi.resetModules();
        process.env.JWT_SECRET = 'valid-secret-12345678901234567890';
        process.env.JWT_EXPIRES_IN = format;
        process.env.NODE_ENV = 'development';

        const { JWT_EXPIRES_IN } = await import('../../config/jwt.js');

        expect(JWT_EXPIRES_IN).toBe(format);
      }
    });
  });
});
