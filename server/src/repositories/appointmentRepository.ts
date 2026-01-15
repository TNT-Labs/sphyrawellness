import { prisma } from '../lib/prisma.js';
import type { Appointment, AppointmentStatus, Prisma } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

export class AppointmentRepository {
  async findAll(): Promise<Appointment[]> {
    return prisma.appointment.findMany({
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  /**
   * Find appointments with pagination at database level
   * @param skip - Number of records to skip
   * @param take - Number of records to return
   * @param where - Optional where clause for filtering
   * @returns Array of appointments with includes
   */
  async findAllPaginated(options: {
    skip?: number;
    take?: number;
    where?: Prisma.AppointmentWhereInput;
  }): Promise<Appointment[]> {
    return prisma.appointment.findMany({
      where: options.where,
      skip: options.skip,
      take: options.take,
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  /**
   * Count appointments matching the where clause
   * @param where - Optional where clause for filtering
   * @returns Total count
   */
  async count(where?: Prisma.AppointmentWhereInput): Promise<number> {
    return prisma.appointment.count({ where });
  }

  async findById(id: string) {
    return prisma.appointment.findUnique({
      where: { id },
      include: {
        customer: true,
        service: true,
        staff: true,
        payments: true,
        reminders: true,
      },
    });
  }

  async findByDateRange(startDate: Date, endDate: Date) {
    return prisma.appointment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }

  async findByDate(date: Date) {
    return prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
      },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async findByCustomer(customerId: string) {
    return prisma.appointment.findMany({
      where: { customerId },
      include: {
        service: true,
        staff: true,
        payments: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findByStaff(staffId: string, startDate?: Date, endDate?: Date) {
    return prisma.appointment.findMany({
      where: {
        staffId,
        ...(startDate && endDate && {
          date: {
            gte: startDate,
            lte: endDate,
          },
        }),
      },
      include: {
        customer: true,
        service: true,
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }

  async findByService(serviceId: string) {
    return prisma.appointment.findMany({
      where: { serviceId },
      include: {
        customer: true,
        staff: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findByStatus(status: AppointmentStatus) {
    return prisma.appointment.findMany({
      where: { status },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async findFutureByCustomer(customerId: string) {
    return prisma.appointment.findMany({
      where: {
        customerId,
        date: {
          gte: new Date(),
        },
        status: {
          in: ['scheduled', 'confirmed'],
        },
      },
      include: {
        service: true,
        staff: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async findFutureByStaff(staffId: string) {
    return prisma.appointment.findMany({
      where: {
        staffId,
        date: {
          gte: new Date(),
        },
        status: {
          in: ['scheduled', 'confirmed'],
        },
      },
      include: {
        customer: true,
        service: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async findByConfirmationToken(token: string) {
    return prisma.appointment.findUnique({
      where: { confirmationToken: token },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
    });
  }

  async create(data: Prisma.AppointmentCreateInput): Promise<Appointment> {
    return prisma.appointment.create({
      data,
      include: {
        customer: true,
        service: true,
        staff: true,
      },
    });
  }

  /**
   * Create appointment with conflict check (atomic operation)
   * Prevents race conditions by using transaction with serializable isolation
   */
  async createWithConflictCheck(
    data: Prisma.AppointmentCreateInput,
    staffId: string,
    date: Date,
    startTime: Date,
    endTime: Date
  ): Promise<Appointment> {
    return prisma.$transaction(async (tx) => {
      // Check for conflicts within transaction
      const conflictingAppointments = await tx.appointment.findMany({
        where: {
          staffId,
          date: {
            gte: startOfDay(date),
            lte: endOfDay(date),
          },
          status: {
            in: ['scheduled', 'confirmed'],
          },
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gte: endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } },
              ],
            },
          ],
        },
      });

      if (conflictingAppointments.length > 0) {
        throw new Error('Time slot conflict detected');
      }

      // Create appointment if no conflict
      return tx.appointment.create({
        data,
        include: {
          customer: true,
          service: true,
          staff: true,
        },
      });
    }, {
      isolationLevel: 'Serializable', // Highest isolation level to prevent race conditions
      maxWait: 5000, // 5 seconds max wait
      timeout: 10000, // 10 seconds timeout
    });
  }

  async update(id: string, data: Prisma.AppointmentUpdateInput): Promise<Appointment> {
    return prisma.appointment.update({
      where: { id },
      data,
      include: {
        customer: true,
        service: true,
        staff: true,
      },
    });
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    return this.update(id, { status });
  }

  async confirm(id: string): Promise<Appointment> {
    return this.update(id, {
      status: 'confirmed',
      confirmedAt: new Date(),
    });
  }

  async delete(id: string): Promise<Appointment> {
    return prisma.appointment.delete({
      where: { id },
    });
  }

  /**
   * Check for conflicting appointments
   * (same staff, overlapping time)
   */
  async hasConflict(
    staffId: string,
    date: Date,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<boolean> {
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        staffId,
        date: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
        status: {
          in: ['scheduled', 'confirmed'],
        },
        ...(excludeId && { id: { not: excludeId } }),
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    return conflictingAppointments.length > 0;
  }

  /**
   * Get appointments that need reminders
   */
  async findNeedingReminders(daysBefore: number = 1) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBefore);

    return prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfDay(targetDate),
          lte: endOfDay(targetDate),
        },
        status: {
          in: ['scheduled', 'confirmed'],
        },
        reminderSent: false,
      },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
    });
  }
}

export const appointmentRepository = new AppointmentRepository();
