import { createHash } from 'crypto';

export function generateIdempotencyKey(): string {
  return `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateFXRateHash(
  usdToXrp: number,
  usdToLocal: number,
  timestamp: Date,
  feePercentage: number
): string {
  const data = `${usdToXrp}:${usdToLocal}:${timestamp.toISOString()}:${feePercentage}`;
  return createHash('sha256').update(data).digest('hex');
}

export function calculateRetryDelay(retryCount: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s...
  return Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
}

export function shouldRetry(status: string, retryCount: number, maxRetries: number): boolean {
  return (
    (status === 'failed' || status === 'mpesa_processing') &&
    retryCount < maxRetries
  );
}

export function isRetryableError(error: string): boolean {
  const retryableErrors = [
    'network timeout',
    'insufficient funds',
    'service unavailable',
    'rate limit exceeded',
    'temporary error'
  ];
  
  return retryableErrors.some(retryableError => 
    error.toLowerCase().includes(retryableError.toLowerCase())
  );
}
