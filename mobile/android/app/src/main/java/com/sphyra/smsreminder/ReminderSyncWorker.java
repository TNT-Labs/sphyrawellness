package com.sphyra.smsreminder;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.work.Data;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;

/**
 * WorkManager Worker for periodic reminder synchronization
 * Runs in background respecting Android battery optimization (Doze mode)
 */
public class ReminderSyncWorker extends Worker {
    private static final String TAG = "ReminderSyncWorker";
    private static final String EVENT_SYNC_TRIGGER = "REMINDER_SYNC_TRIGGER";

    public ReminderSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            Log.d(TAG, "🔄 WorkManager sync triggered");

            // Check if we're in night hours (20:00 - 09:00)
            if (isNightHours()) {
                Log.d(TAG, "⏸️ Skipping sync during night hours (20:00-09:00)");
                return Result.success(createOutputData("skipped_night", 0));
            }

            // Emit event to React Native to trigger sync
            // The actual sync logic remains in JavaScript for easier maintenance
            emitSyncEvent();

            Log.d(TAG, "✅ Sync event emitted successfully");
            return Result.success(createOutputData("completed", 1));

        } catch (Exception e) {
            Log.e(TAG, "❌ Error during sync: " + e.getMessage(), e);
            return Result.retry();
        }
    }

    /**
     * Check if current time is within night hours (20:00 - 09:00)
     */
    private boolean isNightHours() {
        java.util.Calendar calendar = java.util.Calendar.getInstance();
        int currentHour = calendar.get(java.util.Calendar.HOUR_OF_DAY);

        // Night hours: 20:00 (20) to 09:00 (9)
        // This means: hour >= 20 OR hour < 9
        return currentHour >= 20 || currentHour < 9;
    }

    /**
     * Emit event to React Native to trigger sync
     */
    private void emitSyncEvent() {
        try {
            // Store sync trigger flag in SharedPreferences
            // The React Native app will check this flag and perform sync
            android.content.SharedPreferences prefs = getApplicationContext()
                    .getSharedPreferences("SphyraPrefs", Context.MODE_PRIVATE);

            prefs.edit()
                    .putBoolean("pending_sync", true)
                    .putLong("sync_triggered_at", System.currentTimeMillis())
                    .apply();

            Log.d(TAG, "📝 Sync trigger flag set in SharedPreferences");
        } catch (Exception e) {
            Log.e(TAG, "Error setting sync flag: " + e.getMessage(), e);
        }
    }

    /**
     * Create output data for work result
     */
    private Data createOutputData(String status, int syncCount) {
        return new Data.Builder()
                .putString("status", status)
                .putInt("sync_count", syncCount)
                .putLong("timestamp", System.currentTimeMillis())
                .build();
    }
}
