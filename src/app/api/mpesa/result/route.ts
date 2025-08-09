import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/lib/models/Transaction';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    console.log('M-Pesa B2C result received:', body);

    // Extract transaction details from result
    const {
      Result: {
        ResultCode,
        ResultDesc,
        TransactionID,
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

    // Update transaction based on result
    if (ResultCode === '0') {
      // Success
      transaction.status = 'completed';
      transaction.steps.mpesaPayout.completed = true;
      transaction.steps.mpesaPayout.timestamp = new Date();
      
      transaction.mpesaTransaction = {
        reference: TransactionID || ConversationID,
        status: 'success',
        amount: transaction.amounts.local,
        conversationID: ConversationID,
        originatorConversationID: OriginatorConversationID,
      };
    } else {
      // Failed
      transaction.status = 'failed';
      transaction.steps.mpesaPayout.error = ResultDesc;
    }

    await transaction.save();
    console.log(`Transaction ${transaction.transactionId} updated via B2C result`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('M-Pesa B2C result error:', error);
    return NextResponse.json(
      { error: 'Result processing failed' },
      { status: 500 }
    );
  }
}
