// Environment configuration with validation
export const CONFIG = {
  // Application
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/xrp-remittance',
  
  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  
  // XRPL
  XRPL_NETWORK: process.env.XRPL_NETWORK || 'testnet',
  LIQUIDITY_WALLET_SEED: process.env.LIQUIDITY_WALLET_SEED,
  PARTNER_WALLET_ADDRESS: process.env.PARTNER_WALLET_ADDRESS,
  
  // M-Pesa
  MPESA_ENVIRONMENT: process.env.MPESA_ENVIRONMENT || 'sandbox',
  MPESA_CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET,
  MPESA_PASSKEY: process.env.MPESA_PASSKEY,
  MPESA_SHORTCODE: process.env.MPESA_SHORTCODE || '174379',
  MPESA_INITIATOR_NAME: process.env.MPESA_INITIATOR_NAME || 'testapi',
  MPESA_SECURITY_CREDENTIAL: process.env.MPESA_SECURITY_CREDENTIAL,
  
  // External APIs
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY,
  
  // Security
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  SESSION_SECRET: process.env.SESSION_SECRET,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_AUDIT_LOGS: process.env.ENABLE_AUDIT_LOGS === 'true',
} as const;

// Configuration validation
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required environment variables
  const requiredVars = [
    'MONGODB_URI',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'LIQUIDITY_WALLET_SEED',
    'PARTNER_WALLET_ADDRESS',
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_PASSKEY',
  ];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }
  
  // Validate MongoDB URI format
  if (CONFIG.MONGODB_URI && !CONFIG.MONGODB_URI.startsWith('mongodb://') && !CONFIG.MONGODB_URI.startsWith('mongodb+srv://')) {
    errors.push('Invalid MongoDB URI format');
  }
  
  // Validate XRPL network
  if (!['mainnet', 'testnet'].includes(CONFIG.XRPL_NETWORK)) {
    errors.push('Invalid XRPL network. Must be "mainnet" or "testnet"');
  }
  
  // Validate M-Pesa environment
  if (!['sandbox', 'production'].includes(CONFIG.MPESA_ENVIRONMENT)) {
    errors.push('Invalid M-Pesa environment. Must be "sandbox" or "production"');
  }
  
  // Validate port number
  if (CONFIG.PORT < 1 || CONFIG.PORT > 65535) {
    errors.push('Invalid port number. Must be between 1 and 65535');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Environment-specific configurations
export const ENV_CONFIG = {
  development: {
    enableDebugLogs: true,
    enableAuditLogs: true,
    corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
    },
  },
  production: {
    enableDebugLogs: false,
    enableAuditLogs: true,
    corsOrigins: CONFIG.ALLOWED_ORIGINS,
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    },
  },
  test: {
    enableDebugLogs: false,
    enableAuditLogs: false,
    corsOrigins: ['http://localhost:3000'],
    rateLimit: {
      requestsPerMinute: 1000,
      requestsPerHour: 10000,
    },
  },
} as const;

// Get current environment configuration
export function getEnvConfig() {
  return ENV_CONFIG[CONFIG.NODE_ENV as keyof typeof ENV_CONFIG] || ENV_CONFIG.development;
}

// Security configuration
export const SECURITY_CONFIG = {
  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: getEnvConfig().rateLimit.requestsPerMinute,
  MAX_REQUESTS_PER_HOUR: getEnvConfig().rateLimit.requestsPerHour,
  
  // Transaction limits
  MAX_AMOUNT_USD: 10000,
  MIN_AMOUNT_USD: 1,
  
  // Allowed values
  ALLOWED_CURRENCIES: ['USD', 'KES', 'EUR', 'GBP'] as const,
  ALLOWED_COUNTRIES: ['KE', 'US', 'GB', 'EU'] as const,
  
  // Validation patterns
  PHONE_REGEX: /^(\+254|254|0)?([17]\d{8})$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  NAME_REGEX: /^[a-zA-Z\s]{2,50}$/,
  
  // Session timeout (30 minutes)
  SESSION_TIMEOUT: 30 * 60 * 1000,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 1000, // 1 second
  RETRY_DELAY_MAX: 30000, // 30 seconds
} as const;

// Logging configuration
export const LOG_CONFIG = {
  level: CONFIG.LOG_LEVEL,
  enableAuditLogs: CONFIG.ENABLE_AUDIT_LOGS,
  enableDebugLogs: getEnvConfig().enableDebugLogs,
  
  // Log formats
  formats: {
    timestamp: 'YYYY-MM-DD HH:mm:ss',
    json: CONFIG.NODE_ENV === 'production',
  },
  
  // Log destinations
  destinations: {
    console: true,
    file: CONFIG.NODE_ENV === 'production',
    external: CONFIG.NODE_ENV === 'production',
  },
} as const;
