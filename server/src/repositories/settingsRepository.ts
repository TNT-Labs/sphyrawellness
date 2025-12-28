import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  enabled: boolean;
  type: 'continuous' | 'split';
  morning: TimeSlot;
  afternoon?: TimeSlot;
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string;
}

const BUSINESS_HOURS_KEY = 'business_hours';

// Default business hours: Monday-Friday 9:00-13:00 + 15:00-19:00, Saturday 9:00-13:00, Sunday closed
const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { enabled: true, type: 'split', morning: { start: '09:00', end: '13:00' }, afternoon: { start: '15:00', end: '19:00' } },
  tuesday: { enabled: true, type: 'split', morning: { start: '09:00', end: '13:00' }, afternoon: { start: '15:00', end: '19:00' } },
  wednesday: { enabled: true, type: 'split', morning: { start: '09:00', end: '13:00' }, afternoon: { start: '15:00', end: '19:00' } },
  thursday: { enabled: true, type: 'split', morning: { start: '09:00', end: '13:00' }, afternoon: { start: '15:00', end: '19:00' } },
  friday: { enabled: true, type: 'split', morning: { start: '09:00', end: '13:00' }, afternoon: { start: '15:00', end: '19:00' } },
  saturday: { enabled: true, type: 'continuous', morning: { start: '09:00', end: '13:00' } },
  sunday: { enabled: false, type: 'continuous', morning: { start: '09:00', end: '13:00' } },
};

/**
 * Get business hours from database
 * Returns default hours if not found
 */
export async function getBusinessHours(): Promise<BusinessHours> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: BUSINESS_HOURS_KEY },
    });

    if (!setting) {
      logger.log('Business hours not found in database, returning defaults');
      return DEFAULT_BUSINESS_HOURS;
    }

    return setting.value as BusinessHours;
  } catch (error) {
    logger.error('Error fetching business hours:', error);
    return DEFAULT_BUSINESS_HOURS;
  }
}

/**
 * Update business hours in database
 * Creates setting if it doesn't exist
 */
export async function updateBusinessHours(businessHours: BusinessHours, userId?: string): Promise<BusinessHours> {
  try {
    const setting = await prisma.setting.upsert({
      where: { key: BUSINESS_HOURS_KEY },
      update: {
        value: businessHours as any, // Prisma expects any for Json type
        updatedBy: userId,
      },
      create: {
        key: BUSINESS_HOURS_KEY,
        value: businessHours as any,
        updatedBy: userId,
      },
    });

    logger.log('Business hours updated successfully');
    return setting.value as BusinessHours;
  } catch (error) {
    logger.error('Error updating business hours:', error);
    throw new Error('Failed to update business hours');
  }
}

/**
 * Initialize business hours with defaults if not present
 */
export async function initializeBusinessHours(): Promise<void> {
  try {
    const existing = await prisma.setting.findUnique({
      where: { key: BUSINESS_HOURS_KEY },
    });

    if (!existing) {
      await prisma.setting.create({
        data: {
          key: BUSINESS_HOURS_KEY,
          value: DEFAULT_BUSINESS_HOURS as any,
        },
      });
      logger.log('Business hours initialized with defaults');
    }
  } catch (error) {
    logger.error('Error initializing business hours:', error);
  }
}

export const settingsRepository = {
  getBusinessHours,
  updateBusinessHours,
  initializeBusinessHours,
};
