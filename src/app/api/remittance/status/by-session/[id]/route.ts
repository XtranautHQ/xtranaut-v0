import { NextResponse } from 'next/server';
import Transaction from '@/lib/models/Transaction';

export async function GET(
 request: Request, { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Find transaction by idempotency key (which includes session ID)
    const idempotencyKey = `stripe_${id}`;
    const transaction = await Transaction.findOne({ idempotencyKey });
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      transactionId: transaction.transactionId,
      status: transaction.status,
      steps: transaction.steps,
      xrplTransaction: transaction.xrplTransaction,
      mpesaTransaction: transaction.mpesaTransaction,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    });
    
  } catch (error) {
    console.error('Session status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
