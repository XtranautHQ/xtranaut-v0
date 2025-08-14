interface FXRateResponse {
  success: boolean;
  rates?: Record<string, number>;
  error?: string;
  timestamp?: number;
  base?: string;
}

interface FXRateData {
  usdToLocal: number;
  source: string;
  timestamp: Date;
  lastUpdated: string;
}

class FXRateService {
  private cache: Map<string, { data: FXRateData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly API_KEY = process.env.EXCHANGE_RATE_API_KEY;
  private readonly BASE_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

  /**
   * Get real-time exchange rate for USD to target currency
   */
  async getExchangeRate(targetCurrency: string): Promise<FXRateData> {
    const cacheKey = `USD_${targetCurrency}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(this.BASE_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FXRateResponse = await response.json();
      
      if (!data.success && !data.rates) {
        throw new Error(data.error || 'Failed to fetch exchange rates');
      }

      const rate = data.rates?.[targetCurrency];
      if (!rate) {
        throw new Error(`Exchange rate not available for ${targetCurrency}`);
      }

      const fxRateData: FXRateData = {
        usdToLocal: rate,
        source: 'ExchangeRate-API',
        timestamp: new Date(),
        lastUpdated: new Date().toISOString(),
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: fxRateData,
        timestamp: Date.now(),
      });

      return fxRateData;

    } catch (error) {
      console.error('FX Rate API Error:', error);
      
      // Fallback to static rates if API fails
      return this.getFallbackRate(targetCurrency);
    }
  }

  /**
   * Get exchange rates for multiple currencies
   */
  async getMultipleRates(currencies: string[]): Promise<Record<string, FXRateData>> {
    const rates: Record<string, FXRateData> = {};
    
    // Fetch rates in parallel
    const promises = currencies.map(async (currency) => {
      try {
        const rate = await this.getExchangeRate(currency);
        rates[currency] = rate;
      } catch (error) {
        console.error(`Failed to fetch rate for ${currency}:`, error);
        // Use fallback rate
        rates[currency] = this.getFallbackRate(currency);
      }
    });

    await Promise.all(promises);
    return rates;
  }

  /**
   * Get all supported currencies with their current rates
   */
  async getAllRates(): Promise<Record<string, number>> {
    try {
      const response = await fetch(this.BASE_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FXRateResponse = await response.json();
      
      if (!data.success && !data.rates) {
        throw new Error(data.error || 'Failed to fetch exchange rates');
      }

      return data.rates || {};

    } catch (error) {
      console.error('FX Rate API Error:', error);
      return this.getFallbackRates();
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Fallback rates when API is unavailable
   */
  private getFallbackRate(currency: string): FXRateData {
    const fallbackRates: Record<string, number> = {
      'KES': 160.5,  // Kenya Shilling
      'NGN': 1500.0, // Nigerian Naira
      'GHS': 12.5,   // Ghanaian Cedi
      'UGX': 3800.0, // Ugandan Shilling
      'TZS': 2500.0, // Tanzanian Shilling
      'EUR': 0.92,   // Euro
      'GBP': 0.79,   // British Pound
      'JPY': 148.5,  // Japanese Yen
      'CAD': 1.35,   // Canadian Dollar
      'AUD': 1.52,   // Australian Dollar
    };

    const rate = fallbackRates[currency] || 1.0;
    
    return {
      usdToLocal: rate,
      source: 'Fallback Rate (API Unavailable)',
      timestamp: new Date(),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get all fallback rates
   */
  private getFallbackRates(): Record<string, number> {
    return {
      'KES': 160.5,
      'NGN': 1500.0,
      'GHS': 12.5,
      'UGX': 3800.0,
      'TZS': 2500.0,
      'EUR': 0.92,
      'GBP': 0.79,
      'JPY': 148.5,
      'CAD': 1.35,
      'AUD': 1.52,
    };
  }
}

// Export singleton instance
export const fxRateService = new FXRateService();

// Export types
export type { FXRateData, FXRateResponse };
