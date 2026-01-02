import cron from 'node-cron';
import reminderService from '../services/reminderServicePrisma.js';
import { prisma } from '../lib/prisma.js';
import logger from '../utils/logger.js';

const DEFAULT_REMINDER_HOUR = 10;
const DEFAULT_REMINDER_MINUTE = 0;

/**
 * Daily reminder cron job with PostgreSQL/Prisma
 * Checks settings and sends reminders at the configured time
 */
export function initializeDailyReminderCron() {
  // Check every minute if it's time to send reminders
  // This allows for dynamic configuration changes
  const job = cron.schedule('* * * * *', async () => {
    try {
      // Get current settings for reminder time
      let reminderHour = DEFAULT_REMINDER_HOUR;
      let reminderMinute = DEFAULT_REMINDER_MINUTE;
      let enableAutoReminders = true;

      try {
        // Try to get reminder hour setting
        const hourSetting = await prisma.setting.findUnique({
          where: { key: 'reminderSendHour' }
        });
        if (hourSetting && typeof hourSetting.value === 'number') {
          reminderHour = hourSetting.value;
        }

        // Try to get reminder minute setting
        const minuteSetting = await prisma.setting.findUnique({
          where: { key: 'reminderSendMinute' }
        });
        if (minuteSetting && typeof minuteSetting.value === 'number') {
          reminderMinute = minuteSetting.value;
        }

        // Try to get enableAutoReminders setting
        const enableSetting = await prisma.setting.findUnique({
          where: { key: 'enableAutoReminders' }
        });
        if (enableSetting && typeof enableSetting.value === 'boolean') {
          enableAutoReminders = enableSetting.value;
        }
      } catch (error) {
        // Use defaults if settings don't exist or can't be read
        logger.warn('Could not load reminder settings, using defaults', {
          reminderHour: DEFAULT_REMINDER_HOUR,
          reminderMinute: DEFAULT_REMINDER_MINUTE
        });
      }

      // Check if auto reminders are enabled
      if (!enableAutoReminders) {
        return;
      }

      // Get current time
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Check if it's time to send reminders
      if (currentHour === reminderHour && currentMinute === reminderMinute) {
        logger.info('Daily reminder time reached', {
          time: `${currentHour}:${String(currentMinute).padStart(2, '0')}`,
          reminderHour,
          reminderMinute
        });

        const result = await reminderService.sendAllDueReminders();

        logger.info('Daily reminder job completed', {
          total: result.total,
          sent: result.sent,
          failed: result.failed
        });
      }
    } catch (error) {
      logger.error('Error in daily reminder cron job', error);
    }
  });

  logger.info('Daily reminder cron job initialized', {
    checkInterval: 'every minute',
    defaultHour: DEFAULT_REMINDER_HOUR,
    defaultMinute: DEFAULT_REMINDER_MINUTE
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
