/**
 * Reminder Service - Manages reminder synchronization with backend
 */
import apiClient from './apiClient';
import smsService from './smsService';
import { Storage } from '@/utils/storage';
import { STORAGE_KEYS, ENDPOINTS } from '@/config/api';
import type { PendingReminder, SyncResult, SMSResult } from '@/types';

class ReminderService {
  /**
   * Fetch pending reminders from backend
   */
  async fetchPendingReminders(): Promise<PendingReminder[]> {
    try {
      console.log('Fetching pending reminders from backend...');
      const reminders = await apiClient.get<PendingReminder[]>(
        ENDPOINTS.PENDING_REMINDERS
      );
      console.log(`Fetched ${reminders.length} pending reminders`);
      return reminders;
    } catch (error: any) {
      console.error('Error fetching pending reminders:', error);
      throw new Error('Impossibile recuperare i reminder dal server');
    }
  }

  /**
   * Mark reminder as sent on backend
   */
  async markReminderSent(appointmentId: string): Promise<void> {
    try {
      await apiClient.post(ENDPOINTS.MARK_SENT, { appointmentId });
      console.log(`Reminder marked as sent for appointment ${appointmentId}`);
    } catch (error) {
      console.error('Error marking reminder as sent:', error);
      throw error;
    }
  }

  /**
   * Mark reminder as failed on backend
   */
  async markReminderFailed(
    appointmentId: string,
    errorMessage: string
  ): Promise<void> {
    try {
      await apiClient.post(ENDPOINTS.MARK_FAILED, {
        appointmentId,
        errorMessage,
      });
      console.log(`Reminder marked as failed for appointment ${appointmentId}`);
    } catch (error) {
      console.error('Error marking reminder as failed:', error);
      // Don't throw - this is a non-critical error
    }
  }

  /**
   * Synchronize and send all pending reminders
   */
  async syncAndSendReminders(): Promise<SyncResult> {
    try {
      console.log('Starting reminder synchronization...');

      // 1. Fetch pending reminders
      const pendingReminders = await this.fetchPendingReminders();

      if (pendingReminders.length === 0) {
        console.log('No pending reminders to send');
        await this.updateLastSync();
        return { total: 0, sent: 0, failed: 0, results: [] };
      }

      // 2. Send SMS for each reminder
      const results: SMSResult[] = [];
      let sent = 0;
      let failed = 0;

      for (const reminder of pendingReminders) {
        console.log(
          `Sending reminder for appointment ${reminder.appointment.id}...`
        );

        const result = await smsService.sendReminderSMS(reminder);
        results.push(result);

        // 3. Update backend based on result
        if (result.success) {
          await this.markReminderSent(result.appointmentId);
          sent++;
        } else {
          await this.markReminderFailed(
            result.appointmentId,
            result.error || 'Unknown error'
          );
          failed++;
        }

        // Small delay between SMS
        await this.delay(1000);
      }

      // 4. Update last sync time
      await this.updateLastSync();

      console.log(
        `Sync complete: ${sent} sent, ${failed} failed out of ${pendingReminders.length} total`
      );

      return {
        total: pendingReminders.length,
        sent,
        failed,
        results,
      };
    } catch (error: any) {
      console.error('Error during sync:', error);
      throw error;
    }
  }

  /**
   * Update last sync timestamp
   */
  private async updateLastSync(): Promise<void> {
    try {
      const now = new Date();
      await Storage.set(STORAGE_KEYS.LAST_SYNC, now.toISOString());
    } catch (error) {
      console.error('Error updating last sync:', error);
    }
  }

  /**
   * Get last sync timestamp
   */
  async getLastSync(): Promise<Date | null> {
    try {
      const lastSyncStr = await Storage.get<string>(STORAGE_KEYS.LAST_SYNC);
      return lastSyncStr ? new Date(lastSyncStr) : null;
    } catch (error) {
      console.error('Error getting last sync:', error);
      return null;
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const reminderService = new ReminderService();
export default reminderService;
