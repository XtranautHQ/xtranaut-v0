// Custom error classes for fintech application
export class FintechError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Validation errors
export class ValidationError extends FintechError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, true, details);
  }
}

// Authentication errors
export class AuthenticationError extends FintechError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401, true);
  }
}

// Authorization errors
export class AuthorizationError extends FintechError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403, true);
  }
}

// Rate limiting errors
export class RateLimitError extends FintechError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429, true);
  }
}

// Transaction errors
export class TransactionError extends FintechError {
  constructor(message: string, details?: any) {
    super(message, 'TRANSACTION_ERROR', 400, true, details);
  }
}

// XRPL errors
export class XRPLError extends FintechError {
  constructor(message: string, details?: any) {
    super(message, 'XRPL_ERROR', 500, true, details);
  }
}

// M-Pesa errors
export class MpesaError extends FintechError {
  constructor(message: string, details?: any) {
    super(message, 'MPESA_ERROR', 500, true, details);
  }
}

// Stripe errors
export class StripeError extends FintechError {
  constructor(message: string, details?: any) {
    super(message, 'STRIPE_ERROR', 500, true, details);
  }
}

// Database errors
export class DatabaseError extends FintechError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', 500, true, details);
  }
}

// External API errors
export class ExternalAPIError extends FintechError {
  constructor(message: string, details?: any) {
    super(message, 'EXTERNAL_API_ERROR', 502, true, details);
  }
}

// Configuration errors
export class ConfigurationError extends FintechError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', 500, false, details);
  }
}

// Error codes mapping
export const ERROR_CODES = {
  // Validation errors
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  INVALID_COUNTRY: 'INVALID_COUNTRY',
  INVALID_NAME: 'INVALID_NAME',
  
  // Transaction errors
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  TRANSACTION_ALREADY_EXISTS: 'TRANSACTION_ALREADY_EXISTS',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  TRANSACTION_TIMEOUT: 'TRANSACTION_TIMEOUT',
  
  // XRPL errors
  XRPL_CONNECTION_FAILED: 'XRPL_CONNECTION_FAILED',
  XRPL_TRANSACTION_FAILED: 'XRPL_TRANSACTION_FAILED',
  XRPL_INSUFFICIENT_FUNDS: 'XRPL_INSUFFICIENT_FUNDS',
  XRPL_INVALID_ADDRESS: 'XRPL_INVALID_ADDRESS',
  
  // M-Pesa errors
  MPESA_AUTHENTICATION_FAILED: 'MPESA_AUTHENTICATION_FAILED',
  MPESA_TRANSACTION_FAILED: 'MPESA_TRANSACTION_FAILED',
  MPESA_INVALID_PHONE: 'MPESA_INVALID_PHONE',
  MPESA_SERVICE_UNAVAILABLE: 'MPESA_SERVICE_UNAVAILABLE',
  
  // Stripe errors
  STRIPE_WEBHOOK_SIGNATURE_FAILED: 'STRIPE_WEBHOOK_SIGNATURE_FAILED',
  STRIPE_PAYMENT_FAILED: 'STRIPE_PAYMENT_FAILED',
  STRIPE_SESSION_EXPIRED: 'STRIPE_SESSION_EXPIRED',
  
  // Database errors
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED: 'DATABASE_QUERY_FAILED',
  DATABASE_TRANSACTION_FAILED: 'DATABASE_TRANSACTION_FAILED',
  
  // External API errors
  COINGECKO_API_ERROR: 'COINGECKO_API_ERROR',
  EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',
  
  // Security errors
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_ORIGIN: 'INVALID_ORIGIN',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  
  // Configuration errors
  MISSING_ENV_VARIABLE: 'MISSING_ENV_VARIABLE',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
} as const;

// Error handler
export class ErrorHandler {
  static handle(error: Error | FintechError): { message: string; code: string; statusCode: number; details?: any } {
    // If it's our custom error, return it as is
    if (error instanceof FintechError) {
      return {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      };
    }

    // Handle known error types
    if (error.name === 'ValidationError') {
      return {
        message: 'Validation failed',
        code: ERROR_CODES.INVALID_AMOUNT,
        statusCode: 400,
        details: error.message,
      };
    }

    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      return {
        message: 'Database operation failed',
        code: ERROR_CODES.DATABASE_QUERY_FAILED,
        statusCode: 500,
        details: error.message,
      };
    }

    // Handle network errors
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return {
        message: 'Network error occurred',
        code: ERROR_CODES.EXTERNAL_SERVICE_UNAVAILABLE,
        statusCode: 502,
        details: error.message,
      };
    }

    // Default error
    return {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    };
  }

  static isOperational(error: Error): boolean {
    if (error instanceof FintechError) {
      return error.isOperational;
    }
    return false;
  }

  static logError(error: Error | FintechError, context?: any): void {
    const errorInfo = this.handle(error);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...errorInfo,
      },
      context,
    };

    // Log based on error type
    if (errorInfo.statusCode >= 500) {
      console.error('[ERROR]', JSON.stringify(logEntry));
    } else {
      console.warn('[WARNING]', JSON.stringify(logEntry));
    }
  }
}

// Async error wrapper
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      ErrorHandler.logError(error as Error);
      throw error;
    }
  };
}

// Error response formatter
export function formatErrorResponse(error: Error | FintechError): {
  error: string;
  code: string;
  statusCode: number;
  details?: any;
} {
  const errorInfo = ErrorHandler.handle(error);
  
  return {
    error: errorInfo.message,
    code: errorInfo.code,
    statusCode: errorInfo.statusCode,
    ...(errorInfo.details && { details: errorInfo.details }),
  };
}
