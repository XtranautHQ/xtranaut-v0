import axios from 'axios';

export interface MpesaPaymentRequest {
  phoneNumber: string;
  amount: number;
  reference: string;
  description: string;
}

export interface MpesaPaymentResult {
  success: boolean;
  transactionId?: string;
  mpesaCode?: string;
  error?: string;
  rawResponse?: any;
}

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

export class MpesaService {
  private config: MpesaConfig;
  private accessToken?: string;
  private tokenExpiry?: Date;
  
  constructor() {
    this.config = {
      consumerKey: process.env.MPESA_CONSUMER_KEY || 'demo_consumer_key',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET || 'demo_consumer_secret',
      businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE || '174379',
      passkey: process.env.MPESA_PASSKEY || 'demo_passkey',
      callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://yourdomain.com/api/mpesa/callback',
      environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
    };
  }
  
  /**
   * Get base URL for M-Pesa API based on environment
   */
  private getBaseUrl(): string {
    return this.config.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }
  
  /**
   * Get access token for M-Pesa API
   */
  private async getAccessToken(): Promise<string> {
    // Check if current token is still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }
    
    try {
      const credentials = Buffer.from(
        `${this.config.consumerKey}:${this.config.consumerSecret}`
      ).toString('base64');
      
      const response = await axios.get(
        `${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            'Authorization': `Basic ${credentials}`
          }
        }
      );
      
      this.accessToken = response.data.access_token;
      // Token typically expires in 1 hour
      this.tokenExpiry = new Date(Date.now() + 3600 * 1000);
      
      return this.accessToken;
      
    } catch (error) {
      console.error('Error getting M-Pesa access token:', error);
      throw new Error('Failed to authenticate with M-Pesa API');
    }
  }
  
  /**
   * Generate password for STK Push
   */
  private generatePassword(): string {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(
      `${this.config.businessShortCode}${this.config.passkey}${timestamp}`
    ).toString('base64');
    
    return password;
  }
  
  /**
   * Get current timestamp in M-Pesa format
   */
  private getTimestamp(): string {
    return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  }
  
  /**
   * Format phone number to M-Pesa format (254XXXXXXXXX)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-numeric characters
    let formatted = phoneNumber.replace(/[^0-9]/g, '');
    
    // Handle different formats
    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.substring(1);
    } else if (!formatted.startsWith('254')) {
      formatted = '254' + formatted;
    }
    
    return formatted;
  }
  
  /**
   * Send money via STK Push (Customer to Business)
   */
  async sendMoney(request: MpesaPaymentRequest): Promise<MpesaPaymentResult> {
    try {
      // For MVP: Simulate M-Pesa payment
      // In production, you would use actual M-Pesa STK Push API
      return await this.simulatePayment(request);
      
    } catch (error) {
      console.error('Error sending M-Pesa payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Simulate M-Pesa payment for MVP
   */
  private async simulatePayment(request: MpesaPaymentRequest): Promise<MpesaPaymentResult> {
    // Validate phone number
    const formattedPhone = this.formatPhoneNumber(request.phoneNumber);
    if (!formattedPhone.match(/^254[7][0-9]{8}$/)) {
      return {
        success: false,
        error: 'Invalid Kenyan phone number format'
      };
    }
    
    // Validate amount
    if (request.amount < 1 || request.amount > 150000) {
      return {
        success: false,
        error: 'Amount must be between KES 1 and KES 150,000'
      };
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 5000));
    
    // Simulate different scenarios based on phone number
    if (formattedPhone.includes('000')) {
      return {
        success: false,
        error: 'Invalid phone number or recipient not registered with M-Pesa'
      };
    }
    
    if (formattedPhone.includes('999')) {
      return {
        success: false,
        error: 'Transaction failed - insufficient funds or cancelled by user'
      };
    }
    
    // Simulate 92% success rate for valid requests
    if (Math.random() > 0.08) {
      const transactionId = 'MP' + Date.now().toString() + Math.random().toString(36).substring(2, 5).toUpperCase();
      const mpesaCode = 'M' + Math.random().toString(36).substring(2, 8).toUpperCase() + Math.floor(Math.random() * 10000);
      
      return {
        success: true,
        transactionId,
        mpesaCode,
        rawResponse: {
          ResultCode: '0',
          ResultDesc: 'Success',
          TransactionID: transactionId,
          MpesaReceiptNumber: mpesaCode
        }
      };
    } else {
      return {
        success: false,
        error: 'Transaction timeout or network error'
      };
    }
  }
  
  /**
   * Real STK Push implementation (for production)
   */
  private async performRealStkPush(request: MpesaPaymentRequest): Promise<MpesaPaymentResult> {
    const accessToken = await this.getAccessToken();
    const timestamp = this.getTimestamp();
    const password = this.generatePassword();
    
    const stkPushData = {
      BusinessShortCode: this.config.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerBuyGoodsOnline',
      Amount: Math.round(request.amount),
      PartyA: this.formatPhoneNumber(request.phoneNumber),
      PartyB: this.config.businessShortCode,
      PhoneNumber: this.formatPhoneNumber(request.phoneNumber),
      CallBackURL: this.config.callbackUrl,
      AccountReference: request.reference,
      TransactionDesc: request.description
    };
    
    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
        stkPushData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.ResponseCode === '0') {
        return {
          success: true,
          transactionId: response.data.MerchantRequestID,
          rawResponse: response.data
        };
      } else {
        return {
          success: false,
          error: response.data.ResponseDescription || 'STK Push failed',
          rawResponse: response.data
        };
      }
      
    } catch (error) {
      console.error('STK Push API error:', error);
      return {
        success: false,
        error: 'Failed to initiate M-Pesa payment'
      };
    }
  }
  
  /**
   * Query STK Push transaction status
   */
  async queryTransactionStatus(checkoutRequestId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword();
      
      const queryData = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };
      
      const response = await axios.post(
        `${this.getBaseUrl()}/mpesa/stkpushquery/v1/query`,
        queryData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
      
    } catch (error) {
      console.error('Error querying transaction status:', error);
      throw error;
    }
  }
  
  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    return /^254[7][0-9]{8}$/.test(formatted);
  }
  
  /**
   * Convert XRP amount to KES using current exchange rate
   */
  convertXrpToKes(xrpAmount: number, xrpToUsdRate: number, usdToKesRate: number): number {
    const usdAmount = xrpAmount * xrpToUsdRate;
    return usdAmount * usdToKesRate;
  }
}

// Singleton instance
export const mpesaService = new MpesaService();