import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import publicRouter from '../../routes/public.js';

// Mock repositories
vi.mock('../../repositories/serviceRepository.js', () => ({
  serviceRepository: {
    findAll: vi.fn(),
    findById: vi.fn()
  }
}));

vi.mock('../../repositories/staffRepository.js', () => ({
  staffRepository: {
    findActive: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn()
  }
}));

vi.mock('../../repositories/appointmentRepository.js', () => ({
  appointmentRepository: {
    findByStaff: vi.fn(),
    createWithConflictCheck: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock('../../repositories/customerRepository.js', () => ({
  customerRepository: {
    findByEmail: vi.fn(),
    findByPhone: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock('../../repositories/settingsRepository.js', () => ({
  settingsRepository: {
    getBusinessHours: vi.fn()
  }
}));

vi.mock('../../services/reminderServicePrisma.js', () => ({
  default: {
    confirmAppointment: vi.fn()
  }
}));

vi.mock('../../services/emailService.js', () => ({
  default: {
    sendAppointmentConfirmation: vi.fn()
  }
}));

vi.mock('../../services/calendarService.js', () => ({
  default: {
    generateICS: vi.fn()
  }
}));

describe('Public Routes - Date Validation', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/public', publicRouter);
    vi.clearAllMocks();
  });

  describe('GET /api/public/available-slots', () => {
    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .get('/api/public/available-slots')
        .query({
          serviceId: '123e4567-e89b-12d3-a456-426614174000',
          date: 'invalid-date'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid date format');
    });

    it('should return 400 when serviceId is missing', async () => {
      const response = await request(app)
        .get('/api/public/available-slots')
        .query({
          date: '2024-01-01'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when date is missing', async () => {
      const response = await request(app)
        .get('/api/public/available-slots')
        .query({
          serviceId: '123e4567-e89b-12d3-a456-426614174000'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/public/appointments/availability', () => {
    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .post('/api/public/appointments/availability')
        .send({
          serviceId: '123e4567-e89b-12d3-a456-426614174000',
          staffId: '123e4567-e89b-12d3-a456-426614174001',
          date: 'not-a-date'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid date format');
    });

    it('should validate UUID format for serviceId', async () => {
      const response = await request(app)
        .post('/api/public/appointments/availability')
        .send({
          serviceId: 'not-a-uuid',
          staffId: '123e4567-e89b-12d3-a456-426614174001',
          date: '2024-01-01'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate UUID format for staffId', async () => {
      const response = await request(app)
        .post('/api/public/appointments/availability')
        .send({
          serviceId: '123e4567-e89b-12d3-a456-426614174000',
          staffId: 'not-a-uuid',
          date: '2024-01-01'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/public/bookings - Date Validation', () => {
    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .post('/api/public/bookings')
        .send({
          serviceId: '123e4567-e89b-12d3-a456-426614174000',
          date: 'invalid-date',
          startTime: '10:00',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          privacyConsent: true
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid date format');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/public/bookings')
        .send({
          serviceId: '123e4567-e89b-12d3-a456-426614174000',
          date: '2024-01-01',
          startTime: '10:00',
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email',
          phone: '+1234567890',
          privacyConsent: true
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should require privacy consent', async () => {
      const response = await request(app)
        .post('/api/public/bookings')
        .send({
          serviceId: '123e4567-e89b-12d3-a456-426614174000',
          date: '2024-01-01',
          startTime: '10:00',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          privacyConsent: false
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/public/bookings')
        .send({
          serviceId: '123e4567-e89b-12d3-a456-426614174000',
          date: '2024-01-01',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/public/appointments/:id/confirm', () => {
    it('should return 400 when token is missing', async () => {
      const response = await request(app)
        .post('/api/public/appointments/123e4567-e89b-12d3-a456-426614174000/confirm')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Token is required');
    });
  });
});
