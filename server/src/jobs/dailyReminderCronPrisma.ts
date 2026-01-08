import cron from 'node-cron';
import reminderService from '../services/reminderServicePrisma.js';
import { prisma } from '../lib/prisma.js';
import logger from '../utils/logger.js';
import os from 'os';

const DEFAULT_REMINDER_HOUR = 10;
const DEFAULT_REMINDER_MINUTE = 0;
const SETTINGS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const JOB_NAME = 'daily_reminder_job';

// Instance identifier for distributed locking
const INSTANCE_ID = `${os.hostname()}-${process.pid}-${Date.now()}`;

/**
 * Cached settings to avoid database queries every minute
 */
interface CachedSettings {
  reminderHour: number;
  reminderMinute: number;
  enableAutoReminders: boolean;
  lastRefreshed: number;
}

let settingsCache: CachedSettings | null = null;

/**
 * Load settings from database and cache them
 */
async function loadSettings(): Promise<CachedSettings> {
  try {
    const [hourSetting, minuteSetting, enableSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'reminderSendHour' } }),
      prisma.setting.findUnique({ where: { key: 'reminderSendMinute' } }),
      prisma.setting.findUnique({ where: { key: 'enableAutoReminders' } }),
    ]);

    const settings: CachedSettings = {
      reminderHour: (hourSetting && typeof hourSetting.value === 'number')
        ? hourSetting.value
        : DEFAULT_REMINDER_HOUR,
      reminderMinute: (minuteSetting && typeof minuteSetting.value === 'number')
        ? minuteSetting.value
        : DEFAULT_REMINDER_MINUTE,
      enableAutoReminders: (enableSetting && typeof enableSetting.value === 'boolean')
        ? enableSetting.value
        : true,
      lastRefreshed: Date.now(),
    };

    logger.debug('Settings loaded and cached', {
      reminderHour: settings.reminderHour,
      reminderMinute: settings.reminderMinute,
      enableAutoReminders: settings.enableAutoReminders,
    });

    return settings;
  } catch (error) {
    logger.warn('Could not load reminder settings, using defaults', {
      reminderHour: DEFAULT_REMINDER_HOUR,
      reminderMinute: DEFAULT_REMINDER_MINUTE,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      reminderHour: DEFAULT_REMINDER_HOUR,
      reminderMinute: DEFAULT_REMINDER_MINUTE,
      enableAutoReminders: true,
      lastRefreshed: Date.now(),
    };
  }
}

/**
 * Get settings from cache or refresh if expired
 */
async function getSettings(): Promise<CachedSettings> {
  const now = Date.now();

  // Return cached settings if still valid
  if (settingsCache && (now - settingsCache.lastRefreshed) < SETTINGS_CACHE_TTL) {
    return settingsCache;
  }

  // Refresh cache
  settingsCache = await loadSettings();
  return settingsCache;
}

/**
 * Acquire distributed lock for the job
 * Returns true if lock acquired, false otherwise
 */
async function acquireLock(): Promise<boolean> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOCK_TIMEOUT);

    // Try to create a new lock or update expired lock
    const result = await prisma.$transaction(async (tx) => {
      // Find existing lock
      const existingLock = await tx.cronLock.findUnique({
        where: { jobName: JOB_NAME },
      });

      // If no lock exists, create one
      if (!existingLock) {
        await tx.cronLock.create({
          data: {
            jobName: JOB_NAME,
            lockedAt: now,
            lockedBy: INSTANCE_ID,
            expiresAt,
          },
        });
        return true;
      }

      // If lock exists but expired, acquire it
      if (existingLock.expiresAt < now) {
        await tx.cronLock.update({
          where: { jobName: JOB_NAME },
          data: {
            lockedAt: now,
            lockedBy: INSTANCE_ID,
            expiresAt,
          },
        });
        return true;
      }

      // Lock is held by another instance
      return false;
    });

    if (result) {
      logger.debug('Lock acquired', { jobName: JOB_NAME, instanceId: INSTANCE_ID });
    } else {
      logger.debug('Lock already held by another instance', { jobName: JOB_NAME });
    }

    return result;
  } catch (error) {
    logger.error('Error acquiring lock', error, { jobName: JOB_NAME });
    return false;
  }
}

/**
 * Release the lock and update last run time
 */
async function releaseLock(): Promise<void> {
  try {
    await prisma.cronLock.update({
      where: { jobName: JOB_NAME },
      data: {
        expiresAt: new Date(), // Expire immediately
        lastRunAt: new Date(),
      },
    });

    logger.debug('Lock released', { jobName: JOB_NAME, instanceId: INSTANCE_ID });
  } catch (error) {
    logger.error('Error releasing lock', error, { jobName: JOB_NAME });
  }
}

/**
 * Check if the job has already run in the current minute
 */
async function hasRunThisMinute(reminderHour: number, reminderMinute: number): Promise<boolean> {
  try {
    const lock = await prisma.cronLock.findUnique({
      where: { jobName: JOB_NAME },
    });

    if (!lock || !lock.lastRunAt) {
      return false;
    }

    // Check if last run was in the current hour and minute
    const lastRun = new Date(lock.lastRunAt);
    const now = new Date();

    return (
      lastRun.getFullYear() === now.getFullYear() &&
      lastRun.getMonth() === now.getMonth() &&
      lastRun.getDate() === now.getDate() &&
      lastRun.getHours() === reminderHour &&
      lastRun.getMinutes() === reminderMinute
    );
  } catch (error) {
    logger.error('Error checking last run time', error);
    return false;
  }
}

/**
 * Daily reminder cron job with PostgreSQL/Prisma
 * Optimized with settings cache and distributed locking
 */
export function initializeDailyReminderCron() {
  // Check every minute with cached settings (efficient)
  const job = cron.schedule('* * * * *', async () => {
    try {
      // Get settings from cache (no DB query if cache valid)
      const settings = await getSettings();

      // Check if auto reminders are enabled
      if (!settings.enableAutoReminders) {
        return;
      }

      // Get current time
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Check if it's time to send reminders
      if (currentHour !== settings.reminderHour || currentMinute !== settings.reminderMinute) {
        return;
      }

      // Check if already run this minute
      if (await hasRunThisMinute(settings.reminderHour, settings.reminderMinute)) {
        logger.debug('Reminder job already ran this minute, skipping');
        return;
      }

      logger.info('Daily reminder time reached', {
        time: `${currentHour}:${String(currentMinute).padStart(2, '0')}`,
        reminderHour: settings.reminderHour,
        reminderMinute: settings.reminderMinute,
      });

      // Try to acquire distributed lock
      const lockAcquired = await acquireLock();
      if (!lockAcquired) {
        logger.info('Could not acquire lock, another instance is running the job');
        return;
      }

      try {
        // Send reminders
        const result = await reminderService.sendAllDueReminders();

        logger.info('Daily reminder job completed', {
          total: result.total,
          sent: result.sent,
          failed: result.failed,
          instanceId: INSTANCE_ID,
        });
      } finally {
        // Always release lock
        await releaseLock();
      }
    } catch (error) {
      logger.error('Error in daily reminder cron job', error);
      // Try to release lock on error
      try {
        await releaseLock();
      } catch (releaseError) {
        logger.error('Error releasing lock after job failure', releaseError);
      }
    }
  });

  logger.info('Daily reminder cron job initialized (optimized)', {
    checkInterval: 'every minute (with cached settings)',
    settingsCacheTTL: `${SETTINGS_CACHE_TTL / 1000}s`,
    lockTimeout: `${LOCK_TIMEOUT / 1000}s`,
    defaultHour: DEFAULT_REMINDER_HOUR,
    defaultMinute: DEFAULT_REMINDER_MINUTE,
    instanceId: INSTANCE_ID,
  });

  return job;
}

/**
 * Manual trigger for testing
 */
export async function triggerReminderJobManually() {
  logger.info('Manual reminder trigger activated');
  const result = await reminderService.sendAllDueReminders();
  logger.info('Manual reminder job completed', result);
  return result;
}

/**
 * Force refresh settings cache (useful for testing or after settings update)
 */
export async function refreshSettingsCache(): Promise<void> {
  logger.info('Forcing settings cache refresh');
  settingsCache = await loadSettings();
}
