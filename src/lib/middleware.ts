import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter, SecurityUtils, AuditLogger, SecurityValidator } from './security';

export async function securityMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const clientIP = SecurityUtils.getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const endpoint = request.nextUrl.pathname;

  // Rate limiting
  if (RateLimiter.isRateLimited(clientIP, endpoint)) {
    AuditLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      ip: clientIP,
      endpoint,
      userAgent,
    }, clientIP);

    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  // Origin validation for sensitive endpoints
  if (endpoint.startsWith('/api/') && !SecurityUtils.validateOrigin(request)) {
    AuditLogger.logSecurityEvent('INVALID_ORIGIN', {
      ip: clientIP,
      endpoint,
      origin: request.headers.get('origin'),
      userAgent,
    }, clientIP);

    return NextResponse.json(
      { error: 'Invalid origin' },
      { status: 403 }
    );
  }

  // Add security headers
  const response = NextResponse.next();
  const securityHeaders = SecurityUtils.createSecurityHeaders();
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return null; // Continue with the request
}

export async function validateTransactionRequest(request: NextRequest): Promise<NextResponse | null> {
  try {
    const body = await request.json();
    
    // Validate transaction data
    const validation = SecurityValidator.validateTransactionData(body);
    
    if (!validation.isValid) {
      const clientIP = SecurityUtils.getClientIP(request);
      
      AuditLogger.logSecurityEvent('INVALID_TRANSACTION_DATA', {
        ip: clientIP,
        errors: validation.errors,
        userAgent: request.headers.get('user-agent'),
      }, clientIP);

      return NextResponse.json(
        { error: 'Invalid transaction data', details: validation.errors },
        { status: 400 }
      );
    }

    // Sanitize input data
    if (body.sender?.name) {
      body.sender.name = SecurityValidator.sanitizeInput(body.sender.name);
    }
    if (body.sender?.email) {
      body.sender.email = SecurityValidator.sanitizeInput(body.sender.email);
    }
    if (body.receiver?.name) {
      body.receiver.name = SecurityValidator.sanitizeInput(body.receiver.name);
    }
    if (body.receiver?.phone) {
      body.receiver.phone = SecurityValidator.sanitizeInput(body.receiver.phone);
    }

    // Replace the request body with sanitized data
    const newRequest = new NextRequest(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(body),
    });

    return null; // Continue with the request
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export function createSecureResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  
  // Add security headers
  const securityHeaders = SecurityUtils.createSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export function createErrorResponse(error: string, status: number = 400, details?: any): NextResponse {
  const response = NextResponse.json(
    { error, ...(details && { details }) },
    { status }
  );

  // Add security headers
  const securityHeaders = SecurityUtils.createSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
