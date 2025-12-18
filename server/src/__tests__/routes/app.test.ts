import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

// Mock logger to avoid console spam
vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock database
vi.mock('../../config/database.js', () => ({
  default: {
    appointments: {},
    customers: {},
    services: {},
    staff: {},
    reminders: {}
  }
}));

describe('App API', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Sphyra Wellness Lab API');
      expect(response.body.data.version).toBeDefined();
      expect(response.body.data.endpoints).toBeDefined();
      expect(response.body.data.endpoints.health).toBe('/health');
      expect(response.body.data.endpoints.appointments).toBe('/api/appointments');
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('CORS Configuration', () => {
    it('should set correct CORS headers for allowed origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173');

      // CORS headers should be present
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/appointments')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBeLessThan(400);
    });
  });

  describe('Security Headers', () => {
    it('should set security headers with helmet', async () => {
      const response = await request(app)
        .get('/health');

      // Helmet should add security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

});
