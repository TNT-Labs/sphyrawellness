/**
 * Manual patch for react-native-get-sms-android
 * Fixes Android 12+ (API 31+) PendingIntent FLAG_IMMUTABLE requirement
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
if (content.includes('FLAG_IMMUTABLE') || content.includes('Build.VERSION.SDK_INT >= Build.VERSION_CODES.S')) {
  console.log('✅ Patch already applied!');
  process.exit(0);
}

console.log('📝 Applying Android 12+ PendingIntent fix...');

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

// Replace PendingIntent creation with FLAG_IMMUTABLE support
const oldPendingIntent = `PendingIntent sentPI = PendingIntent.getBroadcast(context, 0, new Intent(SENT), 0);
            PendingIntent deliveredPI = PendingIntent.getBroadcast(context, 0, new Intent(DELIVERED), 0);`;

const newPendingIntent = `// Android 12 (API 31) and above requires FLAG_IMMUTABLE or FLAG_MUTABLE
            int flags = 0;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags = PendingIntent.FLAG_IMMUTABLE;
            }

            // Use unique request codes to avoid conflicts
            int requestCode = new Random().nextInt(1000000);

            PendingIntent sentPI = PendingIntent.getBroadcast(context, requestCode, new Intent(SENT), flags);
            PendingIntent deliveredPI = PendingIntent.getBroadcast(context, requestCode + 1, new Intent(DELIVERED), flags);`;

content = content.replace(oldPendingIntent, newPendingIntent);

// Also fix unique SENT/DELIVERED identifiers
content = content.replace(
  `String SENT = "SMS_SENT";
            String DELIVERED = "SMS_DELIVERED";`,
  `// Use unique identifiers to avoid broadcast conflicts
            int requestCode = new Random().nextInt(1000000);
            String SENT = "SMS_SENT_" + requestCode;
            String DELIVERED = "SMS_DELIVERED_" + requestCode;`
);

// Write patched file
fs.writeFileSync(SMS_MODULE_PATH, content, 'utf8');

console.log('✅ Patch applied successfully!');
console.log('   Android 12+ PendingIntent FLAG_IMMUTABLE added');
console.log('   You can now build the APK');
