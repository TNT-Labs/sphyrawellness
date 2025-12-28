/**
 * Password Strength Policy
 * Enforces secure password requirements
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  score: number; // 0-100, strength score
}

/**
 * Password policy configuration
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // Optional for better UX
  forbiddenPasswords: [
    'password',
    'admin123',
    'user123',
    '12345678',
    'qwerty',
    'letmein',
    'welcome',
    'password123',
    'admin',
    'sphyra',
    'wellness',
  ],
};

/**
 * Validate password against security policy
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
  } else {
    score += 20;
    // Bonus points for extra length
    score += Math.min(20, (password.length - PASSWORD_POLICY.minLength) * 2);
  }

  // Check for uppercase letters
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 15;
  }

  // Check for lowercase letters
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 15;
  }

  // Check for numbers
  if (PASSWORD_POLICY.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/[0-9]/.test(password)) {
    score += 15;
  }

  // Check for special characters (bonus points, not required)
  if (PASSWORD_POLICY.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  } else if (/[^A-Za-z0-9]/.test(password)) {
    score += 15; // Bonus for special chars even if not required
  }

  // Check against forbidden passwords
  const passwordLower = password.toLowerCase();
  const isForbidden = PASSWORD_POLICY.forbiddenPasswords.some(
    (forbidden) => passwordLower.includes(forbidden)
  );

  if (isForbidden) {
    errors.push('Password is too common or contains forbidden words');
    score = Math.min(score, 30); // Cap score for weak passwords
  }

  // Check for repeated characters (weakness indicator)
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters (e.g., aaa, 111)');
    score -= 10;
  }

  // Check for sequential characters (weakness indicator)
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    errors.push('Password should not contain sequential characters (e.g., abc, 123)');
    score -= 10;
  }

  // Ensure score is within 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    valid: errors.length === 0,
    errors,
    score,
  };
}

/**
 * Get password strength description
 */
export function getPasswordStrengthDescription(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Weak';
  return 'Very Weak';
}

/**
 * Get password strength color (for UI)
 */
export function getPasswordStrengthColor(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 60) return 'blue';
  if (score >= 40) return 'yellow';
  if (score >= 20) return 'orange';
  return 'red';
}

/**
 * Check if password has been changed from default
 */
export function isDefaultPassword(password: string): boolean {
  const defaultPasswords = ['admin123', 'user123', 'password', 'admin'];
  return defaultPasswords.includes(password.toLowerCase());
}
