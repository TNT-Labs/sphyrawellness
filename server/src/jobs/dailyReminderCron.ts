import cron from 'node-cron';
import reminderService from '../services/reminderService.js';
import db from '../config/database.js';
import type { Settings } from '../types/index.js';

const DEFAULT_SETTINGS_ID = 'app-settings';

/**
 * Daily reminder cron job
 * Checks settings and sends reminders at the configured time
 */
export function initializeDailyReminderCron() {
  // Check every minute if it's time to send reminders
  // This allows for dynamic configuration changes
  const job = cron.schedule('* * * * *', async () => {
    try {
      // Get current settings
      let settings: Settings;
      try {
        settings = await db.settings.get(DEFAULT_SETTINGS_ID) as Settings;
      } catch (error: any) {
        // Use defaults if settings don't exist
        settings = {
          id: DEFAULT_SETTINGS_ID,
          reminderSendHour: 10,
          reminderSendMinute: 0,
          enableAutoReminders: true,
          reminderDaysBefore: 1
        };
      }

      // Check if auto reminders are enabled
      if (!settings.enableAutoReminders) {
        return;
      }

      // Get current time
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Check if it's time to send reminders
      if (
        currentHour === settings.reminderSendHour &&
        currentMinute === settings.reminderSendMinute
      ) {
        console.log(`⏰ Daily reminder time reached: ${currentHour}:${String(currentMinute).padStart(2, '0')}`);
        console.log('📧 Starting to send daily reminders...');

        const result = await reminderService.sendAllDueReminders();

        console.log(`✅ Daily reminder job completed:`);
        console.log(`   - Total appointments: ${result.total}`);
        console.log(`   - Successfully sent: ${result.sent}`);
        console.log(`   - Failed: ${result.failed}`);
      }
    } catch (error) {
      console.error('❌ Error in daily reminder cron job:', error);
    }
  });

  console.log('✅ Daily reminder cron job initialized (checking every minute)');

  return job;
}

/**
 * Manual trigger for testing
 */
export async function triggerReminderJobManually() {
  console.log('🔧 Manual reminder trigger activated');
  const result = await reminderService.sendAllDueReminders();
  console.log('✅ Manual reminder job completed:', result);
  return result;
}
