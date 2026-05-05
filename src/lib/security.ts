/**
 * Security utilities for Ventou application
 * Implements OWASP security best practices
 */

// ============================================
// XSS PROTECTION
// ============================================
import DOMPurify from 'dompurify';

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    KEEP_CONTENT: true,
  });
}

export function sanitizeUserInput(input: string): string {
  // Remove any HTML tags and potential XSS vectors
  return input.replace(/<[^>]*>/g, '').trim();
}

// ============================================
// CSRF TOKEN MANAGEMENT
// ============================================
export function generateCSRFToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getCSRFToken(): string {
  let token = sessionStorage.getItem('csrf_token');
  if (!token) {
    token = generateCSRFToken();
    sessionStorage.setItem('csrf_token', token);
  }
  return token;
}

// ============================================
// SECURE HEADERS CONFIGURATION
// ============================================
export const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://*.supabase.co https://accounts.google.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join(';'),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

// ============================================
// RATE LIMITING
// ============================================
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count < this.maxAttempts) {
      record.count++;
      return true;
    }

    return false;
  }

  getRemainingTime(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return 0;
    return Math.max(0, record.resetTime - Date.now());
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// ============================================
// PASSWORD VALIDATION
// ============================================
export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*-_+=',
};

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Au moins ${PASSWORD_REQUIREMENTS.minLength} caract\u00e8res`);
  }
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Au moins une majuscule');
  }
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Au moins une minuscule');
  }
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Au moins un chiffre');
  }
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && 
      !new RegExp(`[${PASSWORD_REQUIREMENTS.specialChars.replace(/[-[\]{}()*+?.,\\\\^$|#\\s]/g, '\\\\$&')}]`).test(password)) {
    errors.push(`Au moins un caract\u00e8re sp\u00e9cial (${PASSWORD_REQUIREMENTS.specialChars})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================
// SECURE STORAGE
// ============================================
export class SecureStorage {
  private static readonly PREFIX = 'ventou_secure_';

  /**
   * Store data in sessionStorage with encryption (client-side only)
   * Note: This is not true encryption but prevents casual inspection
   */
  static set(key: string, value: any): void {
    try {
      const data = JSON.stringify(value);
      const encoded = btoa(data); // Base64 encode
      sessionStorage.setItem(this.PREFIX + key, encoded);
    } catch (error) {
      console.error('Failed to store secure data:', error);
    }
  }

  static get(key: string): any {
    try {
      const encoded = sessionStorage.getItem(this.PREFIX + key);
      if (!encoded) return null;
      const data = atob(encoded); // Base64 decode
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      return null;
    }
  }

  static remove(key: string): void {
    sessionStorage.removeItem(this.PREFIX + key);
  }

  static clear(): void {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith(this.PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  }
}

// ============================================
// API SECURITY HELPERS
// ============================================
export function createSecureHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-Token': getCSRFToken(),
  };
}

export function handleSecurityError(error: any): void {
  // Log to server (in production)
  if (!import.meta.env.DEV) {
    // TODO: Send to error tracking service (Sentry, etc.)
    console.error('Security error:', error);
  }
}

// ============================================
// COOKIE SECURITY
// ============================================
export function setCSecureCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    domain?: string;
    path?: string;
  } = {}
): void {
  const { maxAge = 3600, domain = '', path = '/' } = options;
  const isSecure = window.location.protocol === 'https:';
  
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  cookieString += `; Max-Age=${maxAge}`;
  cookieString += `; Path=${path}`;
  if (domain) cookieString += `; Domain=${domain}`;
  if (isSecure) cookieString += '; Secure';
  cookieString += '; SameSite=Strict';
  cookieString += '; HttpOnly'; // Note: HttpOnly cannot be set from JavaScript
  
  document.cookie = cookieString;
}
