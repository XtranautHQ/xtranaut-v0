import axios from 'axios';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  source: string;
}

export interface CurrencyConversionResult {
  success: boolean;
  rate?: number;
  convertedAmount?: number;
  error?: string;
  source?: string;
}

export class CurrencyService {
  private cachedRates: Map<string, ExchangeRate> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Get XRP to USD exchange rate
   */
  async getXrpToUsdRate(): Promise<CurrencyConversionResult> {
    const cacheKey = 'XRP_USD';
    
    // Check cache first
    const cached = this.getCachedRate(cacheKey);
    if (cached) {
      return {
        success: true,
        rate: cached.rate,
        source: cached.source
      };
    }
    
    try {
      // For MVP: Use simulated rate with realistic fluctuation
      // In production: Use CoinGecko or other crypto API
      const simulatedRate = await this.getSimulatedXrpRate();
      
      const exchangeRate: ExchangeRate = {
        from: 'XRP',
        to: 'USD',
        rate: simulatedRate,
        timestamp: new Date(),
        source: 'Simulated CoinGecko API'
      };
      
      this.cachedRates.set(cacheKey, exchangeRate);
      
      return {
        success: true,
        rate: simulatedRate,
        source: exchangeRate.source
      };
      
    } catch (error) {
      console.error('Error fetching XRP/USD rate:', error);
      return {
        success: false,
        error: 'Failed to fetch XRP/USD exchange rate'
      };
    }
  }
  
  /**
   * Get USD to KES exchange rate
   */
  async getUsdToKesRate(): Promise<CurrencyConversionResult> {
    const cacheKey = 'USD_KES';
    
    // Check cache first
    const cached = this.getCachedRate(cacheKey);
    if (cached) {
      return {
        success: true,
        rate: cached.rate,
        source: cached.source
      };
    }
    
    try {
      // For MVP: Use simulated rate with realistic fluctuation
      // In production: Use Central Bank of Kenya API or forex API
      const simulatedRate = await this.getSimulatedKesRate();
      
      const exchangeRate: ExchangeRate = {
        from: 'USD',
        to: 'KES',
        rate: simulatedRate,
        timestamp: new Date(),
        source: 'Simulated CBK API'
      };
      
      this.cachedRates.set(cacheKey, exchangeRate);
      
      return {
        success: true,
        rate: simulatedRate,
        source: exchangeRate.source
      };
      
    } catch (error) {
      console.error('Error fetching USD/KES rate:', error);
      return {
        success: false,
        error: 'Failed to fetch USD/KES exchange rate'
      };
    }
  }
  
  /**
   * Convert XRP amount to KES
   */
  async convertXrpToKes(xrpAmount: number): Promise<CurrencyConversionResult> {
    try {
      const [xrpUsdResult, usdKesResult] = await Promise.all([
        this.getXrpToUsdRate(),
        this.getUsdToKesRate()
      ]);
      
      if (!xrpUsdResult.success || !usdKesResult.success) {
        return {
          success: false,
          error: 'Failed to fetch required exchange rates'
        };
      }
      
      const xrpToUsdRate = xrpUsdResult.rate!;
      const usdToKesRate = usdKesResult.rate!;
      
      const usdAmount = xrpAmount * xrpToUsdRate;
      const kesAmount = usdAmount * usdToKesRate;
      
      return {
        success: true,
        convertedAmount: kesAmount,
        rate: xrpToUsdRate * usdToKesRate, // Combined rate
        source: `${xrpUsdResult.source} + ${usdKesResult.source}`
      };
      
    } catch (error) {
      console.error('Error converting XRP to KES:', error);
      return {
        success: false,
        error: 'Currency conversion failed'
      };
    }
  }
  
  /**
   * Convert USD amount to XRP
   */
  async convertUsdToXrp(usdAmount: number): Promise<CurrencyConversionResult> {
    try {
      const rateResult = await this.getXrpToUsdRate();
      
      if (!rateResult.success) {
        return {
          success: false,
          error: 'Failed to fetch XRP/USD exchange rate'
        };
      }
      
      const xrpAmount = usdAmount / rateResult.rate!;
      
      return {
        success: true,
        convertedAmount: xrpAmount,
        rate: 1 / rateResult.rate!, // USD to XRP rate
        source: rateResult.source
      };
      
    } catch (error) {
      console.error('Error converting USD to XRP:', error);
      return {
        success: false,
        error: 'Currency conversion failed'
      };
    }
  }
  
  /**
   * Get simulated XRP rate with realistic fluctuation
   */
  private async getSimulatedXrpRate(): Promise<number> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Base rate around $0.52 with realistic fluctuation
    const baseRate = 0.52;
    const fluctuation = (Math.random() - 0.5) * 0.08; // ±4% fluctuation
    const rate = baseRate + fluctuation;
    
    return Math.round(rate * 10000) / 10000; // Round to 4 decimal places
  }
  
  /**
   * Get simulated KES rate with realistic fluctuation
   */
  private async getSimulatedKesRate(): Promise<number> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));
    
    // Base rate around 158.45 KES per USD with realistic fluctuation
    const baseRate = 158.45;
    const fluctuation = (Math.random() - 0.5) * 2; // ±1 KES fluctuation
    const rate = baseRate + fluctuation;
    
    return Math.round(rate * 100) / 100; // Round to 2 decimal places
  }
  
  /**
   * Real API implementation for XRP rate (for production)
   */
  private async getRealXrpRate(): Promise<number> {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd'
      );
      
      return response.data.ripple.usd;
      
    } catch (error) {
      console.error('Error fetching real XRP rate:', error);
      throw error;
    }
  }
  
  /**
   * Real API implementation for KES rate (for production)
   */
  private async getRealKesRate(): Promise<number> {
    try {
      // Use a forex API like exchangerate-api.com
      const response = await axios.get(
        `https://api.exchangerate-api.com/v4/latest/USD`
      );
      
      return response.data.rates.KES;
      
    } catch (error) {
      console.error('Error fetching real KES rate:', error);
      throw error;
    }
  }
  
  /**
   * Get cached rate if still valid
   */
  private getCachedRate(key: string): ExchangeRate | null {
    const cached = this.cachedRates.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp.getTime() > this.cacheExpiry;
    if (isExpired) {
      this.cachedRates.delete(key);
      return null;
    }
    
    return cached;
  }
  
  /**
   * Clear all cached rates
   */
  clearCache(): void {
    this.cachedRates.clear();
  }
  
  /**
   * Get all current rates
   */
  async getAllRates(): Promise<{
    xrpToUsd: CurrencyConversionResult;
    usdToKes: CurrencyConversionResult;
  }> {
    const [xrpToUsd, usdToKes] = await Promise.all([
      this.getXrpToUsdRate(),
      this.getUsdToKesRate()
    ]);
    
    return { xrpToUsd, usdToKes };
  }
}

// Singleton instance
export const currencyService = new CurrencyService();