/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  customerSchema,
  serviceSchema,
  appointmentSchema,
  paymentSchema,
  settingsSchema,
  validateData,
  sanitizeString,
  sanitizePhone,
  sanitizeEmail,
} from '../validation';

describe('Customer Validation', () => {
  it('should validate a valid customer', () => {
    const validCustomer = {
      id: '123',
      firstName: 'Mario',
      lastName: 'Rossi',
      email: 'mario.rossi@example.com',
      phone: '+39 123 456 7890',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const result = validateData(customerSchema, validCustomer);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidCustomer = {
      id: '123',
      firstName: 'Mario',
      lastName: 'Rossi',
      email: 'invalid-email',
      phone: '+39 123 456 7890',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const result = validateData(customerSchema, invalidCustomer);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.email).toBeDefined();
    }
  });

  it('should reject invalid phone number', () => {
    const invalidCustomer = {
      id: '123',
      firstName: 'Mario',
      lastName: 'Rossi',
      email: 'mario@example.com',
      phone: 'abc',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const result = validateData(customerSchema, invalidCustomer);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.phone).toBeDefined();
    }
  });

  it('should reject names that are too short', () => {
    const invalidCustomer = {
      id: '123',
      firstName: 'M',
      lastName: 'R',
      email: 'mario@example.com',
      phone: '+39 123 456 7890',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const result = validateData(customerSchema, invalidCustomer);
    expect(result.success).toBe(false);
  });
});

describe('Service Validation', () => {
  it('should validate a valid service', () => {
    const validService = {
      id: '123',
      name: 'Massaggio Rilassante',
      description: 'Un massaggio che rilassa',
      duration: 60,
      price: 50,
      category: 'massaggi',
    };

    const result = validateData(serviceSchema, validService);
    expect(result.success).toBe(true);
  });

  it('should reject negative price', () => {
    const invalidService = {
      id: '123',
      name: 'Massaggio',
      duration: 60,
      price: -10,
      category: 'massaggi',
    };

    const result = validateData(serviceSchema, invalidService);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.price).toBeDefined();
    }
  });

  it('should reject invalid duration', () => {
    const invalidService = {
      id: '123',
      name: 'Massaggio',
      duration: 2, // Too short
      price: 50,
      category: 'massaggi',
    };

    const result = validateData(serviceSchema, invalidService);
    expect(result.success).toBe(false);
  });
});

describe('Appointment Validation', () => {
  it('should validate a valid appointment', () => {
    const validAppointment = {
      id: '123',
      customerId: 'customer1',
      serviceId: 'service1',
      staffId: 'staff1',
      date: '2024-12-25',
      startTime: '10:00',
      endTime: '11:00',
      status: 'scheduled' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const result = validateData(appointmentSchema, validAppointment);
    expect(result.success).toBe(true);
  });

  it('should reject end time before start time', () => {
    const invalidAppointment = {
      id: '123',
      customerId: 'customer1',
      serviceId: 'service1',
      staffId: 'staff1',
      date: '2024-12-25',
      startTime: '11:00',
      endTime: '10:00', // Before start time
      status: 'scheduled' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const result = validateData(appointmentSchema, invalidAppointment);
    expect(result.success).toBe(false);
  });

  it('should reject invalid date format', () => {
    const invalidAppointment = {
      id: '123',
      customerId: 'customer1',
      serviceId: 'service1',
      staffId: 'staff1',
      date: '25/12/2024', // Wrong format
      startTime: '10:00',
      endTime: '11:00',
      status: 'scheduled' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const result = validateData(appointmentSchema, invalidAppointment);
    expect(result.success).toBe(false);
  });
});

describe('Payment Validation', () => {
  it('should validate a valid payment', () => {
    const validPayment = {
      id: '123',
      appointmentId: 'apt1',
      amount: 50.50,
      method: 'cash' as const,
      date: '2024-12-25',
    };

    const result = validateData(paymentSchema, validPayment);
    expect(result.success).toBe(true);
  });

  it('should reject negative amount', () => {
    const invalidPayment = {
      id: '123',
      appointmentId: 'apt1',
      amount: -10,
      method: 'cash' as const,
      date: '2024-12-25',
    };

    const result = validateData(paymentSchema, invalidPayment);
    expect(result.success).toBe(false);
  });
});

describe('Settings Validation', () => {
  it('should validate valid settings', () => {
    const validSettings = {
      idleTimeout: 5,
      syncEnabled: true,
      couchdbUrl: 'https://example.com',
      couchdbUsername: 'admin',
      couchdbPassword: 'password',
    };

    const result = validateData(settingsSchema, validSettings);
    expect(result.success).toBe(true);
  });

  it('should reject invalid URL', () => {
    const invalidSettings = {
      idleTimeout: 5,
      syncEnabled: true,
      couchdbUrl: 'not-a-url',
    };

    const result = validateData(settingsSchema, invalidSettings);
    expect(result.success).toBe(false);
  });

  it('should reject negative idle timeout', () => {
    const invalidSettings = {
      idleTimeout: -1,
      syncEnabled: false,
    };

    const result = validateData(settingsSchema, invalidSettings);
    expect(result.success).toBe(false);
  });
});

describe('Sanitization Functions', () => {
  it('should sanitize strings properly', () => {
    expect(sanitizeString('  Hello  World  ')).toBe('Hello World');
    expect(sanitizeString('Test\x00String')).toBe('TestString');
    expect(sanitizeString('Multiple   Spaces')).toBe('Multiple Spaces');
  });

  it('should sanitize phone numbers', () => {
    expect(sanitizePhone('+39 123-456-7890')).toBe('+39 123-456-7890');
    expect(sanitizePhone('abc123def')).toBe('123');
    expect(sanitizePhone('+39-123.456.7890')).toBe('+39-1234567890'); // Dots are removed
  });

  it('should sanitize emails', () => {
    expect(sanitizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
    expect(sanitizeEmail('USER@DOMAIN.IT')).toBe('user@domain.it');
  });
});
