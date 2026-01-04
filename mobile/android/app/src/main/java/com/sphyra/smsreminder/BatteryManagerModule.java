package com.sphyra.smsreminder;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Build;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

/**
 * Native module for battery status monitoring
 * Provides real battery level and charging status to React Native
 */
public class BatteryManagerModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "BatteryManager";
    private final ReactApplicationContext reactContext;

    public BatteryManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Get current battery level (0.0 - 1.0)
     */
    @ReactMethod
    public void getBatteryLevel(Promise promise) {
        try {
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = reactContext.registerReceiver(null, ifilter);

            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);

                float batteryPct = level / (float) scale;

                WritableMap result = Arguments.createMap();
                result.putDouble("batteryLevel", batteryPct);
                promise.resolve(result);
            } else {
                promise.reject("BATTERY_ERROR", "Could not retrieve battery status");
            }
        } catch (Exception e) {
            promise.reject("BATTERY_ERROR", "Error getting battery level: " + e.getMessage());
        }
    }

    /**
     * Check if device is charging
     */
    @ReactMethod
    public void isCharging(Promise promise) {
        try {
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = reactContext.registerReceiver(null, ifilter);

            if (batteryStatus != null) {
                int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                boolean isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                                   status == BatteryManager.BATTERY_STATUS_FULL;

                WritableMap result = Arguments.createMap();
                result.putBoolean("isCharging", isCharging);
                promise.resolve(result);
            } else {
                promise.reject("BATTERY_ERROR", "Could not retrieve charging status");
            }
        } catch (Exception e) {
            promise.reject("BATTERY_ERROR", "Error checking charging status: " + e.getMessage());
        }
    }

    /**
     * Get complete battery information
     */
    @ReactMethod
    public void getBatteryInfo(Promise promise) {
        try {
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = reactContext.registerReceiver(null, ifilter);

            if (batteryStatus != null) {
                // Battery level
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                float batteryPct = level / (float) scale;

                // Charging status
                int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                boolean isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                                   status == BatteryManager.BATTERY_STATUS_FULL;

                // Charging source
                int chargePlug = batteryStatus.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1);
                boolean usbCharge = chargePlug == BatteryManager.BATTERY_PLUGGED_USB;
                boolean acCharge = chargePlug == BatteryManager.BATTERY_PLUGGED_AC;
                boolean wirelessCharge = Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1 &&
                                        chargePlug == BatteryManager.BATTERY_PLUGGED_WIRELESS;

                WritableMap result = Arguments.createMap();
                result.putDouble("batteryLevel", batteryPct);
                result.putBoolean("isCharging", isCharging);
                result.putBoolean("usbCharge", usbCharge);
                result.putBoolean("acCharge", acCharge);
                result.putBoolean("wirelessCharge", wirelessCharge);

                promise.resolve(result);
            } else {
                promise.reject("BATTERY_ERROR", "Could not retrieve battery information");
            }
        } catch (Exception e) {
            promise.reject("BATTERY_ERROR", "Error getting battery info: " + e.getMessage());
        }
    }
}
