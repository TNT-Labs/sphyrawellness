import { prisma } from '../lib/prisma.js';
import type { Reminder, Prisma } from '@prisma/client';

export class ReminderRepository {
  async findAll(): Promise<Reminder[]> {
    return prisma.reminder.findMany({
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
            staff: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'desc',
      },
    });
  }

  async findById(id: string) {
    return prisma.reminder.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
            staff: true,
          },
        },
      },
    });
  }

  async findByAppointment(appointmentId: string): Promise<Reminder[]> {
    return prisma.reminder.findMany({
      where: { appointmentId },
      orderBy: {
        scheduledFor: 'desc',
      },
    });
  }

  async findPending(): Promise<Reminder[]> {
    return prisma.reminder.findMany({
      where: {
        sent: false,
        scheduledFor: {
          lte: new Date(),
        },
      },
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
            staff: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });
  }

  async create(data: Prisma.ReminderCreateInput): Promise<Reminder> {
    return prisma.reminder.create({
      data,
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
            staff: true,
          },
        },
      },
    });
  }

  async markAsSent(id: string, errorMessage?: string): Promise<Reminder> {
    return prisma.reminder.update({
      where: { id },
      data: {
        sent: !errorMessage,
        sentAt: new Date(),
        ...(errorMessage && { errorMessage }),
      },
    });
  }

  async update(id: string, data: Prisma.ReminderUpdateInput): Promise<Reminder> {
    return prisma.reminder.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Reminder> {
    return prisma.reminder.delete({
      where: { id },
    });
  }
}

export const reminderRepository = new ReminderRepository();
