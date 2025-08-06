import PartnerWallet from '@/lib/models/PartnerWallet';
import ExchangeRate from '@/lib/models/ExchangeRate';
import connectDB from '@/lib/mongoose';

export class InitializationService {
  
  /**
   * Initialize partner wallets in the database
   */
  async initializePartnerWallets(): Promise<void> {
    try {
      await connectDB();
      
      const wallets = [
        {
          address: process.env.KENYA_PARTNER_WALLET_ADDRESS || 'rDemoKenyaPartnerWallet123456789',
          country: 'Kenya',
          currency: 'KES',
          isActive: true,
          balance: 1000
        },
        {
          address: process.env.UGANDA_PARTNER_WALLET_ADDRESS || 'rDemoUgandaPartnerWallet123456789',
          country: 'Uganda',
          currency: 'UGX',
          isActive: true,
          balance: 1000
        },
        {
          address: process.env.TANZANIA_PARTNER_WALLET_ADDRESS || 'rDemoTanzaniaPartnerWallet123456789',
          country: 'Tanzania',
          currency: 'TZS',
          isActive: true,
          balance: 1000
        },
        {
          address: process.env.RWANDA_PARTNER_WALLET_ADDRESS || 'rDemoRwandaPartnerWallet123456789',
          country: 'Rwanda',
          currency: 'RWF',
          isActive: true,
          balance: 1000
        }
      ];
      
      for (const walletData of wallets) {
        await PartnerWallet.findOneAndUpdate(
          { address: walletData.address },
          walletData,
          { upsert: true, new: true }
        );
      }
      
      console.log('Partner wallets initialized successfully');
      
    } catch (error) {
      console.error('Error initializing partner wallets:', error);
      throw error;
    }
  }
  
  /**
   * Initialize sample exchange rates
   */
  async initializeSampleRates(): Promise<void> {
    try {
      await connectDB();
      
      const rates = [
        {
          from: 'XRP',
          to: 'USD',
          rate: 0.52,
          source: 'CoinGecko API',
          isActive: true
        },
        {
          from: 'USD',
          to: 'KES',
          rate: 158.45,
          source: 'Central Bank of Kenya',
          isActive: true
        },
        {
          from: 'USD',
          to: 'UGX',
          rate: 3650,
          source: 'Bank of Uganda',
          isActive: true
        },
        {
          from: 'USD',
          to: 'TZS',
          rate: 2450,
          source: 'Bank of Tanzania',
          isActive: true
        },
        {
          from: 'USD',
          to: 'RWF',
          rate: 1250,
          source: 'National Bank of Rwanda',
          isActive: true
        }
      ];
      
      for (const rateData of rates) {
        const newRate = new ExchangeRate(rateData);
        await newRate.save();
      }
      
      console.log('Sample exchange rates initialized successfully');
      
    } catch (error) {
      console.error('Error initializing sample rates:', error);
      throw error;
    }
  }
  
  /**
   * Check database health
   */
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      await connectDB();
      
      // Test basic operations
      const walletCount = await PartnerWallet.countDocuments();
      const rateCount = await ExchangeRate.countDocuments();
      
      console.log(`Database health check: ${walletCount} wallets, ${rateCount} rates`);
      return true;
      
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
  
  /**
   * Initialize everything needed for the application
   */
  async initializeApplication(): Promise<void> {
    try {
      console.log('Initializing application...');
      
      await this.checkDatabaseHealth();
      await this.initializePartnerWallets();
      
      console.log('Application initialized successfully');
      
    } catch (error) {
      console.error('Application initialization failed:', error);
      throw error;
    }
  }
}

// Singleton instance
export const initializationService = new InitializationService();