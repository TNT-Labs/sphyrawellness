/**
 * Reminder Service - Manages reminder synchronization with backend
 */
import apiClient from './apiClient';
import smsService from './smsService';
import { Storage } from '@/utils/storage';
import { STORAGE_KEYS, ENDPOINTS } from '@/config/api';
import logger from '@/utils/logger';
import { retryWithBackoff, NETWORK_RETRY_OPTIONS, CRITICAL_RETRY_OPTIONS } from '@/utils/retry';
import type { PendingReminder, SyncResult, SMSResult } from '@/types';

class ReminderService {
  /**
   * Fetch pending reminders from backend with retry logic
   */
  async fetchPendingReminders(): Promise<PendingReminder[]> {
    return retryWithBackoff(
      async () => {
        try {
          logger.info('SYNC', 'Fetching pending reminders from backend...');
          // Add timestamp to force cache bypass
          const timestamp = new Date().getTime();
          const reminders = await apiClient.get<PendingReminder[]>(
            `${ENDPOINTS.PENDING_REMINDERS}?_t=${timestamp}`
          );
          logger.success('SYNC', `Fetched ${reminders.length} pending reminders`, {
            count: reminders.length,
            reminders: reminders.map(r => ({
              appointmentId: r.appointment.id,
              customerName: r.appointment.customer.name,
              customerPhone: r.appointment.customer.phone,
              appointmentDate: r.appointment.appointmentDate,
            })),
          });
          return reminders;
        } catch (error: any) {
          logger.error('SYNC', 'Error fetching pending reminders', {
            error: error.message,
            stack: error.stack,
            response: error.response?.data,
          });
          throw error; // Let retry logic handle it
        }
      },
      CRITICAL_RETRY_OPTIONS
    ).catch((error) => {
      throw new Error('Impossibile recuperare i reminder dal server dopo diversi tentativi');
    });
  }

  /**
   * Mark reminder as sent on backend with retry logic
   * Non-blocking: fires and forgets to avoid UI freezing
   */
  async markReminderSent(appointmentId: string): Promise<void> {
    // Fire and forget - don't await, don't block
    retryWithBackoff(
      async () => {
        await apiClient.post(ENDPOINTS.MARK_SENT, { appointmentId });
        console.log(`✅ Reminder marked as sent for appointment ${appointmentId}`);
      },
      {
        maxAttempts: 2, // Only 2 attempts for non-critical operation
        initialDelayMs: 500,
        maxDelayMs: 2000,
        backoffMultiplier: 2,
        shouldRetry: (error: any) => {
          // Don't retry on client errors (4xx)
          const status = error.response?.status;
          if (status >= 400 && status < 500) {
            return false;
          }
          return true;
        }
      }
    ).catch((error) => {
      console.error('⚠️ Failed to mark reminder as sent:', error.message);
      // Don't throw - SMS was already sent successfully
    });
  }

  /**
   * Mark reminder as failed on backend with retry logic
   * Non-blocking: fires and forgets
   */
  async markReminderFailed(
    appointmentId: string,
    errorMessage: string
  ): Promise<void> {
    // Fire and forget - don't await, don't block
    retryWithBackoff(
      async () => {
        await apiClient.post(ENDPOINTS.MARK_FAILED, {
          appointmentId,
          errorMessage,
        });
        console.log(`✅ Reminder marked as failed for appointment ${appointmentId}`);
      },
      {
        maxAttempts: 2,
        initialDelayMs: 500,
        maxDelayMs: 2000,
        backoffMultiplier: 2,
        shouldRetry: (error: any) => {
          const status = error.response?.status;
          if (status >= 400 && status < 500) {
            return false;
          }
          return true;
        }
      }
    ).catch((error) => {
      console.error('⚠️ Failed to mark reminder as failed:', error.message);
      // Don't throw - this is non-critical
    });
  }

  /**
   * Synchronize and send all pending reminders
   */
  async syncAndSendReminders(): Promise<SyncResult> {
    try {
      logger.info('SYNC', '🔄 Starting reminder synchronization...');

      // 1. Fetch pending reminders
      const pendingReminders = await this.fetchPendingReminders();

      if (pendingReminders.length === 0) {
        logger.info('SYNC', 'No pending reminders to send');
        await this.updateLastSync();
        return { total: 0, sent: 0, failed: 0, results: [] };
      }

      logger.info('SYNC', `📤 Processing ${pendingReminders.length} reminders...`);

      // 2. Send SMS for each reminder
      const results: SMSResult[] = [];
      let sent = 0;
      let failed = 0;

      for (const reminder of pendingReminders) {
        const { appointment, message } = reminder;
        logger.info('SYNC', `Sending reminder ${sent + failed + 1}/${pendingReminders.length}`, {
          appointmentId: appointment.id,
          customerName: appointment.customer.name,
          customerPhone: appointment.customer.phone,
          messageLength: message.length,
        });

        const result = await smsService.sendReminderSMS(reminder);
        results.push(result);

        // 3. Update backend based on result (non-blocking)
        if (result.success) {
          this.markReminderSent(result.appointmentId); // No await - fire and forget
          sent++;
          logger.success('SYNC', `✅ SMS sent successfully to ${appointment.customer.name}`, {
            appointmentId: result.appointmentId,
            phone: appointment.customer.phone,
          });
        } else {
          this.markReminderFailed(
            result.appointmentId,
            result.error || 'Unknown error'
          ); // No await - fire and forget
          failed++;
          logger.error('SYNC', `❌ SMS failed for ${appointment.customer.name}`, {
            appointmentId: result.appointmentId,
            phone: appointment.customer.phone,
            error: result.error,
          });
        }

        // Small delay between SMS
        await this.delay(1000);
      }

      // 4. Update last sync time
      await this.updateLastSync();

      // 5. Track when we last found reminders (for battery optimization)
      if (pendingReminders.length > 0) {
        await Storage.set(STORAGE_KEYS.LAST_REMINDER_FOUND, new Date().toISOString());
      }

      const summary = `Sync complete: ${sent} sent, ${failed} failed out of ${pendingReminders.length} total`;
      logger.success('SYNC', summary, {
        total: pendingReminders.length,
        sent,
        failed,
        successRate: `${Math.round((sent / pendingReminders.length) * 100)}%`,
      });

      return {
        total: pendingReminders.length,
        sent,
        failed,
        results,
      };
    } catch (error: any) {
      logger.error('SYNC', 'Critical error during sync', {
        error: error.message,
        stack: error.stack,
      });
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
