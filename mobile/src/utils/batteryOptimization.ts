/**
 * Battery Optimization Utilities
 * Smart interval calculation based on various conditions
 */
import { NativeModules } from 'react-native';
import { BATTERY_OPTIMIZATION } from '@/config/api';

interface BatteryInfo {
  batteryLevel: number; // 0-100
  isCharging: boolean;
}

export class BatteryOptimizer {
  /**
   * Get current battery information
   */
  static async getBatteryInfo(): Promise<BatteryInfo> {
    try {
      // Try to get battery level from React Native
      const { batteryLevel } = await NativeModules.BatteryManager?.getBatteryLevel() || { batteryLevel: 100 };
      const { isCharging } = await NativeModules.BatteryManager?.isCharging() || { isCharging: false };

      return {
        batteryLevel: batteryLevel * 100, // Convert to percentage
        isCharging,
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
   * Check if current time is within business hours
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

    // 1. Check business hours
    const isBusinessHours = this.isBusinessHours();
    if (!isBusinessHours) {
      multiplier *= BATTERY_OPTIMIZATION.NIGHT_MODE_MULTIPLIER;
      reasons.push('orario notturno');
    }

    // 2. Check battery level (only if not charging)
    try {
      const batteryInfo = await this.getBatteryInfo();

      if (batteryInfo.isCharging) {
        // If charging, we can sync more aggressively - no multiplier
        reasons.push('in carica');
      } else if (this.isLowBattery(batteryInfo.batteryLevel)) {
        multiplier *= BATTERY_OPTIMIZATION.LOW_BATTERY_MULTIPLIER;
        reasons.push(`batteria bassa (${Math.round(batteryInfo.batteryLevel)}%)`);
      }
    } catch (error) {
      console.warn('Could not get battery info for optimization:', error);
    }

    // 3. Check time since last reminder found (adaptive interval)
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
   */
  static async shouldSkipSync(): Promise<{
    skip: boolean;
    reason?: string;
  }> {
    const now = new Date();
    const currentHour = now.getHours();

    // Skip sync between 20:00 (8 PM) and 9:00 (9 AM) - deep sleep hours
    // This covers night time: 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7, 8
    if (currentHour >= 20 || currentHour < 9) {
      return {
        skip: true,
        reason: 'Orario di sonno profondo (20:00-9:00)',
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
