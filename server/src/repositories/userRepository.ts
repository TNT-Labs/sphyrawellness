import { prisma } from '../lib/prisma.js';
import type { User, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

export class UserRepository {
  async findAll(): Promise<User[]> {
    return prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findActive(): Promise<User[]> {
    return prisma.user.findMany({
      where: { isActive: true },
      orderBy: {
        username: 'asc',
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  async create(
    data: Omit<Prisma.UserCreateInput, 'passwordHash'> & { password: string }
  ): Promise<User> {
    const { password, ...userData } = data;
    const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS) || 12);

    return prisma.user.create({
      data: {
        ...userData,
        passwordHash,
      },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async updatePassword(id: string, newPassword: string): Promise<User> {
    const passwordHash = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_ROUNDS) || 12);

    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async updateLastLogin(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  /**
   * Authenticate user by username and password
   */
  async authenticate(username: string, password: string): Promise<User | null> {
    const user = await this.findByUsername(username);

    if (!user || !user.isActive) {
      return null;
    }

    const isValid = await this.verifyPassword(user, password);

    if (!isValid) {
      return null;
    }

    // Update last login
    await this.updateLastLogin(user.id);

    return user;
  }
}

export const userRepository = new UserRepository();
