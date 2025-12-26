import { prisma } from '../lib/prisma.js';
import type { Staff, StaffRole, Prisma } from '@prisma/client';

export class StaffRepository {
  async findAll(): Promise<Staff[]> {
    return prisma.staff.findMany({
      include: {
        role: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });
  }

  async findActive(): Promise<Staff[]> {
    return prisma.staff.findMany({
      where: { isActive: true },
      include: {
        role: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });
  }

  async findById(id: string): Promise<(Staff & { role: StaffRole | null }) | null> {
    return prisma.staff.findUnique({
      where: { id },
      include: {
        role: true,
      },
    });
  }

  async findByEmail(email: string): Promise<Staff | null> {
    return prisma.staff.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.StaffCreateInput): Promise<Staff> {
    return prisma.staff.create({
      data,
      include: {
        role: true,
      },
    });
  }

  async update(id: string, data: Prisma.StaffUpdateInput): Promise<Staff> {
    return prisma.staff.update({
      where: { id },
      data,
      include: {
        role: true,
      },
    });
  }

  async delete(id: string): Promise<Staff> {
    return prisma.staff.delete({
      where: { id },
    });
  }

  async canDelete(id: string): Promise<boolean> {
    const futureAppointments = await prisma.appointment.count({
      where: {
        staffId: id,
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

  async findByIdWithAppointments(id: string) {
    return prisma.staff.findUnique({
      where: { id },
      include: {
        role: true,
        appointments: {
          include: {
            customer: true,
            service: true,
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    });
  }
}

export class StaffRoleRepository {
  async findAll(): Promise<StaffRole[]> {
    return prisma.staffRole.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findActive(): Promise<StaffRole[]> {
    return prisma.staffRole.findMany({
      where: { isActive: true },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: string): Promise<StaffRole | null> {
    return prisma.staffRole.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.StaffRoleCreateInput): Promise<StaffRole> {
    return prisma.staffRole.create({
      data,
    });
  }

  async update(id: string, data: Prisma.StaffRoleUpdateInput): Promise<StaffRole> {
    return prisma.staffRole.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<StaffRole> {
    return prisma.staffRole.delete({
      where: { id },
    });
  }
}

export const staffRepository = new StaffRepository();
export const staffRoleRepository = new StaffRoleRepository();
