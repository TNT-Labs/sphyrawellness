import { prisma } from '../lib/prisma.js';
import type { Service, ServiceCategory, Prisma } from '@prisma/client';

export class ServiceRepository {
  async findAll(): Promise<(Service & { category: ServiceCategory | null })[]> {
    return prisma.service.findMany({
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: string): Promise<(Service & { category: ServiceCategory | null }) | null> {
    return prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  async findByCategory(categoryId: string): Promise<Service[]> {
    return prisma.service.findMany({
      where: { categoryId },
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async create(data: Prisma.ServiceCreateInput): Promise<Service> {
    return prisma.service.create({
      data,
      include: {
        category: true,
      },
    });
  }

  async update(id: string, data: Prisma.ServiceUpdateInput): Promise<Service> {
    return prisma.service.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  async delete(id: string): Promise<Service> {
    return prisma.service.delete({
      where: { id },
    });
  }

  async canDelete(id: string): Promise<boolean> {
    const futureAppointments = await prisma.appointment.count({
      where: {
        serviceId: id,
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
}

export class ServiceCategoryRepository {
  async findAll(): Promise<ServiceCategory[]> {
    return prisma.serviceCategory.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findActive(): Promise<ServiceCategory[]> {
    return prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: string): Promise<ServiceCategory | null> {
    return prisma.serviceCategory.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.ServiceCategoryCreateInput): Promise<ServiceCategory> {
    return prisma.serviceCategory.create({
      data,
    });
  }

  async update(id: string, data: Prisma.ServiceCategoryUpdateInput): Promise<ServiceCategory> {
    return prisma.serviceCategory.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<ServiceCategory> {
    return prisma.serviceCategory.delete({
      where: { id },
    });
  }
}

export const serviceRepository = new ServiceRepository();
export const serviceCategoryRepository = new ServiceCategoryRepository();
