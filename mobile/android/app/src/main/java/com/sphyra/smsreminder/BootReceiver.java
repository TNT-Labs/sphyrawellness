package com.sphyra.smsreminder;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

/**
 * Boot Receiver - Automatically restarts background service after device reboot
 * if auto-sync was enabled before reboot
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "SphyraBootReceiver";
    private static final String PREFS_NAME = "RN_ASYNC_STORAGE";
    private static final String AUTO_SYNC_KEY = "@sphyra:autoSyncEnabled";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.d(TAG, "Device boot completed - checking if auto-sync was enabled");

            // Check if auto-sync was enabled before reboot
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean autoSyncEnabled = prefs.getBoolean(AUTO_SYNC_KEY, false);

            if (autoSyncEnabled) {
                Log.d(TAG, "Auto-sync was enabled - launching app to restart background service");

                // Launch MainActivity to initialize React Native and restart service
                Intent launchIntent = new Intent(context, MainActivity.class);
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                launchIntent.putExtra("autoStartService", true);
                context.startActivity(launchIntent);
            } else {
                Log.d(TAG, "Auto-sync was not enabled - skipping service restart");
            }
        }
    }
}
