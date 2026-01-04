/**
 * Manual patch for react-native-get-sms-android
 * Fixes Android 12+ (API 31+) PendingIntent FLAG_IMMUTABLE requirement
 * Fixes Android 13+ (API 33+) BroadcastReceiver RECEIVER_NOT_EXPORTED requirement
 *
 * Run this after npm install if patch-package fails on Windows
 */

const fs = require('fs');
const path = require('path');

const SMS_MODULE_PATH = path.join(
  __dirname,
  'node_modules',
  'react-native-get-sms-android',
  'android',
  'src',
  'main',
  'java',
  'com',
  'react',
  'SmsModule.java'
);

console.log('🔧 Applying manual patch for react-native-get-sms-android...');

if (!fs.existsSync(SMS_MODULE_PATH)) {
  console.error('❌ SmsModule.java not found at:', SMS_MODULE_PATH);
  console.error('   Run npm install first!');
  process.exit(1);
}

let content = fs.readFileSync(SMS_MODULE_PATH, 'utf8');

// Check if already patched
if (content.includes('FLAG_IMMUTABLE') && content.includes('RECEIVER_NOT_EXPORTED')) {
  console.log('✅ Patch already applied!');
  process.exit(0);
}

console.log('📝 Applying Android 12+ PendingIntent and Android 13+ BroadcastReceiver fixes...');

// Add imports
if (!content.includes('import android.os.Build;')) {
  content = content.replace(
    'import android.app.PendingIntent.CanceledException;',
    'import android.app.PendingIntent.CanceledException;\nimport android.os.Build;'
  );
}

if (!content.includes('import java.util.Random;')) {
  content = content.replace(
    'import java.util.ArrayList;',
    'import java.util.ArrayList;\nimport java.util.Random;'
  );
}

// Replace SENT/DELIVERED identifiers first (defines requestCode)
content = content.replace(
  `String SENT = "SMS_SENT";
            String DELIVERED = "SMS_DELIVERED";`,
  `// Use unique identifiers to avoid broadcast conflicts
            int requestCode = new Random().nextInt(1000000);
            String SENT = "SMS_SENT_" + requestCode;
            String DELIVERED = "SMS_DELIVERED_" + requestCode;`
);

// Then replace PendingIntent creation (uses already-defined requestCode)
const oldPendingIntent = `PendingIntent sentPI = PendingIntent.getBroadcast(context, 0, new Intent(SENT), 0);
            PendingIntent deliveredPI = PendingIntent.getBroadcast(context, 0, new Intent(DELIVERED), 0);`;

const newPendingIntent = `// Android 12 (API 31) and above requires FLAG_IMMUTABLE or FLAG_MUTABLE
            int flags = 0;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags = PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent sentPI = PendingIntent.getBroadcast(context, requestCode, new Intent(SENT), flags);
            PendingIntent deliveredPI = PendingIntent.getBroadcast(context, requestCode + 1, new Intent(DELIVERED), flags);`;

content = content.replace(oldPendingIntent, newPendingIntent);

// Fix BroadcastReceiver registration for Android 13+ (SENT receiver)
const oldSentReceiver = `context.registerReceiver(new BroadcastReceiver() {
                @Override
                public void onReceive(Context arg0, Intent arg1) {`;

const newSentReceiver = `// Create receiver for SENT broadcast
            final BroadcastReceiver sentReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context arg0, Intent arg1) {`;

content = content.replace(oldSentReceiver, newSentReceiver);

// Find the closing of the SENT receiver and add registration with Android 13+ flags
const oldSentReceiverEnd = `}
            }, new IntentFilter(SENT));`;

const newSentReceiverEnd = `}
            };

            // Android 13+ requires explicit RECEIVER_EXPORTED or RECEIVER_NOT_EXPORTED flag
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(sentReceiver, new IntentFilter(SENT), Context.RECEIVER_NOT_EXPORTED);
            } else {
                context.registerReceiver(sentReceiver, new IntentFilter(SENT));
            }`;

content = content.replace(oldSentReceiverEnd, newSentReceiverEnd);

// Fix BroadcastReceiver registration for Android 13+ (DELIVERED receiver)
const oldDeliveredReceiver = `context.registerReceiver(new BroadcastReceiver() {
                @Override
                public void onReceive(Context arg0, Intent arg1) {`;

const newDeliveredReceiver = `// Create receiver for DELIVERED broadcast
            final BroadcastReceiver deliveredReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context arg0, Intent arg1) {`;

content = content.replace(oldDeliveredReceiver, newDeliveredReceiver);

// Find the closing of the DELIVERED receiver and add registration with Android 13+ flags
const oldDeliveredReceiverEnd = `}
            }, new IntentFilter(DELIVERED));`;

const newDeliveredReceiverEnd = `}
            };

            // Android 13+ requires explicit RECEIVER_EXPORTED or RECEIVER_NOT_EXPORTED flag
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(deliveredReceiver, new IntentFilter(DELIVERED), Context.RECEIVER_NOT_EXPORTED);
            } else {
                context.registerReceiver(deliveredReceiver, new IntentFilter(DELIVERED));
            }`;

content = content.replace(oldDeliveredReceiverEnd, newDeliveredReceiverEnd);

// Write patched file
fs.writeFileSync(SMS_MODULE_PATH, content, 'utf8');

console.log('✅ Patch applied successfully!');
console.log('   ✓ Android 12+ PendingIntent FLAG_IMMUTABLE added');
console.log('   ✓ Android 13+ BroadcastReceiver RECEIVER_NOT_EXPORTED added');
console.log('   You can now build the APK');

