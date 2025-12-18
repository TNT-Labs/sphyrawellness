import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailService } from '../../services/emailService.js';
import type { ReminderEmailData } from '../../types/index.js';

// Mock SendGrid with hoisted function
const mockSend = vi.hoisted(() => vi.fn());

vi.mock('../../config/sendgrid.js', () => ({
  default: {
    send: mockSend
  },
  sendGridConfig: {
    isConfigured: true,
    fromEmail: 'test@example.com',
    fromName: 'Test Sender'
  }
}));

describe('EmailService', () => {
  let emailService: EmailService;

  const mockEmailData: ReminderEmailData = {
    customerName: 'Mario Rossi',
    appointmentDate: '15 Gennaio 2025',
    appointmentTime: '10:00',
    serviceName: 'Massaggio Rilassante',
    staffName: 'Dr. Laura Bianchi',
    confirmationLink: 'https://sphyra.local/confirm/123',
    calendarLink: 'https://sphyra.local/api/appointments/123/calendar.ics'
  };

  beforeEach(() => {
    emailService = new EmailService();
    vi.clearAllMocks();
  });

  describe('sendReminderEmail', () => {
    it('should send reminder email successfully', async () => {
      mockSend.mockResolvedValue([{
        statusCode: 202,
        headers: {
          'x-message-id': 'test-message-id-123'
        }
      }]);

      const result = await emailService.sendReminderEmail(
        'customer@example.com',
        mockEmailData
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id-123');
      expect(mockSend).toHaveBeenCalledTimes(1);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toBe('customer@example.com');
      expect(callArgs.from.email).toBe('test@example.com');
      expect(callArgs.subject).toContain('Promemoria Appuntamento');
      expect(callArgs.html).toBeTruthy();
      expect(callArgs.text).toBeTruthy();
    });

    it('should include .ics attachment when provided', async () => {
      mockSend.mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'test-id' }
      }]);

      const dataWithIcs = {
        ...mockEmailData,
        icsContent: 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR'
      };

      await emailService.sendReminderEmail('customer@example.com', dataWithIcs);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.attachments).toBeDefined();
      expect(callArgs.attachments).toHaveLength(1);
      expect(callArgs.attachments[0].filename).toBe('appuntamento.ics');
      expect(callArgs.attachments[0].type).toBe('text/calendar');
    });

    it('should handle SendGrid errors gracefully', async () => {
      const sendGridError = new Error('SendGrid API error');
      (sendGridError as any).response = {
        body: {
          errors: [
            { message: 'Invalid API key' }
          ]
        }
      };

      mockSend.mockRejectedValue(sendGridError);

      const result = await emailService.sendReminderEmail(
        'customer@example.com',
        mockEmailData
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('SendGrid error');
      expect(result.error).toContain('Invalid API key');
    });

    // Note: Cannot test unconfigured SendGrid since it's mocked at module level
  });

  describe('sendTestEmail', () => {
    it('should send test email successfully', async () => {
      mockSend.mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'test-id' }
      }]);

      const result = await emailService.sendTestEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toBe('test@example.com');
      expect(callArgs.subject).toContain('Test Email');
    });

    it('should handle test email errors', async () => {
      mockSend.mockRejectedValue(new Error('Network error'));

      const result = await emailService.sendTestEmail('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should provide helpful error for missing sender email', async () => {
      const sendGridError = new Error('SendGrid API error');
      (sendGridError as any).response = {
        body: {
          errors: [
            { message: 'The from email does not contain a valid address' }
          ]
        }
      };

      mockSend.mockRejectedValue(sendGridError);

      const result = await emailService.sendTestEmail('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('from email');
      expect(result.error).toContain('verified in SendGrid');
    });
  });
});
