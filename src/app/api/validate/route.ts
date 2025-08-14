import { NextRequest, NextResponse } from 'next/server';
import { SecurityValidator, SecurityUtils, AuditLogger, RateLimiter } from '@/lib/security';
import { fxRateService } from '@/services/fxRateService';

interface ValidationRequest {
  sender: {
    name: string;
    email: string;
  };
  receiver: {
    name: string;
    phone: string;
    country: string;
  };
  amounts: {
    usd: number;
    localCurrency: string;
  };
}

interface ValidationResponse {
  valid: boolean;
  errors?: {
    sender?: {
      name?: string;
      email?: string;
    };
    receiver?: {
      name?: string;
      phone?: string;
      country?: string;
    };
    amounts?: {
      usd?: string;
    };
  };
  warnings?: string[];
}

// Business logic validation rules (separate from security validation)
const BUSINESS_RULES = {
  BLACKLISTED_EMAILS: ['test@example.com', 'spam@test.com'],
  BLACKLISTED_PHONES: ['+1234567890', '+0987654321'],
  SUSPICIOUS_NAMES: ['test', 'demo', 'fake', 'spam'],
  DAILY_LIMIT_USD: 5000,
  NIGERIA_LIMIT_USD: 3000,
} as const;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIP = SecurityUtils.getClientIP(request);
    if (RateLimiter.isRateLimited(clientIP, 'validate')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', valid: false },
        { status: 429 }
      );
    }

    // Origin validation
    if (!SecurityUtils.validateOrigin(request)) {
      return NextResponse.json(
        { error: 'Invalid origin', valid: false },
        { status: 403 }
      );
    }

    const body: ValidationRequest = await request.json();
    const { sender, receiver, amounts } = body;

    const errors: ValidationResponse['errors'] = {};
    const warnings: string[] = [];

    // Step 1: Security Validation using SecurityValidator
    const securityValidation = SecurityValidator.validateTransactionData({
      sender: {
        name: sender.name,
        email: sender.email,
      },
      receiver: {
        name: receiver.name,
        phone: receiver.phone,
        country: receiver.country,
      },
      amounts: {
        usd: amounts.usd,
        localCurrency: amounts.localCurrency,
      },
    });

    if (!securityValidation.isValid) {
      // Convert security validation errors to structured format
      securityValidation.errors.forEach(error => {
        if (error.includes('name')) {
          if (error.includes('sender')) {
            errors.sender = { ...errors.sender, name: error };
          } else {
            errors.receiver = { ...errors.receiver, name: error };
          }
        } else if (error.includes('email')) {
          errors.sender = { ...errors.sender, email: error };
        } else if (error.includes('phone')) {
          errors.receiver = { ...errors.receiver, phone: error };
        } else if (error.includes('country')) {
          errors.receiver = { ...errors.receiver, country: error };
        } else if (error.includes('amount')) {
          errors.amounts = { ...errors.amounts, usd: error };
        }
      });
    }

    // Step 2: Business Logic Validation (separate from security)
    // Check for suspicious names
    if (sender.name && BUSINESS_RULES.SUSPICIOUS_NAMES.some((name: string) => sender.name.toLowerCase().includes(name))) {
      warnings.push('Sender name appears to be suspicious');
    }

    if (receiver.name && BUSINESS_RULES.SUSPICIOUS_NAMES.some((name: string) => receiver.name.toLowerCase().includes(name))) {
      warnings.push('Receiver name appears to be suspicious');
    }

    // Check blacklisted emails
    if (sender.email && BUSINESS_RULES.BLACKLISTED_EMAILS.includes(sender.email.toLowerCase() as any)) {
      errors.sender = { ...errors.sender, email: 'This email address is not allowed' };
    }

    // Check blacklisted phones
    if (receiver.phone && BUSINESS_RULES.BLACKLISTED_PHONES.includes(receiver.phone as any)) {
      errors.receiver = { ...errors.receiver, phone: 'This phone number is not allowed' };
    }

    // Additional business logic validations
    if (sender.email === receiver.phone) {
      warnings.push('Sender email and receiver phone appear to be the same');
    }

    // Step 3: External API validations (business rules)
    const externalValidations = await performExternalValidations(sender, receiver, amounts);
    
    if (externalValidations.errors) {
      Object.assign(errors, externalValidations.errors);
    }
    
    if (externalValidations.warnings) {
      warnings.push(...externalValidations.warnings);
    }

    const isValid = Object.keys(errors).length === 0;

    // Log validation attempt
    AuditLogger.logSecurityEvent('validation_attempt', {
      sender: { name: sender.name, email: sender.email },
      receiver: { name: receiver.name, phone: receiver.phone, country: receiver.country },
      amount: amounts.usd,
      isValid,
      errors: Object.keys(errors).length,
      warnings: warnings.length,
    }, clientIP);

    const response: ValidationResponse = {
      valid: isValid,
      ...(Object.keys(errors).length > 0 && { errors }),
      ...(warnings.length > 0 && { warnings }),
    };

    // Add security headers
    const responseObj = NextResponse.json(response);
    Object.entries(SecurityUtils.createSecurityHeaders()).forEach(([key, value]) => {
      responseObj.headers.set(key, value);
    });

    return responseObj;

  } catch (error) {
    console.error('Validation API error:', error);
    
    // Log security event
    AuditLogger.logSecurityEvent('validation_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, SecurityUtils.getClientIP(request));

    return NextResponse.json(
      { error: 'Validation failed', valid: false },
      { status: 500 }
    );
  }
}

async function performExternalValidations(
  sender: ValidationRequest['sender'],
  receiver: ValidationRequest['receiver'],
  amounts: ValidationRequest['amounts']
): Promise<{ errors?: any; warnings?: string[] }> {
  const errors: any = {};
  const warnings: string[] = [];

  try {
    // Simulate KYC validation for sender
    const senderKYC = await validateSenderKYC(sender);
    if (!senderKYC.valid) {
      errors.sender = { ...errors.sender, ...senderKYC.errors };
    }

    // Simulate receiver validation (e.g., M-PESA number validation for Kenya)
    if (receiver.country === 'KE') {
      const receiverValidation = await validateKenyanPhone(receiver.phone);
      if (!receiverValidation.valid) {
        errors.receiver = { ...errors.receiver, phone: receiverValidation.error };
      }
    }

    // Simulate amount validation (e.g., daily limits, risk scoring)
    const amountValidation = await validateAmount(amounts.usd, sender.email);
    if (!amountValidation.valid) {
      errors.amounts = { ...errors.amounts, usd: amountValidation.error };
    }

           // Validate country and get real FX rate
       const countryValidation = await validateCountryTransfer(receiver.country, amounts.usd);
       if (!countryValidation.valid) {
         errors.receiver = { ...errors.receiver, country: countryValidation.error };
       }

       // Get real FX rate for the country
       try {
         const fxRateData = await fxRateService.getExchangeRate(amounts.localCurrency);
         console.log(`FX Rate for ${amounts.localCurrency}:`, fxRateData.usdToLocal);
       } catch (error) {
         console.warn(`Failed to fetch FX rate for ${amounts.localCurrency}:`, error);
       }

  } catch (error) {
    console.error('External validation error:', error);
    warnings.push('Some validations could not be completed');
  }

  return { errors: Object.keys(errors).length > 0 ? errors : undefined, warnings };
}

async function validateSenderKYC(sender: ValidationRequest['sender']) {
  // Simulate KYC validation
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simulate some KYC failures
  if (sender.email.includes('blocked')) {
    return {
      valid: false,
      errors: { email: 'Account is blocked due to compliance issues' }
    };
  }

  return { valid: true };
}

async function validateKenyanPhone(phone: string) {
  // Simulate M-PESA number validation
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Check if it's a valid Kenyan phone number format
  const kenyanPhoneRegex = /^(\+254|0)[17]\d{8}$/;
  if (!kenyanPhoneRegex.test(phone)) {
    return {
      valid: false,
      error: 'Invalid Kenyan phone number format'
    };
  }

  return { valid: true };
}

async function validateAmount(amount: number, senderEmail: string) {
  // Simulate amount validation
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Check daily limit using business rules
  if (amount > BUSINESS_RULES.DAILY_LIMIT_USD) {
    return {
      valid: false,
      error: `Amount exceeds daily limit of $${BUSINESS_RULES.DAILY_LIMIT_USD}`
    };
  }

  return { valid: true };
}

async function validateCountryTransfer(country: string, amount: number) {
  // Simulate country-specific transfer validation
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Check country-specific limits using business rules
  if (country === 'NG' && amount > BUSINESS_RULES.NIGERIA_LIMIT_USD) {
    return {
      valid: false,
      error: `Amount exceeds limit of $${BUSINESS_RULES.NIGERIA_LIMIT_USD} for Nigeria transfers`
    };
  }

  return { valid: true };
}
