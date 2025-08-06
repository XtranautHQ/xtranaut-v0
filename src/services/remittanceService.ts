import RemittanceTransaction, { IRemittanceTransaction } from '@/lib/models/RemittanceTransaction';
import ExchangeRate from '@/lib/models/ExchangeRate';
import PartnerWallet from '@/lib/models/PartnerWallet';
import { xrpService } from './xrpService';
import { mpesaService } from './mpesaService';
import { currencyService } from './currencyService';
import { notificationService } from './notificationService';
import connectDB from '@/lib/mongoose';

export interface RemittanceRequest {
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientPhone: string;
  usdAmount: number;
  country: string;
  metadata?: any;
}

export interface RemittanceResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  transaction?: IRemittanceTransaction;
}

export class RemittanceService {
  
  /**
   * Process the complete remittance workflow
   */
  async processRemittance(request: RemittanceRequest): Promise<RemittanceResult> {
    let transaction: IRemittanceTransaction | null = null;
    
    try {
      // Ensure database connection
      await connectDB();
      
      // Step 1: Initialize transaction
      transaction = await this.initializeTransaction(request);
      await transaction.updateStage('initiated', 'completed');
      
      // Step 2: Convert USD to XRP and send to partner wallet
      await transaction.updateStage('xrpSend', 'processing');
      const xrpResult = await this.sendXrpToPartner(transaction);
      
      if (!xrpResult.success) {
        await transaction.fail('xrpSend', xrpResult.error || 'XRP send failed');
        return { success: false, error: xrpResult.error, transactionId: transaction._id };
      }
      
      // Update XRP send success
      await transaction.updateStage('xrpSend', 'completed', {
        xrpTxHash: xrpResult.txHash,
        partnerWalletAddress: xrpService.getPartnerWalletAddress(transaction.country)
      });
      
      // Step 3: Convert XRP to KES
      await transaction.updateStage('kesConversion', 'processing');
      const conversionResult = await this.convertXrpToKes(transaction);
      
      if (!conversionResult.success) {
        await transaction.fail('kesConversion', conversionResult.error || 'Currency conversion failed');
        return { success: false, error: conversionResult.error, transactionId: transaction._id };
      }
      
      transaction.kesAmount = conversionResult.convertedAmount!;
      await transaction.updateStage('kesConversion', 'completed', {
        kesAmount: conversionResult.convertedAmount
      });
      
      // Step 4: Send KES via M-Pesa
      await transaction.updateStage('mpesaPayment', 'processing');
      const mpesaResult = await this.sendMpesaPayment(transaction);
      
      if (!mpesaResult.success) {
        await transaction.fail('mpesaPayment', mpesaResult.error || 'M-Pesa payment failed');
        return { success: false, error: mpesaResult.error, transactionId: transaction._id };
      }
      
      // Update M-Pesa payment success
      await transaction.updateStage('mpesaPayment', 'completed', {
        mpesaTransactionId: mpesaResult.transactionId,
        mpesaCode: mpesaResult.mpesaCode
      });
      
      // Step 5: Send success notification
      await transaction.updateStage('notification', 'processing');
      const notificationResult = await notificationService.sendSuccessNotification(transaction);
      
      if (notificationResult.success) {
        await transaction.updateStage('notification', 'completed');
      } else {
        await transaction.updateStage('notification', 'failed');
      }
      
      // Complete transaction
      await transaction.complete();
      
      return {
        success: true,
        transactionId: transaction._id,
        transaction
      };
      
    } catch (error) {
      console.error('Remittance processing error:', error);
      
      if (transaction) {
        await transaction.fail(
          'system', 
          error instanceof Error ? error.message : 'System error'
        );
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        transactionId: transaction?._id
      };
    }
  }
  
  /**
   * Initialize a new remittance transaction
   */
  private async initializeTransaction(request: RemittanceRequest): Promise<IRemittanceTransaction> {
    // Get current exchange rates
    const rates = await currencyService.getAllRates();
    
    if (!rates.xrpToUsd.success || !rates.usdToKes.success) {
      throw new Error('Failed to fetch current exchange rates');
    }
    
    const xrpToUsdRate = rates.xrpToUsd.rate!;
    const usdToKesRate = rates.usdToKes.rate!;
    
    // Calculate amounts
    const serviceFeeUSD = 0.25 * xrpToUsdRate; // 0.25 XRP fee in USD
    const usdAmountAfterFee = request.usdAmount - serviceFeeUSD;
    const xrpAmount = usdAmountAfterFee / xrpToUsdRate;
    const kesAmount = usdAmountAfterFee * usdToKesRate;
    
    // Create new transaction using Mongoose model
    const transaction = new RemittanceTransaction({
      _id: this.generateTransactionId(),
      senderName: request.senderName,
      senderEmail: request.senderEmail,
      recipientName: request.recipientName,
      recipientPhone: request.recipientPhone,
      usdAmount: request.usdAmount,
      xrpAmount,
      kesAmount,
      fees: {
        serviceFeeUSD,
        networkFeeXRP: 0.0002
      },
      rates: {
        xrpToUsd: xrpToUsdRate,
        usdToKes: usdToKesRate
      },
      status: 'processing',
      country: request.country,
      metadata: request.metadata
    });
    
    // Save exchange rates to database for historical tracking
    await this.saveExchangeRates(xrpToUsdRate, usdToKesRate, rates);
    
    // Save and return transaction
    return await transaction.save();
  }
  
  /**
   * Save exchange rates for historical tracking
   */
  private async saveExchangeRates(xrpToUsdRate: number, usdToKesRate: number, rates: any): Promise<void> {
    try {
      await Promise.all([
        new ExchangeRate({
          from: 'XRP',
          to: 'USD',
          rate: xrpToUsdRate,
          source: rates.xrpToUsd.source
        }).save(),
        new ExchangeRate({
          from: 'USD',
          to: 'KES',
          rate: usdToKesRate,
          source: rates.usdToKes.source
        }).save()
      ]);
    } catch (error) {
      console.error('Error saving exchange rates:', error);
      // Don't throw error as this is not critical for transaction processing
    }
  }

  /**
   * Send XRP to partner wallet
   */
  private async sendXrpToPartner(transaction: IRemittanceTransaction) {
    try {
      const result = await xrpService.sendToPartnerWallet(transaction);
      
      if (result.success && result.txHash) {
        transaction.stages.xrpSend.partnerWalletAddress = xrpService.getPartnerWalletAddress(transaction.country);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error sending XRP to partner:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'XRP send failed'
      };
    }
  }
  
  /**
   * Convert XRP to KES
   */
  private async convertXrpToKes(transaction: IRemittanceTransaction) {
    try {
      const result = await currencyService.convertXrpToKes(transaction.xrpAmount);
      return result;
      
    } catch (error) {
      console.error('Error converting XRP to KES:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Currency conversion failed'
      };
    }
  }
  
  /**
   * Send M-Pesa payment
   */
  private async sendMpesaPayment(transaction: IRemittanceTransaction) {
    try {
      const paymentRequest = {
        phoneNumber: transaction.recipientPhone,
        amount: transaction.kesAmount,
        reference: transaction._id,
        description: `Money transfer from ${transaction.senderName}`
      };
      
      const result = await mpesaService.sendMoney(paymentRequest);
      return result;
      
    } catch (error) {
      console.error('Error sending M-Pesa payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'M-Pesa payment failed'
      };
    }
  }
  

  
  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TXN${timestamp}${random}`;
  }
  
  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<IRemittanceTransaction | null> {
    try {
      await connectDB();
      return await RemittanceTransaction.findById(transactionId);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }
  
  /**
   * Get transactions by sender email
   */
  async getTransactionsBySender(senderEmail: string): Promise<IRemittanceTransaction[]> {
    try {
      await connectDB();
      return await RemittanceTransaction.findBySender(senderEmail);
    } catch (error) {
      console.error('Error fetching transactions by sender:', error);
      return [];
    }
  }
  
  /**
   * Get pending transactions for monitoring
   */
  async getPendingTransactions(): Promise<IRemittanceTransaction[]> {
    try {
      await connectDB();
      return await RemittanceTransaction.getPendingTransactions();
    } catch (error) {
      console.error('Error fetching pending transactions:', error);
      return [];
    }
  }
  
  /**
   * Get transaction statistics
   */
  async getTransactionStats(hours: number = 24): Promise<any[]> {
    try {
      await connectDB();
      const timeframe = new Date(Date.now() - hours * 60 * 60 * 1000);
      return await RemittanceTransaction.getTransactionStats(timeframe);
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
      return [];
    }
  }
}

// Singleton instance
export const remittanceService = new RemittanceService();