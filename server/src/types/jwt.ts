/**
 * JWT Token Payload Types
 *
 * Defines the structure of JWT payloads for type safety
 */

import type { JwtPayload } from 'jsonwebtoken';

/**
 * User JWT Payload
 * Contains user information encoded in the JWT token
 */
export interface UserJwtPayload extends JwtPayload {
  id: string;
  username: string;
  role: string;
}

/**
 * Type guard to check if a payload is a valid UserJwtPayload
 */
export function isUserJwtPayload(payload: unknown): payload is UserJwtPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const obj = payload as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.username === 'string' &&
    typeof obj.role === 'string'
  );
}
