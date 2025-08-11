import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/lib/models/Transaction';
import { processTransfer } from '@/services/paymentProcessor';

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
    setTimeout(() => {
      processTransfer(transaction);
    }, 2000);
    
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
