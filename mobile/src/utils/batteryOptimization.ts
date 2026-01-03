/**
 * Battery Optimization Utilities
 * Smart interval calculation based on various conditions
 * Uses native BatteryManager for real battery status
 */
import { NativeModules } from 'react-native';
import { BATTERY_OPTIMIZATION } from '@/config/api';

const { BatteryManager } = NativeModules;

interface BatteryInfo {
  batteryLevel: number; // 0-100
  isCharging: boolean;
}

export class BatteryOptimizer {
  /**
   * Get current battery information from native module
   */
  static async getBatteryInfo(): Promise<BatteryInfo> {
    try {
      if (!BatteryManager) {
        console.warn('BatteryManager native module not available');
        return { batteryLevel: 100, isCharging: false };
      }

      // Get battery info from native module
      const info = await BatteryManager.getBatteryInfo();

      return {
        batteryLevel: info.batteryLevel * 100, // Convert to percentage (0.0-1.0 → 0-100)
        isCharging: info.isCharging,
      };
    } catch (error) {
      console.warn('Unable to get battery info, assuming full battery:', error);
      // Fallback: assume full battery and not charging
      return {
        batteryLevel: 100,
        isCharging: false,
      };
    }
  }

  /**
   * Check if current time is within night hours (20:00 - 09:00)
   * During night hours, NO SMS should be sent
   */
  static isNightHours(): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    // Night hours: 20:00 (20) to 09:00 (9)
    // This means: hour >= 20 OR hour < 9
    return (
      currentHour >= BATTERY_OPTIMIZATION.NIGHT_HOURS_START ||
      currentHour < BATTERY_OPTIMIZATION.NIGHT_HOURS_END
    );
  }

  /**
   * Check if current time is within business hours (for display/logging)
   */
  static isBusinessHours(): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    return (
      currentHour >= BATTERY_OPTIMIZATION.BUSINESS_HOURS_START &&
      currentHour < BATTERY_OPTIMIZATION.BUSINESS_HOURS_END
    );
  }

  /**
   * Check if battery is low
   */
  static isLowBattery(batteryLevel: number): boolean {
    return batteryLevel < BATTERY_OPTIMIZATION.LOW_BATTERY_THRESHOLD;
  }

  /**
   * Calculate hours since last reminder was found
   */
  static hoursSinceLastReminder(lastReminderFoundTimestamp: string | null): number {
    if (!lastReminderFoundTimestamp) {
      // If we never found reminders, assume 0 hours (don't penalize)
      return 0;
    }

    const lastFound = new Date(lastReminderFoundTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - lastFound.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours;
  }

  /**
   * Calculate optimized sync interval based on current conditions
   * Returns interval in minutes
   * NOTE: Night hours (20:00-09:00) should SKIP sync entirely (handled by WorkManager natively)
   */
  static async calculateOptimizedInterval(
    baseInterval: number,
    lastReminderFoundTimestamp: string | null
  ): Promise<{
    interval: number;
    reason: string;
  }> {
    let multiplier = 1;
    const reasons: string[] = [];

    // 1. Check battery level and charging status
    try {
      const batteryInfo = await this.getBatteryInfo();

      if (batteryInfo.isCharging) {
        // If charging, we can sync more frequently
        multiplier *= BATTERY_OPTIMIZATION.CHARGING_MULTIPLIER;
        reasons.push(`in carica (${Math.round(batteryInfo.batteryLevel)}%)`);
      } else if (batteryInfo.batteryLevel < BATTERY_OPTIMIZATION.CRITICAL_BATTERY_THRESHOLD) {
        // Critical battery: reduce sync drastically
        multiplier *= (BATTERY_OPTIMIZATION.LOW_BATTERY_MULTIPLIER * 2);
        reasons.push(`batteria critica (${Math.round(batteryInfo.batteryLevel)}%)`);
      } else if (this.isLowBattery(batteryInfo.batteryLevel)) {
        // Low battery: increase interval
        multiplier *= BATTERY_OPTIMIZATION.LOW_BATTERY_MULTIPLIER;
        reasons.push(`batteria bassa (${Math.round(batteryInfo.batteryLevel)}%)`);
      } else {
        reasons.push(`batteria OK (${Math.round(batteryInfo.batteryLevel)}%)`);
      }
    } catch (error) {
      console.warn('Could not get battery info for optimization:', error);
    }

    // 2. Check time since last reminder found (adaptive interval)
    const hoursSinceReminder = this.hoursSinceLastReminder(lastReminderFoundTimestamp);
    if (hoursSinceReminder >= BATTERY_OPTIMIZATION.NO_REMINDERS_THRESHOLD_HOURS) {
      multiplier *= BATTERY_OPTIMIZATION.NO_REMINDERS_MULTIPLIER;
      reasons.push(`nessun reminder da ${Math.round(hoursSinceReminder)}h`);
    }

    // Calculate final interval
    let optimizedInterval = Math.round(baseInterval * multiplier);

    // Cap at maximum
    if (optimizedInterval > BATTERY_OPTIMIZATION.MAX_ADAPTIVE_INTERVAL) {
      optimizedInterval = BATTERY_OPTIMIZATION.MAX_ADAPTIVE_INTERVAL;
      reasons.push('max interval');
    }

    // Cap at minimum (WorkManager constraint)
    if (optimizedInterval < BATTERY_OPTIMIZATION.MIN_ADAPTIVE_INTERVAL) {
      optimizedInterval = BATTERY_OPTIMIZATION.MIN_ADAPTIVE_INTERVAL;
      reasons.push('min interval');
    }

    const reason = reasons.length > 0
      ? `Intervallo ${optimizedInterval}min (${reasons.join(', ')})`
      : `Intervallo normale ${optimizedInterval}min`;

    return {
      interval: optimizedInterval,
      reason,
    };
  }

  /**
   * Determine if we should skip this sync cycle
   * Returns true if sync should be skipped
   * IMPORTANT: Night hours (20:00-09:00) MUST skip - no SMS sent during this time
   */
  static async shouldSkipSync(): Promise<{
    skip: boolean;
    reason?: string;
  }> {
    // Check if we're in night hours (20:00 - 09:00)
    if (this.isNightHours()) {
      return {
        skip: true,
        reason: 'Orario notturno (20:00-09:00) - nessun SMS inviato',
      };
    }

    return { skip: false };
  }

  /**
   * Log optimization decision for debugging
   */
  static logOptimization(
    baseInterval: number,
    optimizedInterval: number,
    reason: string
  ): void {
    if (baseInterval !== optimizedInterval) {
      console.log(`🔋 Battery Optimization: ${reason}`);
      console.log(`   Base interval: ${baseInterval}min → Optimized: ${optimizedInterval}min`);
    } else {
      console.log(`🔋 Battery Optimization: ${reason}`);
    }
  }
}
