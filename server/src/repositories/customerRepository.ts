import { prisma } from '../lib/prisma.js';
import type { Customer, Prisma } from '@prisma/client';

export class CustomerRepository {
  /**
   * Get all customers
   */
  async findAll(): Promise<Customer[]> {
    return prisma.customer.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get customer by ID
   */
  async findById(id: string): Promise<Customer | null> {
    return prisma.customer.findUnique({
      where: { id },
    });
  }

  /**
   * Get customer by email
   */
  async findByEmail(email: string): Promise<Customer | null> {
    return prisma.customer.findUnique({
      where: { email },
    });
  }

  /**
   * Get customer by phone
   */
  async findByPhone(phone: string): Promise<Customer | null> {
    return prisma.customer.findUnique({
      where: { phone },
    });
  }

  /**
   * Create new customer
   */
  async create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return prisma.customer.create({
      data,
    });
  }

  /**
   * Update customer
   */
  async update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    return prisma.customer.update({
      where: { id },
      data,
    });
  }

  /**
   * Update customer consents
   */
  async updateConsents(
    id: string,
    consents: Partial<{
      privacyConsent: boolean;
      emailReminderConsent: boolean;
      smsReminderConsent: boolean;
      healthDataConsent: boolean;
      marketingConsent: boolean;
    }>
  ): Promise<Customer> {
    const now = new Date();
    const updateData: Prisma.CustomerUpdateInput = {};

    if (consents.privacyConsent !== undefined) {
      updateData.privacyConsent = consents.privacyConsent;
      if (consents.privacyConsent) {
        updateData.privacyConsentDate = now;
      }
    }

    if (consents.emailReminderConsent !== undefined) {
      updateData.emailReminderConsent = consents.emailReminderConsent;
      if (consents.emailReminderConsent) {
        updateData.emailReminderConsentDate = now;
      }
    }

    if (consents.smsReminderConsent !== undefined) {
      updateData.smsReminderConsent = consents.smsReminderConsent;
      if (consents.smsReminderConsent) {
        updateData.smsReminderConsentDate = now;
      }
    }

    if (consents.healthDataConsent !== undefined) {
      updateData.healthDataConsent = consents.healthDataConsent;
      if (consents.healthDataConsent) {
        updateData.healthDataConsentDate = now;
      }
    }

    if (consents.marketingConsent !== undefined) {
      updateData.marketingConsent = consents.marketingConsent;
    }

    return this.update(id, updateData);
  }

  /**
   * Delete customer (soft delete by setting inactive or hard delete)
   */
  async delete(id: string): Promise<Customer> {
    return prisma.customer.delete({
      where: { id },
    });
  }

  /**
   * Check if customer can be deleted (no future appointments)
   */
  async canDelete(id: string): Promise<boolean> {
    const futureAppointments = await prisma.appointment.count({
      where: {
        customerId: id,
        date: {
          gte: new Date(),
        },
        status: {
          in: ['scheduled', 'confirmed'],
        },
      },
    });

    return futureAppointments === 0;
  }

  /**
   * Get customer with appointments
   */
  async findByIdWithAppointments(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        appointments: {
          include: {
            service: true,
            staff: true,
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    });
  }

  /**
   * Search customers by name, email, or phone
   */
  async search(query: string): Promise<Customer[]> {
    return prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export const customerRepository = new CustomerRepository();
