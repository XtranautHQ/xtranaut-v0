import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/lib/models/Transaction';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    console.log('M-Pesa timeout received:', body);

    // Extract transaction details from timeout
    const {
      Result: {
        ResultCode,
        ResultDesc,
        ConversationID,
        OriginatorConversationID
      }
    } = body;

    // Find transaction by conversation ID
    const transaction = await Transaction.findOne({
      'steps.mpesaPayout.reference': ConversationID
    });

    if (!transaction) {
      console.error('Transaction not found for conversation ID:', ConversationID);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Update transaction as failed due to timeout
    transaction.status = 'failed';
    transaction.steps.mpesaPayout.error = 'Payment timeout';
    transaction.steps.mpesaPayout.timestamp = new Date();

    await transaction.save();
    console.log(`Transaction ${transaction.transactionId} marked as failed due to timeout`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('M-Pesa timeout error:', error);
    return NextResponse.json(
      { error: 'Timeout processing failed' },
      { status: 500 }
    );
  }
}
