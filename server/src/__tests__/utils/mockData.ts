import type { Appointment, Customer, Service, Staff } from '../../types/index.js';

export const mockCustomer: Customer = {
  id: 'customer-1',
  name: 'Mario Rossi',
  email: 'mario.rossi@example.com',
  phone: '+39 333 1234567',
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z'
};

export const mockService: Service = {
  id: 'service-1',
  name: 'Massaggio Rilassante',
  duration: 60,
  price: 50,
  description: 'Un massaggio completo per rilassare corpo e mente',
  category: 'massage',
  active: true,
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z'
};

export const mockStaff: Staff = {
  id: 'staff-1',
  name: 'Dr. Laura Bianchi',
  email: 'laura.bianchi@sphyra.local',
  role: 'therapist',
  specialization: 'Massoterapia',
  active: true,
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z'
};

export const mockAppointment: Appointment = {
  id: 'appointment-1',
  customerId: 'customer-1',
  serviceId: 'service-1',
  staffId: 'staff-1',
  date: '2025-01-15',
  startTime: '10:00',
  endTime: '11:00',
  status: 'scheduled',
  notes: 'Prima visita',
  reminderSent: false,
  confirmed: false,
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z'
};

export const mockAppointmentWithReminder: Appointment = {
  ...mockAppointment,
  id: 'appointment-2',
  reminderSent: true,
  reminderSentAt: '2025-01-14T10:00:00.000Z',
  confirmationToken: 'mock-hashed-token-123'
};

export const mockAppointmentConfirmed: Appointment = {
  ...mockAppointment,
  id: 'appointment-3',
  confirmed: true,
  confirmedAt: '2025-01-14T12:00:00.000Z'
};
