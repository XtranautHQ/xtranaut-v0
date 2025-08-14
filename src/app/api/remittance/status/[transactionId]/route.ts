import { NextRequest, NextResponse } from 'next/server';
import Transaction from '@/lib/models/Transaction';
import dbConnect from '@/lib/db';

export async function GET(
  request: Request, 
  context: any
) {
  try {
    const { transactionId } = await context.params;
    console.log(`Looking for transaction: ${transactionId}`);
    
    await dbConnect();
    
    const transaction = await Transaction.findOne({ transactionId });
    
    if (!transaction) {
      console.log(`Transaction not found: ${transactionId}`);
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    
    console.log(`Found transaction: ${transactionId} with status: ${transaction.status}`);
    
    return NextResponse.json({
      transactionId: transaction.transactionId,
      status: transaction.status,
      steps: transaction.steps,
      xrplTransaction: transaction.xrplTransaction,
      mpesaTransaction: transaction.mpesaTransaction,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      retryCount: transaction.retryCount,
      maxRetries: transaction.maxRetries || 3,
    });
    
  } catch (error) {
    console.error('Transaction status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
