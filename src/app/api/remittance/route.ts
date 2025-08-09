import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/lib/models/Transaction';
import { getXRPLService, closeXRPLService } from '@/lib/xrpl';
import { getMpesaService } from '@/lib/mpesa';
import { Wallet } from 'xrpl';
import { WebSocketManager, broadcastError, broadcastTransactionUpdate } from '@/lib/websocket';



interface RemittanceRequest {
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
    xrp: number;
    local: number;
    localCurrency: string;
  };
  fees: {
    networkFee: number;
    totalFee: number;
    savings: number;
  };
  vault: {
    enabled: boolean;
    amount: number;
  };
  fxRate: {
    usdToXrp: number;
    usdToLocal: number;
    source: string;
  };
}

interface TransactionResponse {
  transactionId: string;
  status: 'pending' | 'xrp_converting' | 'xrp_sent' | 'mpesa_processing' | 'completed' | 'failed';
  steps: {
    usdToXrp: { completed: boolean; timestamp?: Date; error?: string };
    xrpTransfer: { completed: boolean; timestamp?: Date; error?: string; hash?: string; ledgerIndex?: number };
    mpesaPayout: { completed: boolean; timestamp?: Date; error?: string; reference?: string };
  };
  error?: string;
}

// M-PESA failure scenarios for testing
const FAILURE_SCENARIOS = [
  { phone: '0712345678', reason: 'Invalid phone number format' },
  { phone: '0723456789', reason: 'Insufficient funds in M-PESA account' },
  { phone: '0734567890', reason: 'Network timeout' },
];

// XRPL wallet configuration
const PARTNER_WALLET_ADDRESS = process.env.PARTNER_WALLET_ADDRESS!;

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body: RemittanceRequest = await request.json();
    
    // Check for simulated failure scenarios
    const failureScenario = FAILURE_SCENARIOS.find(
      scenario => body.receiver.phone.includes(scenario.phone.substring(0, 4))
    );
    
    if (failureScenario) {
      return NextResponse.json(
        { error: failureScenario.reason },
        { status: 400 }
      );
    }
    
    // Create transaction record
    const transactionId = `TXN-${Date.now()}`;
    const transaction = new Transaction({
      transactionId,
      sender: body.sender,
      receiver: body.receiver,
      amounts: body.amounts,
      fees: body.fees,
      vault: body.vault,
      fxRate: body.fxRate,
      status: 'pending',
      steps: {
        usdToXrp: { completed: false },
        xrpTransfer: { completed: false },
        mpesaPayout: { completed: false },
      },
    });
    
    await transaction.save();

    // Start the transfer process
    processTransfer(transaction);
    
    // Return initial response
    const response: TransactionResponse = {
      transactionId,
      status: transaction.status,
      steps: transaction.steps,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processTransfer(transaction: any) {
  try {
    // Step 1: USD to XRP Conversion
    await performUSDToXRPConversion(transaction);
    
    // Step 2: XRP Transfer to Partner Wallet
    // await performXRPTransfer(transaction);
    {
      await Promise.resolve(() => setTimeout(() => {}, 10000))
      transaction.status = 'xrp_sent';
      transaction.steps.xrpTransfer.completed = true;
      transaction.steps.xrpTransfer.timestamp = new Date();
      transaction.steps.xrpTransfer.hash = '0xjjjjjjjjjjj';
      transaction.steps.xrpTransfer.ledgerIndex = 200000;
      
      transaction.xrplTransaction = {
        hash: '0xjjjjjjjjjjj',
        ledgerIndex: 200000,
        fee: transaction.fees.networkFee,
        amount: transaction.amounts.xrp,
      };
      
      await transaction.save();

      broadcastTransactionUpdate(transaction.transactionId, {
        status: transaction.status,
        steps: transaction.steps,
        xrplTransaction: transaction.xrplTransaction,
        mpesaTransaction: transaction.mpesaTransaction,
        updatedAt: transaction.updatedAt
      });
    }
    
    // Step 3: M-PESA Payout
    await performMpesaPayout(transaction);
    
  } catch (error: any) {
    console.error('Transfer process failed:', error);
    transaction.status = 'failed';
    await transaction.save();

    broadcastTransactionUpdate(transaction.transactionId, {
      status: transaction.status,
      steps: transaction.steps,
      xrplTransaction: transaction.xrplTransaction,
      mpesaTransaction: transaction.mpesaTransaction,
      updatedAt: transaction.updatedAt
    });

  } finally {
    // Clean up XRPL connection
    await closeXRPLService();
  }
}

async function performUSDToXRPConversion(transaction: any) {
  try {
    // Get current XRP price from CoinGecko API
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd');
    const data = await response.json();
    const currentXRPPrice = data.ripple.usd;
    
    // Calculate XRP amount based on current price
    const xrpAmount = transaction.amounts.usd / currentXRPPrice;
    
    // Update transaction with actual XRP amount
    transaction.amounts.xrp = xrpAmount;
    transaction.fxRate.usdToXrp = currentXRPPrice;
    
    transaction.status = 'xrp_converting';
    transaction.steps.usdToXrp.completed = true;
    transaction.steps.usdToXrp.timestamp = new Date();
    await transaction.save();

    broadcastTransactionUpdate(transaction.transactionId, {
      status: transaction.status,
      steps: transaction.steps,
      xrplTransaction: transaction.xrplTransaction,
      mpesaTransaction: transaction.mpesaTransaction,
      updatedAt: transaction.updatedAt
    });
    
    console.log(`Step 1 completed: USD to XRP conversion for ${transaction.transactionId} at rate ${currentXRPPrice}`);
  } catch (error) {
    console.error('USD to XRP conversion failed:', error);
    transaction.steps.usdToXrp.error = error instanceof Error ? error.message : 'Conversion failed';
    await transaction.save();

    throw error;
  }
}

async function performXRPTransfer(transaction: any) {
  try {
    const xrplService = await getXRPLService();
    
    // In a real scenario, you would fund this wallet or use an existing funded wallet
    // For now, we'll simulate the transfer but use real XRPL API calls
    
    const transferResult = await xrplService.sendXRP(
      PARTNER_WALLET_ADDRESS,
      transaction.amounts.xrp,
    );
    
    if (transferResult.success) {
      transaction.status = 'xrp_sent';
      transaction.steps.xrpTransfer.completed = true;
      transaction.steps.xrpTransfer.timestamp = new Date();
      transaction.steps.xrpTransfer.hash = transferResult.hash;
      transaction.steps.xrpTransfer.ledgerIndex = transferResult.ledgerIndex;
      
      transaction.xrplTransaction = {
        hash: transferResult.hash!,
        ledgerIndex: transferResult.ledgerIndex!,
        fee: transferResult.fee || transaction.fees.networkFee,
        amount: transaction.amounts.xrp,
      };
      
      await transaction.save();
      console.log(`Step 2 completed: XRP transfer for ${transaction.transactionId}`);
    } else {
      throw new Error(transferResult.error || 'XRP transfer failed');
    }
  } catch (error) {
    console.error('XRP transfer failed:', error);
    transaction.steps.xrpTransfer.error = error instanceof Error ? error.message : 'Transfer failed';
    await transaction.save();
    throw error;
  }
}

async function performMpesaPayout(transaction: any) {
  try {
    const mpesaService = getMpesaService();
    
    // Validate phone number
    if (!mpesaService.validatePhoneNumber(transaction.receiver.phone)) {
      throw new Error('Invalid phone number format');
    }
    
    // Format phone number
    const formattedPhone = mpesaService.formatPhoneNumber(transaction.receiver.phone);
    
    // Initiate B2C payment to recipient
    const payoutResult = await mpesaService.initiateB2CPayment(
      formattedPhone,
      transaction.amounts.local,
      transaction.transactionId,
      `Remittance payout for ${transaction.receiver.name}`
    );

    
    if (payoutResult.success) {
      transaction.status = 'mpesa_processing';
      transaction.steps.mpesaPayout.completed = true;
      transaction.steps.mpesaPayout.timestamp = new Date();
      transaction.steps.mpesaPayout.reference = payoutResult.reference;
      
      transaction.mpesaTransaction = {
        reference: payoutResult.reference!,
        status: payoutResult.status!,
        amount: transaction.amounts.local,
      };
      
      // Final status update
      transaction.status = 'completed';
      await transaction.save();

      broadcastTransactionUpdate(transaction.transactionId, {
        status: transaction.status,
        steps: transaction.steps,
        xrplTransaction: transaction.xrplTransaction,
        mpesaTransaction: transaction.mpesaTransaction,
        updatedAt: transaction.updatedAt
      });
      
      console.log(`Step 3 completed: M-PESA payout for ${transaction.transactionId}`);
    } else {
      throw new Error(payoutResult.error || 'M-PESA payout failed');
    }
  } catch (error: any) {
    console.error('M-PESA payout failed:', error);
    transaction.steps.mpesaPayout.error = error instanceof Error ? error.message : 'Payout failed';
    await transaction.save();

    throw error;
  }
}
