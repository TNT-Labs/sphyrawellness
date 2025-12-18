import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables for testing
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3001';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.SENDGRID_API_KEY = 'test-api-key';
  process.env.SENDGRID_FROM_EMAIL = 'test@example.com';
  process.env.SENDGRID_FROM_NAME = 'Test Sender';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.REMINDER_SEND_HOUR = '10';
  process.env.REMINDER_SEND_MINUTE = '0';
  process.env.ALLOWED_ORIGINS = 'http://localhost:5173,http://localhost:3000';
});

afterAll(() => {
  // Cleanup if needed
  vi.clearAllMocks();
});
