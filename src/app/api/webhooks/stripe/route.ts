import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/db';
import Transaction from '@/lib/models/Transaction';
import { generateIdempotencyKey, generateFXRateHash } from '@/lib/utils';
import { getXrpPriceCached } from '@/lib/xrpPrice';
import { broadcastTransactionUpdate } from '@/lib/websocket';
import { getMpesaService } from '@/lib/mpesa';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    if (!stripeSecretKey || !stripeWebhookSecret) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);
    const sig = request.headers.get('stripe-signature') as string;
    const rawBody = await request.text();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    await dbConnect();
    
    // Extract metadata from session
    const metadata = session.metadata;
    if (!metadata) {
      console.error('No metadata found in checkout session');
      return;
    }

    const {
      sn: senderName,
      se: senderEmail,
      rn: receiverName,
      rp: receiverPhone,
      cc: receiverCountry,
      usd: usdAmount,
      add: vaultEnabled,
      lc: localCurrency,
      fx: usdToLocalRate
    } = metadata;

    // Generate idempotency key based on session ID
    const idempotencyKey = `stripe_${session.id}`;
    
    // Check if transaction already exists
    const existingTransaction = await Transaction.findOne({ idempotencyKey });
    if (existingTransaction) {
      console.log(`Transaction already exists for idempotency key: ${idempotencyKey}`);
      return;
    }

    // Get current XRP price
    const usdToXrpRate = await getXrpPriceCached();
    const fxTimestamp = new Date();
    const feePercentage = 1.0; // 1% fee
    const fxHash = generateFXRateHash(
      usdToXrpRate,
      parseFloat(usdToLocalRate || '0'),
      fxTimestamp,
      feePercentage
    );

    // Calculate amounts
    const usdAmountNum = parseFloat(usdAmount);
    const xrpAmount = usdAmountNum / usdToXrpRate;
    const localAmount = usdAmountNum * parseFloat(usdToLocalRate || '0');
    const networkFee = 0.25; // Fixed XRP network fee
    const totalFee = networkFee * usdToXrpRate;
    const savings = (usdAmountNum * 0.08) - totalFee; // 8% Western Union fee comparison

    // Create transaction record
    const transactionId = `TXN-${Date.now()}`;
    const transaction = new Transaction({
      transactionId,
      idempotencyKey,
      sender: {
        name: senderName,
        email: senderEmail,
      },
      receiver: {
        name: receiverName,
        phone: receiverPhone,
        country: receiverCountry,
      },
      amounts: {
        usd: usdAmountNum,
        xrp: xrpAmount,
        local: localAmount,
        localCurrency: localCurrency || 'KES',
      },
      fees: {
        networkFee,
        totalFee,
        savings,
      },
      vault: {
        enabled: vaultEnabled === '1',
        amount: vaultEnabled === '1' ? 20 : 0,
      },
      fxRate: {
        usdToXrp: usdToXrpRate,
        usdToLocal: parseFloat(usdToLocalRate || '0'),
        source: 'CoinGecko API',
        timestamp: fxTimestamp,
        hash: fxHash,
        feePercentage,
      },
      status: 'pending',
      steps: {
        usdToXrp: { completed: false },
        xrpTransfer: { completed: false },
        mpesaPayout: { completed: false },
      },
    });

    await transaction.save();
    console.log(`Transaction created from Stripe webhook: ${transactionId}`);

    // Start processing after a short delay
    setTimeout(() => {
      console.log('enter')
      processTransfer(transaction).catch(console.error);
    }, 10000);

  } catch (error) {
    console.error('Error handling checkout completed:', error);
  }
}

async function processTransfer(transaction: any) {
  try {
    // Step 1: USD to XRP Conversion
    await performUSDToXRPConversion(transaction);
    
    // Step 2: XRP Transfer (simulated)
    await performXRPTransfer(transaction);
    
    // Step 3: M-PESA Payout
    await performMpesaPayout(transaction);
    
  } catch (error) {
    console.error('Transfer process failed:', error);
    transaction.status = 'failed';
    transaction.retryCount += 1;
    transaction.lastRetryAt = new Date();
    await transaction.save();
  }
}

async function performUSDToXRPConversion(transaction: any) {
  try {
    transaction.status = 'xrp_converting';
    transaction.steps.usdToXrp.completed = true;
    transaction.steps.usdToXrp.timestamp = new Date();
    await transaction.save();

    broadcastTransaction(transaction);
    console.log(`Step 1 completed: USD to XRP conversion for ${transaction.transactionId}`);
  } catch (error) {
    console.error('USD to XRP conversion failed:', error);
    throw error;
  }
}

async function performXRPTransfer(transaction: any) {
  try {
    // Simulate XRP transfer
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    transaction.status = 'xrp_sent';
    transaction.steps.xrpTransfer.completed = true;
    transaction.steps.xrpTransfer.timestamp = new Date();
    transaction.steps.xrpTransfer.hash = '988DFE582B1CD8ABEE740B5660FA0AD6269C642E8373131DE25421439B7F366D';
    transaction.steps.xrpTransfer.ledgerIndex = 98049369;
    
    transaction.xrplTransaction = {
      hash: '988DFE582B1CD8ABEE740B5660FA0AD6269C642E8373131DE25421439B7F366D',
      ledgerIndex: 98049369,
      fee: transaction.fees.networkFee,
      amount: transaction.amounts.xrp,
    };
    
    await transaction.save();

    broadcastTransaction(transaction);
    console.log(`Step 2 completed: XRP transfer for ${transaction.transactionId}`);
  } catch (error) {
    console.error('XRP transfer failed:', error);
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
      transaction.steps.mpesaPayout.reference = `MPESA_${Date.now()}`;
      
      transaction.mpesaTransaction = {
        reference: `MPESA_${Date.now()}`,
        status: 'pending',
        amount: transaction.amounts.local,
      };
      
      await transaction.save();

      // broadcastTransaction(transaction);
      console.log(`Step 3 completed: M-PESA payout initiated for ${transaction.transactionId}`);
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

async function broadcastTransaction(transaction: any) {
  broadcastTransactionUpdate(transaction.transactionId, {
    status: transaction.status,
    steps: transaction.steps,
    xrplTransaction: transaction.xrplTransaction,
    mpesaTransaction: transaction.mpesaTransaction,
    updatedAt: transaction.updatedAt
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};


