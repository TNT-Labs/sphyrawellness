import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import db from '../../config/database.js';
import reminderService from '../../services/reminderService.js';
import { mockAppointment, mockCustomer, mockService, mockStaff } from '../utils/mockData.js';

// Mock the database
vi.mock('../../config/database.js', () => ({
  default: {
    appointments: {
      allDocs: vi.fn(),
      get: vi.fn()
    },
    customers: {
      get: vi.fn()
    },
    services: {
      get: vi.fn()
    },
    staff: {
      get: vi.fn()
    }
  }
}));

// Mock the reminder service
vi.mock('../../services/reminderService.js', () => ({
  default: {
    confirmAppointment: vi.fn()
  }
}));

// Mock authentication middleware
vi.mock('../../middleware/auth.js', () => ({
  authenticateToken: vi.fn((req, res, next) => next())
}));

// Mock logger to avoid console spam during tests
vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Appointments API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/appointments', () => {
    it('should get all appointments successfully', async () => {
      // Mock database response
      const mockDbResponse = {
        rows: [
          {
            id: mockAppointment.id,
            doc: mockAppointment
          }
        ]
      };

      vi.mocked(db.appointments.allDocs).mockResolvedValue(mockDbResponse as any);

      const response = await request(app)
        .get('/api/appointments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(mockAppointment.id);
    });

    it('should filter out design documents', async () => {
      const mockDbResponse = {
        rows: [
          {
            id: mockAppointment.id,
            doc: mockAppointment
          },
          {
            id: '_design/appointments',
            doc: { _id: '_design/appointments' }
          }
        ]
      };

      vi.mocked(db.appointments.allDocs).mockResolvedValue(mockDbResponse as any);

      const response = await request(app)
        .get('/api/appointments')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(mockAppointment.id);
    });

    it('should handle database errors', async () => {
      vi.mocked(db.appointments.allDocs).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/appointments')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('POST /api/appointments/:appointmentId/confirm', () => {
    it('should confirm appointment with valid token', async () => {
      const mockResult = {
        success: true,
        appointment: { ...mockAppointment, confirmed: true }
      };

      vi.mocked(reminderService.confirmAppointment).mockResolvedValue(mockResult as any);

      const response = await request(app)
        .post(`/api/appointments/${mockAppointment.id}/confirm`)
        .send({ token: 'valid-token-123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.confirmed).toBe(true);
      expect(response.body.message).toBe('Appointment confirmed successfully');
    });

    it('should reject confirmation without token', async () => {
      const response = await request(app)
        .post(`/api/appointments/${mockAppointment.id}/confirm`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Confirmation token is required');
    });

    it('should handle invalid token', async () => {
      const mockResult = {
        success: false,
        error: 'Invalid or expired token'
      };

      vi.mocked(reminderService.confirmAppointment).mockResolvedValue(mockResult as any);

      const response = await request(app)
        .post(`/api/appointments/${mockAppointment.id}/confirm`)
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid or expired token');
    });
  });

  describe('GET /api/appointments/:appointmentId/confirm/:token', () => {
    it('should redirect to success page on valid confirmation', async () => {
      const mockResult = {
        success: true,
        appointment: { ...mockAppointment, confirmed: true }
      };

      vi.mocked(reminderService.confirmAppointment).mockResolvedValue(mockResult as any);

      const response = await request(app)
        .get(`/api/appointments/${mockAppointment.id}/confirm/valid-token`)
        .expect(302); // Redirect

      expect(response.header.location).toContain('/confirm-appointment/success');
      expect(response.header.location).toContain(mockAppointment.id);
    });

    it('should redirect to error page on invalid token', async () => {
      const mockResult = {
        success: false,
        error: 'Invalid token'
      };

      vi.mocked(reminderService.confirmAppointment).mockResolvedValue(mockResult as any);

      const response = await request(app)
        .get(`/api/appointments/${mockAppointment.id}/confirm/invalid-token`)
        .expect(302); // Redirect

      expect(response.header.location).toContain('/confirm-appointment/error');
      expect(response.header.location).toContain('Invalid%20token');
    });
  });

  describe('GET /api/appointments/:appointmentId/calendar.ics', () => {
    it('should generate .ics file successfully', async () => {
      // Mock database responses
      vi.mocked(db.appointments.get).mockResolvedValue({
        _id: mockAppointment.id,
        ...mockAppointment
      } as any);

      vi.mocked(db.customers.get).mockResolvedValue({
        _id: mockCustomer.id,
        ...mockCustomer
      } as any);

      vi.mocked(db.services.get).mockResolvedValue({
        _id: mockService.id,
        ...mockService
      } as any);

      vi.mocked(db.staff.get).mockResolvedValue({
        _id: mockStaff.id,
        ...mockStaff
      } as any);

      const response = await request(app)
        .get(`/api/appointments/${mockAppointment.id}/calendar.ics`)
        .expect(200);

      expect(response.header['content-type']).toContain('text/calendar');
      expect(response.header['content-disposition']).toContain('attachment');
      expect(response.header['content-disposition']).toContain('.ics');
      expect(response.text).toContain('BEGIN:VCALENDAR');
      expect(response.text).toContain('END:VCALENDAR');
    });

    it('should handle missing appointment', async () => {
      vi.mocked(db.appointments.get).mockRejectedValue({
        status: 404,
        message: 'Document not found'
      });

      const response = await request(app)
        .get('/api/appointments/non-existent-id/calendar.ics')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
