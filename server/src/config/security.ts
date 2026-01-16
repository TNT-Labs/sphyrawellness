/**
 * Security Configuration Validation
 *
 * Validates security-critical environment variables on application startup.
 * Fails fast in production if security requirements are not met.
 */

import { logger } from '../utils/logger.js';
import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * List of weak/default passwords that should never be used
 */
const WEAK_PASSWORDS = [
  'admin123',
  'password',
  'admin',
  '123456',
  '12345678',
  'password123',
  'admin1234',
  'user123',
  'changeme',
  'default',
  'root',
  'toor',
  'sphyra',
];

/**
 * Validate password strength
 */
function isWeakPassword(password: string | undefined): boolean {
  if (!password) return true;

  // Check against known weak passwords
  const lowerPassword = password.toLowerCase();
  if (WEAK_PASSWORDS.some(weak => lowerPassword.includes(weak))) {
    return true;
  }

  // Check minimum length
  if (password.length < 12) {
    return true;
  }

  // Check complexity (should have at least 3 of: lowercase, uppercase, numbers, symbols)
  let complexity = 0;
  if (/[a-z]/.test(password)) complexity++;
  if (/[A-Z]/.test(password)) complexity++;
  if (/[0-9]/.test(password)) complexity++;
  if (/[^a-zA-Z0-9]/.test(password)) complexity++;

  return complexity < 3;
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 24): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';

  // Ensure at least one of each required character type
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';

  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += symbols[crypto.randomInt(0, symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }

  // Shuffle the password using Fisher-Yates algorithm with crypto.randomInt
  const chars = password.split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

/**
 * Validate admin password configuration
 */
function validateAdminPassword(): void {
  const adminPassword = process.env.VITE_ADMIN_INITIAL_PASSWORD;

  if (!adminPassword) {
    if (isProduction) {
      logger.error('❌ FATAL: VITE_ADMIN_INITIAL_PASSWORD is not set in production!');
      logger.error('   Set a strong admin password in .env file');
      process.exit(1);
    } else {
      logger.warn('⚠️  WARNING: VITE_ADMIN_INITIAL_PASSWORD not set');
      logger.warn('   A secure password will be generated automatically');
    }
    return;
  }

  if (isWeakPassword(adminPassword)) {
    if (isProduction) {
      logger.error('❌ FATAL: Weak VITE_ADMIN_INITIAL_PASSWORD detected in production!');
      logger.error('   Your admin password is too weak or uses a common pattern.');
      logger.error('   Requirements:');
      logger.error('   - Minimum 12 characters');
      logger.error('   - Mix of uppercase, lowercase, numbers, and symbols');
      logger.error('   - Not a common/default password');
      logger.error('');
      logger.error('   Generate a strong password:');
      logger.error('   node -e "console.log(require(\'crypto\').randomBytes(24).toString(\'base64\'))"');
      process.exit(1);
    } else {
      logger.warn('⚠️  WARNING: Weak admin password detected in development');
      logger.warn('   Change this before deploying to production!');
    }
  } else {
    if (!isProduction) {
      logger.info('✅ Admin password strength: OK');
    }
  }
}

/**
 * Validate database password configuration
 */
function validateDatabasePassword(): void {
  const dbPassword = process.env.POSTGRES_PASSWORD;

  if (!dbPassword) {
    if (isProduction) {
      logger.error('❌ FATAL: POSTGRES_PASSWORD is not set in production!');
      logger.error('   Set a strong database password in .env file');
      process.exit(1);
    }
    return;
  }

  if (isWeakPassword(dbPassword)) {
    if (isProduction) {
      logger.error('❌ FATAL: Weak POSTGRES_PASSWORD detected in production!');
      logger.error('   Your database password is too weak or uses a common pattern.');
      logger.error('   Requirements: Same as admin password');
      process.exit(1);
    } else {
      logger.warn('⚠️  WARNING: Weak database password detected in development');
      logger.warn('   Change this before deploying to production!');
    }
  }
}

/**
 * Validate all security configurations
 * Called on application startup
 */
export function validateSecurityConfig(): void {
  logger.info('Validating security configuration...');

  validateAdminPassword();
  validateDatabasePassword();

  if (isProduction) {
    logger.info('✅ Security configuration validated for production');
  } else {
    logger.info('ℹ️  Security validation in development mode');
  }
}

/**
 * Get admin initial password - generates secure one if not set in development
 */
export function getAdminInitialPassword(): string {
  const envPassword = process.env.VITE_ADMIN_INITIAL_PASSWORD;

  if (envPassword && !isWeakPassword(envPassword)) {
    return envPassword;
  }

  if (isProduction) {
    // Should never reach here due to validateSecurityConfig()
    logger.error('❌ FATAL: Cannot generate password in production');
    process.exit(1);
  }

  // Generate secure password for development
  const generatedPassword = generateSecurePassword(16);
  logger.warn('═══════════════════════════════════════════════════════════');
  logger.warn('⚠️  AUTO-GENERATED ADMIN PASSWORD (Development Only)');
  logger.warn('═══════════════════════════════════════════════════════════');
  logger.warn(`   Username: admin`);
  logger.warn(`   Password: ${generatedPassword}`);
  logger.warn('═══════════════════════════════════════════════════════════');
  logger.warn('⚠️  SAVE THIS PASSWORD - It will change on restart!');
  logger.warn('⚠️  Set VITE_ADMIN_INITIAL_PASSWORD in .env to make it permanent');
  logger.warn('═══════════════════════════════════════════════════════════');

  return generatedPassword;
}
