/**
 * Background Service - Automatic reminder synchronization
 * Runs periodically in the background even when app is closed
 */
import BackgroundService from 'react-native-background-actions';
import reminderService from './reminderService';
import { Storage } from '@/utils/storage';
import { STORAGE_KEYS, DEFAULT_SYNC_INTERVAL } from '@/config/api';
import { BatteryOptimizer } from '@/utils/batteryOptimization';

// Sleep function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Background task options
const options = {
  taskName: 'Sphyra SMS Reminder Sync',
  taskTitle: 'Sincronizzazione Reminder',
  taskDesc: 'Invio automatico SMS reminder',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#db2777', // Sphyra pink
  linkingURI: 'sphyrasms://',
  parameters: {
    delay: 60000, // 1 minute (will be overridden by actual interval)
  },
};

class BackgroundServiceManager {
  private isRunning: boolean = false;

  /**
   * Background task that runs periodically with battery optimization
   */
  private async backgroundTask(taskData: any): Promise<void> {
    try {
      await new Promise(async (resolve) => {
        console.log('Background service started with battery optimization');

        // Infinite loop
        while (BackgroundService.isRunning()) {
          // Get base interval from storage
          const baseInterval = await this.getSyncInterval();

          // Check if we should skip this sync (deep sleep hours)
          const skipCheck = await BatteryOptimizer.shouldSkipSync();
          if (skipCheck.skip) {
            console.log(`⏭️  Skipping sync: ${skipCheck.reason}`);
            await BackgroundService.updateNotification({
              taskDesc: `Pausa: ${skipCheck.reason}`,
            });
            // Wait 30 minutes before checking again
            await sleep(30 * 60 * 1000);
            continue;
          }

          // Get last reminder found timestamp for adaptive intervals
          const lastReminderFound = await Storage.get<string>(STORAGE_KEYS.LAST_REMINDER_FOUND);

          // Calculate optimized interval based on battery, time, etc.
          const { interval: optimizedInterval, reason } =
            await BatteryOptimizer.calculateOptimizedInterval(baseInterval, lastReminderFound);

          BatteryOptimizer.logOptimization(baseInterval, optimizedInterval, reason);

          console.log('Background sync starting...');

          try {
            // Perform sync
            const result = await reminderService.syncAndSendReminders();
            console.log(
              `Background sync complete: ${result.sent} sent, ${result.failed} failed`
            );

            // Update notification with sync results
            await BackgroundService.updateNotification({
              taskDesc: `✅ Ultimo sync: ${result.sent} inviati, ${result.failed} falliti`,
            });
          } catch (error) {
            console.error('Background sync error:', error);

            await BackgroundService.updateNotification({
              taskDesc: '❌ Errore durante la sincronizzazione',
            });
          }

          // Wait for optimized interval (not fixed interval)
          const intervalMs = optimizedInterval * 60 * 1000;
          console.log(`⏰ Next sync in ${optimizedInterval} minutes`);
          await sleep(intervalMs);
        }

        resolve(undefined);
      });
    } catch (error) {
      console.error('Background task error:', error);
    }
  }

  /**
   * Start background service
   */
  async start(): Promise<void> {
    try {
      if (this.isRunning) {
        console.log('Background service already running');
        return;
      }

      // Get interval
      const intervalMinutes = await this.getSyncInterval();

      // Update options with current interval
      const taskOptions = {
        ...options,
        parameters: {
          delay: intervalMinutes * 60 * 1000,
        },
      };

      await BackgroundService.start(
        this.backgroundTask.bind(this),
        taskOptions
      );

      this.isRunning = true;
      console.log('Background service started successfully');

      // Save state
      await Storage.set(STORAGE_KEYS.AUTO_SYNC_ENABLED, true);
    } catch (error) {
      console.error('Error starting background service:', error);
      throw error;
    }
  }

  /**
   * Stop background service
   */
  async stop(): Promise<void> {
    try {
      if (!this.isRunning) {
        console.log('Background service not running');
        return;
      }

      await BackgroundService.stop();
      this.isRunning = false;
      console.log('Background service stopped');

      // Save state
      await Storage.set(STORAGE_KEYS.AUTO_SYNC_ENABLED, false);
    } catch (error) {
      console.error('Error stopping background service:', error);
      throw error;
    }
  }

  /**
   * Check if background service is running
   */
  async isServiceRunning(): Promise<boolean> {
    return BackgroundService.isRunning();
  }

  /**
   * Get sync interval from storage
   */
  private async getSyncInterval(): Promise<number> {
    try {
      const interval = await Storage.get<number>(STORAGE_KEYS.SYNC_INTERVAL);
      return interval || DEFAULT_SYNC_INTERVAL;
    } catch (error) {
      console.error('Error getting sync interval:', error);
      return DEFAULT_SYNC_INTERVAL;
    }
  }

  /**
   * Update sync interval
   */
  async setSyncInterval(minutes: number): Promise<void> {
    try {
      await Storage.set(STORAGE_KEYS.SYNC_INTERVAL, minutes);

      // Restart service if running
      if (this.isRunning) {
        await this.stop();
        await this.start();
      }

      console.log(`Sync interval updated to ${minutes} minutes`);
    } catch (error) {
      console.error('Error setting sync interval:', error);
      throw error;
    }
  }
}

export const backgroundServiceManager = new BackgroundServiceManager();
export default backgroundServiceManager;
