/**
 * Authentication utilities
 * Password hashing and validation
 */

/**
 * Hash a password using SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
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
