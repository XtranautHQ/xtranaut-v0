import { Client, Wallet, xrpToDrops, dropsToXrp, isValidClassicAddress } from 'xrpl';

// XRPL Network Configuration
const XRPL_NETWORK = process.env.XRPL_NETWORK || 'testnet'; // 'mainnet' or 'testnet'
const XRPL_SERVER = XRPL_NETWORK === 'mainnet' 
  ? 'wss://xrplcluster.com' 
  : 'wss://s.altnet.rippletest.net:51233';

  
const LIQUIDITY_WALLET_SEED = process.env.LIQUIDITY_WALLET_SEED!;

export interface XRPLTransactionResult {
  success: boolean;
  hash?: string;
  ledgerIndex?: number;
  fee?: string;
  error?: string;
  validated?: boolean;
}

export class XRPLService {
  private client: Client | null = null;
  private liquidityWallet: Wallet | null = null;

  async connect(): Promise<void> {
    try {
      this.client = new Client(XRPL_SERVER);
      await this.client.connect();
      
      // Initialize wallet
      this.liquidityWallet = Wallet.fromSeed(LIQUIDITY_WALLET_SEED);
      
      console.log('XRPL connected successfully');
    } catch (error) {
      console.error('XRPL connection failed:', error);
      throw new Error('Failed to connect to XRPL');
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
      this.liquidityWallet = null;
    }
  }

  async getAccountInfo(address: string): Promise<any> {
    if (!this.client) {
      throw new Error('XRPL client not connected');
    }

    try {
      const response = await this.client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      });
      
      return response.result.account_data;
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }

  async getXRPBalance(address: string): Promise<number> {
    try {
      const accountInfo = await this.getAccountInfo(address);
      return dropsToXrp(accountInfo.Balance);
    } catch (error) {
      console.error('Failed to get XRP balance:', error);
      throw error;
    }
  }

  async sendXRP(
    toAddress: string,
    amountXRP: number,
  ): Promise<XRPLTransactionResult> {
    if (!this.client) {
      throw new Error('XRPL client not connected');
    }
    if (!this.liquidityWallet) {
      throw new Error('Not found source wallet');
    }

    try {
      // Get current network fee
      const feeResponse = await this.client.request({
        command: 'fee'
      });
      
      const fee = feeResponse.result.drops.open_ledger_fee;

      const prepared = await this.client.autofill({
        "TransactionType": "Payment",
        "Account": this.liquidityWallet.address,
        "Amount": xrpToDrops(amountXRP.toFixed(3)),
        "Destination": toAddress,
        "Fee": fee,
      });

      const signed = this.liquidityWallet.sign(prepared);

      const tx = await this.client.submitAndWait(signed.tx_blob);
      const meta: any = tx.result.meta;

      if (meta.TransactionResult === 'tesSUCCESS') {
        return {
          success: true,
          hash: tx.result.hash,
          ledgerIndex: tx.result.ledger_index,
          fee: fee,
          validated: true
        };
      } else {
        return {
          success: false,
          error: `Transaction failed: ${meta.TransactionResult}`
        };
      }

    } catch (error) {
      console.error('XRP transfer failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createWallet(): Promise<{ address: string; seed: string }> {
    const wallet = Wallet.generate();
    return {
      address: wallet.address,
      seed: wallet.seed!
    };
  }

  async validateAddress(address: string): Promise<boolean> {
    try {
      return isValidClassicAddress(address);
    } catch {
      return false;
    }
  }

  async getCurrentLedgerIndex(): Promise<number> {
    if (!this.client) {
      throw new Error('XRPL client not connected');
    }

    try {
      const response = await this.client.request({
        command: 'ledger',
        ledger_index: 'validated'
      });
      
      return response.result.ledger_index;
    } catch (error) {
      console.error('Failed to get current ledger index:', error);
      throw error;
    }
  }

  async getTransactionInfo(hash: string): Promise<any> {
    if (!this.client) {
      throw new Error('XRPL client not connected');
    }

    try {
      const response = await this.client.request({
        command: 'tx',
        transaction: hash
      });
      
      return response.result;
    } catch (error) {
      console.error('Failed to get transaction info:', error);
      throw error;
    }
  }
}

// Singleton instance
let xrplService: XRPLService | null = null;

export async function getXRPLService(): Promise<XRPLService> {
  if (!xrplService) {
    xrplService = new XRPLService();
    await xrplService.connect();
  }
  return xrplService;
}

export async function closeXRPLService(): Promise<void> {
  if (xrplService) {
    await xrplService.disconnect();
    xrplService = null;
  }
}
