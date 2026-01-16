/**
 * JWT Configuration - Centralized JWT settings
 *
 * This file provides a single source of truth for JWT configuration
 * to prevent inconsistencies between middleware and routes.
 */

import { logger } from '../utils/logger.js';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Get JWT secret - centralized and consistent across the application
 */
function getJWTSecret(): string {
  const envSecret = process.env.JWT_SECRET;

  if (envSecret) {
    return envSecret;
  }

  if (isDevelopment) {
    // Use a consistent secret in development
    // This secret is the same across all modules but changes on server restart
    const devSecret = 'dev-secret-key-sphyra-wellness-2024';
    logger.warn('⚠️  WARNING: Using default JWT_SECRET for development');
    logger.warn('⚠️  For production, set JWT_SECRET in .env file');
    logger.warn('⚠️  Example: JWT_SECRET=$(openssl rand -base64 32)');
    return devSecret;
  }

  // In production, JWT_SECRET is REQUIRED
  logger.error('❌ FATAL: JWT_SECRET environment variable is not set!');
  logger.error('   Please add JWT_SECRET to your .env file with a secure random value.');
  logger.error('   Example: JWT_SECRET=$(openssl rand -base64 32)');
  process.exit(1);
}

/**
 * Validate configuration on module load
 */
function validateJWTConfig(): void {
  if (!isDevelopment) {
    const envSecret = process.env.JWT_SECRET;

    if (!envSecret) {
      logger.error('❌ FATAL: JWT_SECRET is required in production');
      process.exit(1);
    }

    // Check for weak/default secrets in production
    const weakSecrets = [
      'development-secret-key',
      'dev-secret',
      'secret',
      'jwt-secret',
      'change-me',
      'sphyra',
    ];

    const lowerSecret = envSecret.toLowerCase();
    if (weakSecrets.some(weak => lowerSecret.includes(weak))) {
      logger.error('❌ FATAL: Weak JWT_SECRET detected in production!');
      logger.error('   Your JWT_SECRET contains a common/default value.');
      logger.error('   Generate a strong secret: openssl rand -base64 32');
      process.exit(1);
    }

    if (envSecret.length < 32) {
      logger.error('❌ FATAL: JWT_SECRET is too short in production!');
      logger.error('   Minimum length: 32 characters');
      logger.error('   Generate a strong secret: openssl rand -base64 32');
      process.exit(1);
    }
  }
}

// Validate configuration on startup
validateJWTConfig();

/**
 * JWT Secret - SINGLE SOURCE OF TRUTH
 * Used consistently across middleware and routes
 */
export const JWT_SECRET = getJWTSecret();

/**
 * Validate JWT_EXPIRES_IN format
 * Valid formats: '7d', '24h', '60m', '3600s', etc.
 */
function validateExpiresIn(value: string): boolean {
  // Valid format: number followed by time unit (s, m, h, d)
  const expiresInRegex = /^\d+[smhd]$/;
  return expiresInRegex.test(value);
}

/**
 * JWT Token Expiration
 */
function getJWTExpiresIn(): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  // Validate format
  if (!validateExpiresIn(expiresIn)) {
    if (!isDevelopment) {
      logger.error(`❌ FATAL: Invalid JWT_EXPIRES_IN format: "${expiresIn}"`);
      logger.error('   Valid formats: "7d", "24h", "60m", "3600s"');
      logger.error('   Using default: "7d"');
      return '7d';
    } else {
      logger.warn(`⚠️  WARNING: Invalid JWT_EXPIRES_IN format: "${expiresIn}"`);
      logger.warn('   Valid formats: "7d", "24h", "60m", "3600s"');
      logger.warn('   Using default: "7d"');
      return '7d';
    }
  }

  return expiresIn;
}

export const JWT_EXPIRES_IN = getJWTExpiresIn();

/**
 * Log configuration on startup
 */
if (isDevelopment) {
  logger.info('JWT Configuration: Development mode');
} else {
  logger.info('JWT Configuration: Production mode - Secret validated');
}
