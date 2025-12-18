import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReminderService } from '../../services/reminderService.js';
import { addDays, format } from 'date-fns';

// Mock dependencies with hoisted functions
const mockFind = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
const mockCustomersGet = vi.hoisted(() => vi.fn());
const mockServicesGet = vi.hoisted(() => vi.fn());
const mockStaffGet = vi.hoisted(() => vi.fn());
const mockRemindersPut = vi.hoisted(() => vi.fn());

// Bcrypt mocks with hoisted functions for better control
const mockBcryptHash = vi.hoisted(() => vi.fn());
const mockBcryptCompare = vi.hoisted(() => vi.fn());

vi.mock('../../config/database.js', () => ({
  default: {
    appointments: {
      find: mockFind,
      get: mockGet,
      put: mockPut
    },
    customers: {
      get: mockCustomersGet
    },
    services: {
      get: mockServicesGet
    },
    staff: {
      get: mockStaffGet
    },
    reminders: {
      put: mockRemindersPut
    }
  }
}));

const mockSendReminderEmail = vi.hoisted(() => vi.fn());
vi.mock('../../services/emailService.js', () => ({
  default: {
    sendReminderEmail: mockSendReminderEmail
  }
}));

vi.mock('../../services/calendarService.js', () => ({
  default: {
    generateICS: vi.fn().mockReturnValue('BEGIN:VCALENDAR\nEND:VCALENDAR')
  }
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: mockBcryptHash,
    compare: mockBcryptCompare
  }
}));

describe('ReminderService', () => {
  let reminderService: ReminderService;

  const mockAppointment = {
    _id: 'appointment-1',
    customerId: 'customer-1',
    serviceId: 'service-1',
    staffId: 'staff-1',
    date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '11:00',
    status: 'scheduled',
    reminderSent: false,
    createdAt: '2025-01-01T10:00:00.000Z',
    updatedAt: '2025-01-01T10:00:00.000Z'
  };

  const mockCustomer = {
    _id: 'customer-1',
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario.rossi@example.com',
    phone: '+39 333 1234567'
  };

  const mockService = {
    _id: 'service-1',
    name: 'Massaggio Rilassante',
    duration: 60,
    price: 50
  };

  const mockStaff = {
    _id: 'staff-1',
    firstName: 'Laura',
    lastName: 'Bianchi',
    email: 'laura@sphyra.local'
  };

  beforeEach(() => {
    reminderService = new ReminderService();
    vi.clearAllMocks();

    // Reset bcrypt mocks to default behavior
    mockBcryptHash.mockResolvedValue('hashed-token');
    mockBcryptCompare.mockResolvedValue(true);
  });

  describe('getAppointmentsNeedingReminders', () => {
    it('should fetch appointments for tomorrow that need reminders', async () => {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

      mockFind.mockResolvedValue({
        docs: [mockAppointment]
      });

      const appointments = await reminderService.getAppointmentsNeedingReminders();

      expect(appointments).toHaveLength(1);
      expect(appointments[0].id).toBe('appointment-1');
      expect(mockFind).toHaveBeenCalledWith({
        selector: {
          date: tomorrow,
          status: { $in: ['scheduled', 'confirmed'] },
          $or: [
            { reminderSent: { $exists: false } },
            { reminderSent: false }
          ]
        }
      });
    });

    it('should return empty array when no appointments need reminders', async () => {
      mockFind.mockResolvedValue({
        docs: []
      });

      const appointments = await reminderService.getAppointmentsNeedingReminders();

      expect(appointments).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      mockFind.mockRejectedValue(new Error('Database connection failed'));

      await expect(reminderService.getAppointmentsNeedingReminders())
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('confirmAppointment', () => {
    it('should confirm appointment with valid token', async () => {
      // Mock bcrypt.compare to return true for valid token
      mockBcryptCompare.mockResolvedValue(true);
      mockBcryptHash.mockResolvedValue('hashed-token-123');

      const appointmentWithToken = {
        ...mockAppointment,
        confirmationTokenHash: 'hashed-token-123',
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      mockGet.mockResolvedValue(appointmentWithToken);
      mockPut.mockResolvedValue({ ok: true, id: 'appointment-1', rev: '2-xyz' });

      // Token must be at least 64 characters (2 UUIDs concatenated)
      const validToken = 'a'.repeat(64);

      const result = await reminderService.confirmAppointment(
        'appointment-1',
        validToken
      );

      // Log error if test fails
      if (!result.success) {
        console.error('Confirmation failed:', result.error);
      }

      expect(result.success).toBe(true);
      expect(result.appointment?.status).toBe('confirmed');
      expect(mockPut).toHaveBeenCalled();

      const putCall = mockPut.mock.calls[0][0];
      expect(putCall.status).toBe('confirmed');
      expect(putCall.confirmationTokenHash).toBeUndefined();
      expect(putCall.confirmedAt).toBeDefined();
    });

    it('should reject invalid token format', async () => {
      const result = await reminderService.confirmAppointment(
        'appointment-1',
        'short-token'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid confirmation token format');
    });

    it('should reject expired token', async () => {
      const appointmentWithExpiredToken = {
        ...mockAppointment,
        confirmationTokenHash: 'hashed-token-123',
        tokenExpiresAt: new Date(Date.now() - 1000).toISOString() // Expired
      };

      mockGet.mockResolvedValue(appointmentWithExpiredToken);

      // Token must be at least 64 characters
      const validToken = 'a'.repeat(64);

      const result = await reminderService.confirmAppointment(
        'appointment-1',
        validToken
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject mismatched token', async () => {
      // Mock bcrypt.compare to return false for mismatched token
      mockBcryptCompare.mockResolvedValue(false);

      const appointmentWithToken = {
        ...mockAppointment,
        confirmationTokenHash: 'hashed-token-123',
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      mockGet.mockResolvedValue(appointmentWithToken);

      // Token must be at least 64 characters
      const wrongToken = 'b'.repeat(64);

      const result = await reminderService.confirmAppointment(
        'appointment-1',
        wrongToken
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid confirmation token');
    });

    it('should handle already confirmed appointments', async () => {
      // Mock bcrypt.compare to return true
      mockBcryptCompare.mockResolvedValue(true);

      const confirmedAppointment = {
        ...mockAppointment,
        status: 'confirmed',
        confirmationTokenHash: 'hashed-token-123',
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      mockGet.mockResolvedValue(confirmedAppointment);

      // Token must be at least 64 characters
      const validToken = 'a'.repeat(64);

      const result = await reminderService.confirmAppointment(
        'appointment-1',
        validToken
      );

      // Log error if test fails
      if (!result.success) {
        console.error('Expected success but got error:', result.error);
      }

      expect(result.success).toBe(true);
      expect(result.message).toContain('already confirmed');
      expect(mockPut).not.toHaveBeenCalled();
    });

    it('should handle missing appointment', async () => {
      mockGet.mockRejectedValue({ status: 404, message: 'not_found' });

      const result = await reminderService.confirmAppointment(
        'non-existent',
        'valid-token-with-64-characters-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      );

      expect(result.success).toBe(false);
    });
  });

  describe('sendAllDueReminders', () => {
    it('should return empty result when no appointments need reminders', async () => {
      mockFind.mockResolvedValue({ docs: [] });

      const result = await reminderService.sendAllDueReminders();

      expect(result.total).toBe(0);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should handle bulk reminder sending', async () => {
      mockFind.mockResolvedValue({
        docs: [mockAppointment]
      });

      mockGet.mockResolvedValue(mockAppointment);
      mockCustomersGet.mockResolvedValue(mockCustomer as any);
      mockServicesGet.mockResolvedValue(mockService as any);
      mockStaffGet.mockResolvedValue(mockStaff as any);
      mockSendReminderEmail.mockResolvedValue({
        success: true,
        messageId: 'test-message-id'
      });

      const result = await reminderService.sendAllDueReminders();

      expect(result.total).toBe(1);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
    });
  });
});
