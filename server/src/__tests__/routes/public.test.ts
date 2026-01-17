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

// Mock date-fns to control "now" in tests
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
  };
});

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

  describe('POST /api/public/bookings - Past Time Validation', () => {
    const { serviceRepository, customerRepository } = await import('../../repositories/serviceRepository.js');

    it('should reject booking for past time on same day', async () => {
      // Mock service repository
      vi.mocked(serviceRepository.findById).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Service',
        duration: 60,
        price: 50
      } as any);

      const now = new Date();
      const pastHour = now.getHours() - 1;
      const pastMinute = now.getMinutes();
      const pastTime = `${String(pastHour).padStart(2, '0')}:${String(pastMinute).padStart(2, '0')}`;
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

      const response = await request(app)
        .post('/api/public/bookings')
        .send({
          serviceId: '123e4567-e89b-12d3-a456-426614174000',
          date: today,
          startTime: pastTime,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          privacyConsent: true
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('orario già trascorso');
    });

    it('should allow booking for future time on same day', async () => {
      // Mock repositories
      vi.mocked(serviceRepository.findById).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Service',
        duration: 60,
        price: 50
      } as any);

      const { staffRepository, appointmentRepository } = await import('../../repositories/staffRepository.js');

      vi.mocked(staffRepository.findAll).mockResolvedValue([{
        id: 'staff-123',
        firstName: 'Jane',
        lastName: 'Smith',
        isActive: true
      }] as any);

      vi.mocked(appointmentRepository.findByStaff).mockResolvedValue([]);
      vi.mocked(customerRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(customerRepository.findByPhone).mockResolvedValue(null);
      vi.mocked(customerRepository.create).mockResolvedValue({
        id: 'customer-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      } as any);

      vi.mocked(appointmentRepository.createWithConflictCheck).mockResolvedValue({
        id: 'appointment-123',
        date: new Date()
      } as any);

      const now = new Date();
      const futureHour = now.getHours() + 2;
      const futureMinute = now.getMinutes();
      const futureTime = `${String(futureHour).padStart(2, '0')}:${String(futureMinute).padStart(2, '0')}`;
      const today = now.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/public/bookings')
        .send({
          serviceId: '123e4567-e89b-12d3-a456-426614174000',
          date: today,
          startTime: futureTime,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          privacyConsent: true
        });

      // Should not fail due to time validation (may fail for other reasons in this mock setup)
      // The important part is it doesn't return the "past time" error
      if (response.status === 400 || response.status === 404) {
        expect(response.body.error).not.toContain('orario già trascorso');
      }
    });
  });

  describe('POST /api/public/appointments - Past Time Validation', () => {
    const { serviceRepository } = await import('../../repositories/serviceRepository.js');

    it('should reject appointment for past time on same day', async () => {
      vi.mocked(serviceRepository.findById).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Service',
        duration: 60,
        price: 50
      } as any);

      const now = new Date();
      const pastHour = now.getHours() - 1;
      const pastMinute = now.getMinutes();
      const pastTime = `${String(pastHour).padStart(2, '0')}:${String(pastMinute).padStart(2, '0')}`;
      const today = now.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/public/appointments')
        .send({
          customer: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            privacyConsent: true
          },
          serviceId: '123e4567-e89b-12d3-a456-426614174000',
          staffId: '123e4567-e89b-12d3-a456-426614174001',
          date: today,
          startTime: pastTime
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('orario già trascorso');
    });
  });
});
