import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/lib/models/Transaction';
import { retryTransfer } from '@/services/paymentProcessor';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const { transactionId } = await request.json();
    
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Find the transaction
    const transaction = await Transaction.findOne({ transactionId });
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Check if transaction can be retried
    if (transaction.status !== 'failed') {
      return NextResponse.json(
        { error: 'Transaction cannot be retried. Only failed transactions can be retried.' },
        { status: 400 }
      );
    }

    // Check retry limits
    const maxRetries = 3;
    if (transaction.retryCount >= maxRetries) {
      return NextResponse.json(
        { error: 'Maximum retry attempts reached' },
        { status: 400 }
      );
    }

    // Reset transaction status for retry
    transaction.status = 'pending';
    
    await transaction.save();

    // Start retry process
    await retryTransfer(transactionId);

    return NextResponse.json({
      success: true,
      message: 'Retry initiated successfully',
      transactionId,
      retryCount: transaction.retryCount + 1,
    });

  } catch (error) {
    console.error('Retry API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
