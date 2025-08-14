import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/db';
import Transaction from '@/lib/models/Transaction';
import { generateFXRateHash } from '@/lib/utils';
import { getXrpPriceCached } from '@/lib/xrpPrice';
import { processTransfer } from '@/services/paymentProcessor';
import { v4 as uuidv4 } from 'uuid';

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

    // Use session ID as idempotency key to match the success URL
    const idempotencyKey = session.id;
    console.log(`Processing Stripe webhook for session: ${idempotencyKey}`);
    
    // Check if transaction already exists
    const existingTransaction = await Transaction.findOne({ idempotencyKey });
    if (existingTransaction) {
      console.log(`Transaction already exists for idempotency key: ${idempotencyKey}`);
      throw new Error('Transaction duplicated');
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

    // Calculate amounts with platform fee
    const usdAmountNum = parseFloat(usdAmount);
    const platformFee = usdAmountNum * 0.0025; // 0.25% platform fee
    const receiverAmountUSD = usdAmountNum - platformFee;
    const xrpAmount = receiverAmountUSD / usdToXrpRate;
    const localAmount = receiverAmountUSD * parseFloat(usdToLocalRate || '0');
    const totalFee = platformFee;
    const savings = (usdAmountNum * 0.08) - totalFee; // 8% Western Union fee comparison

    // Create transaction record
    const transactionId = `TXN-${Date.now()}-${uuidv4().replace(/-/g, '').slice(0, 8)}`;
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
        platformFee,
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
      status: 'xrp_converting',
      steps: {
        usdToXrp: { completed: true, timestamp: new Date() },
        xrpTransfer: { completed: false },
        mpesaPayout: { completed: false },
      },
    });

    await transaction.save();
    console.log(`Transaction created from Stripe webhook: ${transactionId}`);
    

    // Start processing after a short delay
    setTimeout(() => {
      processTransfer(transaction).catch(console.error);
    }, 10000);

  } catch (error) {
    console.error('Error handling checkout completed:', error);
  }
}



export const config = {
  api: {
    bodyParser: false,
  },
};


