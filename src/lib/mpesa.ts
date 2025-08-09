import { v4 as uuidv4 } from 'uuid';

// M-Pesa API Configuration
const MPESA_ENVIRONMENT = process.env.MPESA_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'production'
const MPESA_BASE_URL = MPESA_ENVIRONMENT === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || 'your_consumer_key';
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || 'your_consumer_secret';
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || 'your_passkey';
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '174379'; // Test shortcode
const MPESA_INITIATOR_NAME = process.env.MPESA_INITIATOR_NAME || 'testapi';
const MPESA_SECURITY_CREDENTIAL = process.env.MPESA_SECURITY_CREDENTIAL || 'your_security_credential';


export interface MpesaTransactionResult {
  success: boolean;
  reference?: string;
  status?: string;
  error?: string;
  responseCode?: string;
  responseDescription?: string;
  merchantRequestID?: string;
  checkoutRequestID?: string;
}

export interface MpesaSTKPushResult {
  success: boolean;
  checkoutRequestID?: string;
  merchantRequestID?: string;
  error?: string;
  responseCode?: string;
  responseDescription?: string;
}

export class MpesaService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
      
      const response = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Expire 1 minute early

      return this.accessToken || '';
    } catch (error) {
      console.error('Failed to get M-Pesa access token:', error);
      throw new Error('Failed to authenticate with M-Pesa API');
    }
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  private generatePassword(): string {
    const timestamp = this.generateTimestamp();
    const password = `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`;
    return Buffer.from(password).toString('base64');
  }

  async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    reference: string,
    description: string = 'Remittance Payment'
  ): Promise<MpesaSTKPushResult> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();

      // Format phone number (remove +254 and add 254)
      const formattedPhone = phoneNumber.replace(/^\+254/, '254').replace(/^0/, '254');

      const payload = {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount), // M-Pesa expects integer amount
        PartyA: formattedPhone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/mpesa/callback`,
        AccountReference: reference,
        TransactionDesc: description,
      };

      const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.ResponseCode === '0') {
        return {
          success: true,
          checkoutRequestID: data.CheckoutRequestID,
          merchantRequestID: data.MerchantRequestID,
          responseCode: data.ResponseCode,
          responseDescription: data.ResponseDescription,
        };
      } else {
        return {
          success: false,
          error: data.ResponseDescription || 'STK Push failed',
          responseCode: data.ResponseCode,
          responseDescription: data.ResponseDescription,
        };
      }

    } catch (error) {
      console.error('STK Push failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkSTKPushStatus(checkoutRequestID: string): Promise<MpesaTransactionResult> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();

      const payload = {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      };

      const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.ResponseCode === '0') {
        const resultCode = data.ResultCode;
        
        if (resultCode === '0') {
          // Transaction successful
          return {
            success: true,
            reference: data.MerchantRequestID,
            status: 'success',
            responseCode: data.ResponseCode,
            responseDescription: data.ResponseDescription,
            merchantRequestID: data.MerchantRequestID,
            checkoutRequestID: data.CheckoutRequestID,
          };
        } else {
          // Transaction failed
          return {
            success: false,
            error: data.ResultDesc || 'Transaction failed',
            status: 'failed',
            responseCode: data.ResponseCode,
            responseDescription: data.ResponseDescription,
            merchantRequestID: data.MerchantRequestID,
            checkoutRequestID: data.CheckoutRequestID,
          };
        }
      } else {
        return {
          success: false,
          error: data.ResponseDescription || 'Query failed',
          responseCode: data.ResponseCode,
          responseDescription: data.ResponseDescription,
        };
      }

    } catch (error) {
      console.error('STK Push status check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async initiateB2CPayment(
    phoneNumber: string,
    amount: number,
    reference: string,
    description: string = 'Remittance Payout'
  ): Promise<MpesaTransactionResult> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();

      // Format phone number
      const formattedPhone = phoneNumber.replace(/^\+254/, '254').replace(/^0/, '254');

      const payload = {
        OriginatorConversationID: uuidv4(),
        InitiatorName: MPESA_INITIATOR_NAME,
        SecurityCredential: MPESA_SECURITY_CREDENTIAL,
        CommandID: 'BusinessPayment',
        Amount: Math.round(amount),
        PartyA: MPESA_SHORTCODE,
        PartyB: formattedPhone,
        Remarks: description,
        QueueTimeOutURL: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mpesa/timeout`,
        ResultURL: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mpesa/result`,
        Occasion: reference,
      };

      const response = await fetch(`${MPESA_BASE_URL}/mpesa/b2c/v3/paymentrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log('>>>>>>>>>>>>>>>>>>', data);

      if (data.ResponseCode === '0') {
        return {
          success: true,
          reference: data.ConversationID,
          status: 'initiated',
          responseCode: data.ResponseCode,
          responseDescription: data.ResponseDescription,
          merchantRequestID: data.OriginatorConversationID,
        };
      } else {
        return {
          success: false,
          error: data.ResponseDescription || 'B2C payment failed',
          responseCode: data.ResponseCode,
          responseDescription: data.ResponseDescription,
        };
      }

    } catch (error) {
      console.error('B2C payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid Kenyan phone number
    // Should be 12 digits starting with 254 or 11 digits starting with 0
    if (cleanNumber.length === 12 && cleanNumber.startsWith('254')) {
      return true;
    }
    
    if (cleanNumber.length === 11 && cleanNumber.startsWith('0')) {
      return true;
    }
    
    if (cleanNumber.length === 9 && cleanNumber.startsWith('7')) {
      return true;
    }
    
    return false;
  }

  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Convert to 254 format
    if (cleanNumber.length === 11 && cleanNumber.startsWith('0')) {
      cleanNumber = '254' + cleanNumber.substring(1);
    }
    
    if (cleanNumber.length === 9 && cleanNumber.startsWith('7')) {
      cleanNumber = '254' + cleanNumber;
    }
    
    return cleanNumber;
  }
}

// Singleton instance
let mpesaService: MpesaService | null = null;

export function getMpesaService(): MpesaService {
  if (!mpesaService) {
    mpesaService = new MpesaService();
  }
  return mpesaService;
}
