package com.sphyra.smsreminder;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkInfo;
import androidx.work.WorkManager;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Native module for WorkManager-based background sync
 * Replaces react-native-background-actions with native Android WorkManager
 * for better battery optimization and Doze mode compliance
 */
public class WorkManagerModule extends ReactContextBaseJavaModule {
    private static final String TAG = "WorkManagerModule";
    private static final String MODULE_NAME = "WorkManagerModule";
    private static final String WORK_NAME = "SphyraReminderSync";

    private final ReactApplicationContext reactContext;

    public WorkManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Start periodic reminder sync with WorkManager
     * @param intervalMinutes Sync interval in minutes (minimum 15)
     */
    @ReactMethod
    public void startPeriodicSync(int intervalMinutes, Promise promise) {
        try {
            // WorkManager has a minimum interval of 15 minutes
            if (intervalMinutes < 15) {
                intervalMinutes = 15;
                Log.w(TAG, "Interval adjusted to minimum 15 minutes");
            }

            // Create constraints for the work
            Constraints constraints = new Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED) // Require network connection
                    .setRequiresBatteryNotLow(false) // Allow on low battery (we handle it in JS)
                    .setRequiresCharging(false) // Don't require charging
                    .setRequiresDeviceIdle(false) // Don't require idle
                    .setRequiresStorageNotLow(true) // Require sufficient storage
                    .build();

            // Create periodic work request
            PeriodicWorkRequest syncWorkRequest = new PeriodicWorkRequest.Builder(
                    ReminderSyncWorker.class,
                    intervalMinutes,
                    TimeUnit.MINUTES
            )
                    .setConstraints(constraints)
                    .addTag(WORK_NAME)
                    .build();

            // Enqueue the work (replace existing if any)
            WorkManager.getInstance(reactContext)
                    .enqueueUniquePeriodicWork(
                            WORK_NAME,
                            ExistingPeriodicWorkPolicy.UPDATE, // Update if exists
                            syncWorkRequest
                    );

            Log.d(TAG, "✅ Periodic sync started: " + intervalMinutes + " minutes");

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putInt("intervalMinutes", intervalMinutes);
            result.putString("workName", WORK_NAME);

            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "❌ Error starting periodic sync: " + e.getMessage(), e);
            promise.reject("WORKMANAGER_ERROR", "Failed to start sync: " + e.getMessage());
        }
    }

    /**
     * Stop periodic reminder sync
     */
    @ReactMethod
    public void stopPeriodicSync(Promise promise) {
        try {
            WorkManager.getInstance(reactContext)
                    .cancelUniqueWork(WORK_NAME);

            Log.d(TAG, "⏸️ Periodic sync stopped");

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Sync stopped successfully");

            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "❌ Error stopping sync: " + e.getMessage(), e);
            promise.reject("WORKMANAGER_ERROR", "Failed to stop sync: " + e.getMessage());
        }
    }

    /**
     * Check if periodic sync is running
     */
    @ReactMethod
    public void isSyncRunning(Promise promise) {
        try {
            WorkManager workManager = WorkManager.getInstance(reactContext);
            List<WorkInfo> workInfos = workManager.getWorkInfosForUniqueWork(WORK_NAME).get();

            boolean isRunning = false;
            if (workInfos != null && !workInfos.isEmpty()) {
                WorkInfo workInfo = workInfos.get(0);
                isRunning = workInfo.getState() == WorkInfo.State.ENQUEUED ||
                           workInfo.getState() == WorkInfo.State.RUNNING;
            }

            WritableMap result = Arguments.createMap();
            result.putBoolean("isRunning", isRunning);

            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error checking sync status: " + e.getMessage(), e);
            promise.reject("WORKMANAGER_ERROR", "Failed to check status: " + e.getMessage());
        }
    }

    /**
     * Get work status information
     */
    @ReactMethod
    public void getWorkStatus(Promise promise) {
        try {
            WorkManager workManager = WorkManager.getInstance(reactContext);
            List<WorkInfo> workInfos = workManager.getWorkInfosForUniqueWork(WORK_NAME).get();

            WritableMap result = Arguments.createMap();

            if (workInfos != null && !workInfos.isEmpty()) {
                WorkInfo workInfo = workInfos.get(0);

                result.putString("state", workInfo.getState().name());
                result.putInt("runAttemptCount", workInfo.getRunAttemptCount());
                result.putString("id", workInfo.getId().toString());

                // Get output data if available
                if (workInfo.getState() == WorkInfo.State.SUCCEEDED) {
                    String status = workInfo.getOutputData().getString("status");
                    result.putString("lastStatus", status != null ? status : "unknown");
                }
            } else {
                result.putString("state", "NOT_SCHEDULED");
            }

            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error getting work status: " + e.getMessage(), e);
            promise.reject("WORKMANAGER_ERROR", "Failed to get status: " + e.getMessage());
        }
    }

    /**
     * Check if there's a pending sync trigger from WorkManager
     * Returns true if sync should be performed
     */
    @ReactMethod
    public void checkPendingSync(Promise promise) {
        try {
            android.content.SharedPreferences prefs = reactContext
                    .getSharedPreferences("SphyraPrefs", Context.MODE_PRIVATE);

            boolean hasPendingSync = prefs.getBoolean("pending_sync", false);
            long triggeredAt = prefs.getLong("sync_triggered_at", 0);

            WritableMap result = Arguments.createMap();
            result.putBoolean("hasPendingSync", hasPendingSync);
            result.putDouble("triggeredAt", triggeredAt);

            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("WORKMANAGER_ERROR", "Failed to check pending sync: " + e.getMessage());
        }
    }

    /**
     * Clear pending sync flag (call after sync is completed)
     */
    @ReactMethod
    public void clearPendingSync(Promise promise) {
        try {
            android.content.SharedPreferences prefs = reactContext
                    .getSharedPreferences("SphyraPrefs", Context.MODE_PRIVATE);

            prefs.edit()
                    .putBoolean("pending_sync", false)
                    .apply();

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);

            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("WORKMANAGER_ERROR", "Failed to clear pending sync: " + e.getMessage());
        }
    }
}
