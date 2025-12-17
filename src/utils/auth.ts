/**
 * Authentication utilities
 * Password hashing and validation
 */

/**
 * Hash a password using PBKDF2 with random salt
 * This is cryptographically secure and resistant to rainbow table attacks
 *
 * Format: base64(salt + derivedKey)
 * - salt: 16 bytes (128 bits)
 * - derivedKey: 32 bytes (256 bits) from PBKDF2 with 210,000 iterations
 *
 * OWASP recommendations (2023):
 * - PBKDF2-SHA256 with 210,000+ iterations
 * - Random salt per password
 * - Minimum 128-bit salt
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate cryptographically secure random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive key using PBKDF2 with 210,000 iterations (OWASP 2023 recommendation)
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 210000,  // OWASP recommends 210k+ for PBKDF2-SHA256
      hash: 'SHA-256'
    },
    passwordKey,
    256  // 256 bits = 32 bytes
  );

  // Combine salt + derived key for storage
  const combined = new Uint8Array(salt.length + derivedBits.byteLength);
  combined.set(salt, 0);
  combined.set(new Uint8Array(derivedBits), salt.length);

  // Encode as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Verify a password against a hash
 * Supports both new PBKDF2 format and legacy SHA-256 format for backward compatibility
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Try new PBKDF2 format first
    const combined = Uint8Array.from(atob(hash), c => c.charCodeAt(0));

    // New format: 16 bytes salt + 32 bytes derived key = 48 bytes total
    if (combined.length === 48) {
      // Extract salt and stored derived key
      const salt = combined.slice(0, 16);
      const storedDerivedKey = combined.slice(16);

      const encoder = new TextEncoder();
      const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
      );

      // Derive key with same parameters
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 210000,
          hash: 'SHA-256'
        },
        passwordKey,
        256
      );

      const derivedKey = new Uint8Array(derivedBits);

      // Constant-time comparison to prevent timing attacks
      return constantTimeEqual(derivedKey, storedDerivedKey);
    }
  } catch {
    // Not base64 or wrong format, try legacy format
  }

  // Fallback to legacy SHA-256 format (hex string, 64 characters)
  if (hash.length === 64 && /^[0-9a-f]+$/.test(hash)) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return passwordHash === hash;
  }

  return false;
}

/**
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

/**
 * Get current session from localStorage
 */
export function getStoredSession(): { userId: string; username: string; role: string } | null {
  try {
    const sessionData = localStorage.getItem('sphyra_session');
    if (!sessionData) return null;
    return JSON.parse(sessionData);
  } catch {
    return null;
  }
}

/**
 * Store session in localStorage
 */
export function storeSession(userId: string, username: string, role: string): void {
  const sessionData = { userId, username, role };
  localStorage.setItem('sphyra_session', JSON.stringify(sessionData));
}

/**
 * Clear session from localStorage
 */
export function clearSession(): void {
  localStorage.removeItem('sphyra_session');
}
