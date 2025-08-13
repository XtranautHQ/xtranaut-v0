import { NextRequest, NextResponse } from 'next/server';
import Transaction from '@/lib/models/Transaction';
import dbConnect from '@/lib/db';

export async function GET(
  request: Request, 
  context: any
) {
  try {
     const { sessionId } = await context.params;
    
    // Find transaction by idempotency key (which includes session ID)
    await dbConnect();
    
    const idempotencyKey = `stripe_${sessionId}`;
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
