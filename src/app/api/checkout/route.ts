import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const body = await request.json();
    const {
      sender,
      receiver,
      amounts,
      vault,
      fxRate,
    } = body || {};

    if (!sender?.name || !sender?.email || !receiver?.name || !receiver?.phone || !receiver?.country || !amounts?.usd) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecretKey);

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const usdAmount = Number(amounts.usd);
    if (!Number.isFinite(usdAmount) || usdAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Compact metadata to fit Stripe limits
    const metadata: Record<string, string> = {
      sn: String(sender.name),
      se: String(sender.email),
      rn: String(receiver.name),
      rp: String(receiver.phone),
      cc: String(receiver.country),
      usd: String(usdAmount),
      add: vault?.enabled ? '1' : '0',
      lc: String(amounts.localCurrency || fxRate?.localCurrency || ''),
      fx: String(fxRate?.usdToLocal || ''),
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: sender.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Remittance Payment',
              description: `Sender: ${sender.name} → ${receiver.name} (${receiver.country})`,
            },
            unit_amount: Math.round(usdAmount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/transfer-status?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
      metadata,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout init error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}


