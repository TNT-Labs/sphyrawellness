import { prisma } from '../lib/prisma.js';
import type { Payment, Prisma } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

export class PaymentRepository {
  async findAll(): Promise<Payment[]> {
    return prisma.payment.findMany({
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
      },
    });
  }

  async findByAppointment(appointmentId: string): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { appointmentId },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findByDateRange(startDate: Date, endDate: Date) {
    return prisma.payment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findByDate(date: Date) {
    return this.findByDateRange(startOfDay(date), endOfDay(date));
  }

  async create(data: Prisma.PaymentCreateInput): Promise<Payment> {
    return prisma.payment.create({
      data,
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
      },
    });
  }

  async update(id: string, data: Prisma.PaymentUpdateInput): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data,
      include: {
        appointment: {
          include: {
            customer: true,
            service: true,
          },
        },
      },
    });
  }

  async delete(id: string): Promise<Payment> {
    return prisma.payment.delete({
      where: { id },
    });
  }

  /**
   * Get total revenue for a date range (excludes refunded payments)
   */
  async getTotalRevenue(startDate: Date, endDate: Date): Promise<number> {
    const result = await prisma.payment.aggregate({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: 'paid', // Only count paid payments, exclude refunded
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount || 0);
  }

  /**
   * Get revenue by payment method (excludes refunded payments)
   */
  async getRevenueByMethod(startDate: Date, endDate: Date) {
    return prisma.payment.groupBy({
      by: ['method'],
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: 'paid', // Only count paid payments, exclude refunded
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });
  }
}

export const paymentRepository = new PaymentRepository();
