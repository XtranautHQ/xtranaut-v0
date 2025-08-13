import { createHash, randomBytes } from 'crypto';
import { NextRequest } from 'next/server';

// Security configuration
export const SECURITY_CONFIG = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 1000,
  MAX_AMOUNT_USD: 10000,
  MIN_AMOUNT_USD: 1,
  ALLOWED_CURRENCIES: ['KES'],
  ALLOWED_COUNTRIES: ['KE'],
  PHONE_REGEX: /^(\+254|254|0)?([17]\d{8})$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  NAME_REGEX: /^[a-zA-Z\s]{2,50}$/,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
} as const;

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class SecurityValidator {
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (!email || typeof email !== 'string') {
      errors.push('Email is required and must be a string');
    } else if (!SECURITY_CONFIG.EMAIL_REGEX.test(email)) {
      errors.push('Invalid email format');
    } else if (email.length > 254) {
      errors.push('Email too long');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validatePhoneNumber(phone: string, country: string = 'KE'): ValidationResult {
    const errors: string[] = [];
    
    if (!phone || typeof phone !== 'string') {
      errors.push('Phone number is required and must be a string');
    } else if (!SECURITY_CONFIG.PHONE_REGEX.test(phone)) {
      errors.push('Invalid phone number format');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name || typeof name !== 'string') {
      errors.push('Name is required and must be a string');
    } else if (!SECURITY_CONFIG.NAME_REGEX.test(name)) {
      errors.push('Invalid name format (2-50 characters, letters and spaces only)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateAmount(amount: number, currency: string = 'USD'): ValidationResult {
    const errors: string[] = [];
    
    if (typeof amount !== 'number' || isNaN(amount)) {
      errors.push('Amount must be a valid number');
    } else if (amount < SECURITY_CONFIG.MIN_AMOUNT_USD) {
      errors.push(`Amount must be at least $${SECURITY_CONFIG.MIN_AMOUNT_USD}`);
    } else if (amount > SECURITY_CONFIG.MAX_AMOUNT_USD) {
      errors.push(`Amount cannot exceed $${SECURITY_CONFIG.MAX_AMOUNT_USD}`);
    }
    
    if (!SECURITY_CONFIG.ALLOWED_CURRENCIES.includes(currency as any)) {
      errors.push('Invalid currency');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateCountry(country: string): ValidationResult {
    const errors: string[] = [];
    
    if (!country || typeof country !== 'string') {
      errors.push('Country is required and must be a string');
    } else if (!SECURITY_CONFIG.ALLOWED_COUNTRIES.includes(country as any)) {
      errors.push('Invalid country code');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .substring(0, 1000); // Limit length
  }

  static validateTransactionData(data: any): ValidationResult {
    const errors: string[] = [];
    
    // Validate sender
    const senderNameValidation = this.validateName(data.sender?.name);
    const senderEmailValidation = this.validateEmail(data.sender?.email);
    
    // Validate receiver
    const receiverNameValidation = this.validateName(data.receiver?.name);
    const receiverPhoneValidation = this.validatePhoneNumber(data.receiver?.phone, data.receiver?.country);
    const receiverCountryValidation = this.validateCountry(data.receiver?.country);
    
    // Validate amounts
    const amountValidation = this.validateAmount(data.amounts?.usd, data.amounts?.localCurrency);
    
    // Collect all errors
    errors.push(...senderNameValidation.errors);
    errors.push(...senderEmailValidation.errors);
    errors.push(...receiverNameValidation.errors);
    errors.push(...receiverPhoneValidation.errors);
    errors.push(...receiverCountryValidation.errors);
    errors.push(...amountValidation.errors);
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export class RateLimiter {
  static checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const key = `${identifier}:${Math.floor(now / windowMs)}`;
    
    const current = rateLimitStore.get(key);
    
    if (!current || now > current.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (current.count >= limit) {
      return false;
    }
    
    current.count++;
    return true;
  }

  static isRateLimited(ip: string, endpoint: string): boolean {
    const identifier = `${ip}:${endpoint}`;
    return !this.checkRateLimit(identifier, SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE, 60 * 1000);
  }
}

export class SecurityUtils {
  static generateSecureId(): string {
    return randomBytes(32).toString('hex');
  }

  static hashData(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  static validateOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin');
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    if (!origin) return false;
    return allowedOrigins.includes(origin);
  }

  static getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           request.headers.get('x-real-ip') ||
           'unknown';
  }

  static createSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    };
  }
}

export class AuditLogger {
  static logSecurityEvent(event: string, details: any, ip?: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      ip,
      userAgent: details.userAgent,
      sessionId: details.sessionId,
    };
    
    // In production, send to secure logging service
    console.log('[SECURITY]', JSON.stringify(logEntry));
  }

  static logTransactionEvent(transactionId: string, event: string, details: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      transactionId,
      event,
      details,
    };
    
    console.log('[TRANSACTION]', JSON.stringify(logEntry));
  }
}
