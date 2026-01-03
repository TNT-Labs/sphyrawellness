/**
 * WorkManager Service - Battery-optimized background synchronization
 * Replaces react-native-background-actions with native Android WorkManager
 * Respects Doze mode and battery constraints for optimal battery life
 */
import { NativeModules, AppState, AppStateStatus } from 'react-native';
import reminderService from './reminderService';
import { Storage } from '@/utils/storage';
import { STORAGE_KEYS, DEFAULT_SYNC_INTERVAL } from '@/config/api';
import { BatteryOptimizer } from '@/utils/batteryOptimization';
import logger from '@/utils/logger';

const { WorkManagerModule } = NativeModules;

class WorkManagerService {
  private isRunning: boolean = false;
  private appStateSubscription: any = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the service and set up app state listener
   */
  private async initialize() {
    // Listen to app state changes to check for pending syncs
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );

    // Check if there's a pending sync on startup
    await this.checkAndExecutePendingSync();
  }

  /**
   * Handle app state changes
   */
  private async handleAppStateChange(nextAppState: AppStateStatus) {
    if (nextAppState === 'active') {
      // App came to foreground - check for pending syncs
      await this.checkAndExecutePendingSync();
    }
  }

  /**
   * Check if WorkManager triggered a sync while app was in background
   */
  private async checkAndExecutePendingSync() {
    try {
      if (!WorkManagerModule) {
        console.warn('WorkManagerModule not available');
        return;
      }

      const result = await WorkManagerModule.checkPendingSync();

      if (result.hasPendingSync) {
        logger.info('WORKMANAGER', '🔔 Pending sync detected from WorkManager');

        // Execute the sync
        await this.executeSyncNow();

        // Clear the pending flag
        await WorkManagerModule.clearPendingSync();
      }
    } catch (error: any) {
      logger.error('WORKMANAGER', 'Error checking pending sync', {
        error: error.message,
      });
    }
  }

  /**
   * Execute sync immediately (called when app is in foreground)
   */
  private async executeSyncNow() {
    try {
      logger.info('SYNC', '🔄 Executing WorkManager-triggered sync...');

      // Check if we should skip (night hours)
      const skipCheck = await BatteryOptimizer.shouldSkipSync();
      if (skipCheck.skip) {
        logger.info('SYNC', `⏸️ Sync skipped: ${skipCheck.reason}`);
        return;
      }

      // Perform the actual sync
      const result = await reminderService.syncAndSendReminders();

      logger.success('SYNC', '✅ WorkManager sync completed', {
        sent: result.sent,
        failed: result.failed,
        total: result.total,
      });
    } catch (error: any) {
      logger.error('SYNC', 'WorkManager sync failed', {
        error: error.message,
      });
    }
  }

  /**
   * Start periodic sync with WorkManager
   */
  async start(): Promise<void> {
    try {
      if (!WorkManagerModule) {
        throw new Error('WorkManagerModule not available - check native module setup');
      }

      if (this.isRunning) {
        logger.info('WORKMANAGER', 'Background service already running');
        return;
      }

      // Get sync interval (with optimization)
      const baseInterval = await this.getSyncInterval();
      const lastReminderFound = await Storage.get<string>(STORAGE_KEYS.LAST_REMINDER_FOUND);

      const { interval, reason } = await BatteryOptimizer.calculateOptimizedInterval(
        baseInterval,
        lastReminderFound
      );

      logger.info('WORKMANAGER', `🚀 Starting WorkManager sync`, {
        baseInterval,
        optimizedInterval: interval,
        reason,
      });

      // Start WorkManager periodic sync
      await WorkManagerModule.startPeriodicSync(interval);

      this.isRunning = true;

      // Save state
      await Storage.set(STORAGE_KEYS.AUTO_SYNC_ENABLED, true);

      logger.success('WORKMANAGER', '✅ WorkManager service started successfully', {
        interval: `${interval} minutes`,
      });
    } catch (error: any) {
      logger.error('WORKMANAGER', 'Error starting service', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Stop periodic sync
   */
  async stop(): Promise<void> {
    try {
      if (!WorkManagerModule) {
        logger.warn('WORKMANAGER', 'WorkManagerModule not available');
        return;
      }

      if (!this.isRunning) {
        logger.info('WORKMANAGER', 'Background service not running');
        return;
      }

      // Stop WorkManager
      await WorkManagerModule.stopPeriodicSync();

      this.isRunning = false;

      // Save state
      await Storage.set(STORAGE_KEYS.AUTO_SYNC_ENABLED, false);

      logger.info('WORKMANAGER', '⏸️ WorkManager service stopped');
    } catch (error: any) {
      logger.error('WORKMANAGER', 'Error stopping service', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if service is running
   */
  async isServiceRunning(): Promise<boolean> {
    try {
      if (!WorkManagerModule) {
        return false;
      }

      const result = await WorkManagerModule.isSyncRunning();
      this.isRunning = result.isRunning;

      return result.isRunning;
    } catch (error) {
      console.error('Error checking service status:', error);
      return false;
    }
  }

  /**
   * Get current work status
   */
  async getWorkStatus(): Promise<any> {
    try {
      if (!WorkManagerModule) {
        return { state: 'NOT_AVAILABLE' };
      }

      return await WorkManagerModule.getWorkStatus();
    } catch (error) {
      console.error('Error getting work status:', error);
      return { state: 'ERROR' };
    }
  }

  /**
   * Update sync interval (will restart service if running)
   */
  async setSyncInterval(minutes: number): Promise<void> {
    try {
      // Ensure minimum interval (WorkManager constraint)
      if (minutes < 15) {
        minutes = 15;
        logger.warn('WORKMANAGER', 'Interval adjusted to minimum 15 minutes');
      }

      await Storage.set(STORAGE_KEYS.SYNC_INTERVAL, minutes);

      // Restart service if running
      if (this.isRunning) {
        logger.info('WORKMANAGER', `⚙️ Updating interval to ${minutes} minutes...`);
        await this.stop();
        await this.start();
      }

      logger.info('WORKMANAGER', `✅ Sync interval updated to ${minutes} minutes`);
    } catch (error: any) {
      logger.error('WORKMANAGER', 'Error setting sync interval', {
        error: error.message,
      });
      throw error;
    }
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
   * Cleanup when service is destroyed
   */
  cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

export const workManagerService = new WorkManagerService();
export default workManagerService;
