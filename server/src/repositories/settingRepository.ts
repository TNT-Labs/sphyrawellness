import { prisma } from '../lib/prisma.js';
import type { Setting, Prisma } from '@prisma/client';

export class SettingRepository {
  async findAll(): Promise<Setting[]> {
    return prisma.setting.findMany({
      orderBy: {
        key: 'asc',
      },
    });
  }

  async findByKey(key: string): Promise<Setting | null> {
    return prisma.setting.findUnique({
      where: { key },
    });
  }

  async getValue<T = any>(key: string, defaultValue?: T): Promise<T | null> {
    const setting = await this.findByKey(key);

    if (!setting) {
      return defaultValue ?? null;
    }

    return setting.value as T;
  }

  async create(data: Prisma.SettingCreateInput): Promise<Setting> {
    return prisma.setting.create({
      data,
    });
  }

  async upsert(key: string, value: any, updatedBy?: string): Promise<Setting> {
    return prisma.setting.upsert({
      where: { key },
      create: {
        key,
        value,
        updatedBy,
      },
      update: {
        value,
        updatedBy,
        updatedAt: new Date(),
      },
    });
  }

  async update(key: string, value: any, updatedBy?: string): Promise<Setting> {
    return prisma.setting.update({
      where: { key },
      data: {
        value,
        updatedBy,
        updatedAt: new Date(),
      },
    });
  }

  async delete(key: string): Promise<Setting> {
    return prisma.setting.delete({
      where: { key },
    });
  }

  /**
   * Get all settings as key-value object
   */
  async getAllAsObject(): Promise<Record<string, any>> {
    const settings = await this.findAll();

    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Bulk update settings
   */
  async bulkUpdate(
    settings: Array<{ key: string; value: any }>,
    updatedBy?: string
  ): Promise<Setting[]> {
    return Promise.all(
      settings.map((setting) => this.upsert(setting.key, setting.value, updatedBy))
    );
  }
}

export const settingRepository = new SettingRepository();
