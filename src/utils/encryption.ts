/**
 * Encryption utilities for sensitive data
 * Uses Web Crypto API for secure encryption/decryption
 */

import { logger } from './logger';

// Encryption constants
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Generate a device-specific encryption key from a password
 * Uses PBKDF2 for key derivation
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Get or create device-specific salt
 */
function getDeviceSalt(): Uint8Array {
  const SALT_KEY = 'sphyra_device_salt';
  const stored = localStorage.getItem(SALT_KEY);

  if (stored) {
    return Uint8Array.from(atob(stored), c => c.charCodeAt(0));
  }

  // Generate new salt
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_KEY, btoa(String.fromCharCode(...salt)));
  return salt;
}

/**
 * Get device-specific master key
 * This key is derived from device characteristics and user context
 */
function getMasterPassword(): string {
  // Use a combination of:
  // - User agent (device/browser identifier)
  // - Screen resolution (device characteristic)
  // - Timezone (user context)
  const deviceId = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');

  return deviceId;
}

/**
 * Encrypt sensitive data
 */
export async function encrypt(plaintext: string): Promise<string | null> {
  try {
    if (!window.crypto || !window.crypto.subtle) {
      logger.error('Web Crypto API not available');
      return null;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Get device salt and derive key
    const salt = getDeviceSalt();
    const masterPassword = getMasterPassword();
    const key = await deriveKey(masterPassword, salt);

    // Generate random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt
    const encrypted = await window.crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    logger.error('Encryption failed:', error);
    return null;
  }
}

/**
 * Decrypt sensitive data
 */
export async function decrypt(ciphertext: string): Promise<string | null> {
  try {
    if (!window.crypto || !window.crypto.subtle) {
      logger.error('Web Crypto API not available');
      return null;
    }

    // Convert from base64
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    // Get device salt and derive key
    const salt = getDeviceSalt();
    const masterPassword = getMasterPassword();
    const key = await deriveKey(masterPassword, salt);

    // Decrypt
    const decrypted = await window.crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    logger.error('Decryption failed:', error);
    return null;
  }
}

/**
 * Check if encryption is available
 */
export function isEncryptionAvailable(): boolean {
  return !!(window.crypto && window.crypto.subtle);
}

/**
 * Securely store sensitive data in localStorage with encryption
 */
export async function secureStore(key: string, value: string): Promise<boolean> {
  if (!value) {
    localStorage.removeItem(key);
    return true;
  }

  const encrypted = await encrypt(value);
  if (!encrypted) {
    logger.error('Failed to encrypt data for storage');
    return false;
  }

  try {
    localStorage.setItem(key, encrypted);
    return true;
  } catch (error) {
    logger.error('Failed to store encrypted data:', error);
    return false;
  }
}

/**
 * Securely retrieve sensitive data from localStorage with decryption
 */
export async function secureRetrieve(key: string): Promise<string | null> {
  const encrypted = localStorage.getItem(key);
  if (!encrypted) {
    return null;
  }

  return await decrypt(encrypted);
}

/**
 * Clear sensitive data from localStorage
 */
export function secureClear(key: string): void {
  localStorage.removeItem(key);
}
