import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/lib/models/Transaction';
import { broadcastTransactionUpdate, broadcastTransactionComplete, broadcastError } from '@/lib/websocket';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    console.log('M-Pesa callback received:', body);

    // Extract transaction details from callback
    const {
      Body: {
        stkCallback: {
          CheckoutRequestID,
          ResultCode,
          ResultDesc,
          CallbackMetadata
        }
      }
    } = body;

    // Find transaction by checkout request ID
    const transaction = await Transaction.findOne({
      'steps.mpesaPayout.reference': CheckoutRequestID
    });

    if (!transaction) {
      console.error('Transaction not found for checkout request ID:', CheckoutRequestID);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Update transaction based on result
    if (ResultCode === '0') {
      // Success
      transaction.status = 'completed';
      transaction.steps.mpesaPayout.completed = true;
      transaction.steps.mpesaPayout.timestamp = new Date();
      
      // Extract payment details from callback metadata
      if (CallbackMetadata && CallbackMetadata.Item) {
        const items = CallbackMetadata.Item;
        const amount = items.find((item: any) => item.Name === 'Amount')?.Value;
        const mpesaReceiptNumber = items.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
        const transactionDate = items.find((item: any) => item.Name === 'TransactionDate')?.Value;
        
        transaction.mpesaTransaction = {
          reference: mpesaReceiptNumber || CheckoutRequestID,
          status: 'success',
          amount: amount || transaction.amounts.local,
          transactionDate: transactionDate,
        };
      }

      await transaction.save();
      console.log(`Transaction ${transaction.transactionId} updated via callback`);

      // Broadcast real-time update via WebSocket
      broadcastTransactionComplete(transaction.transactionId, {
        status: 'completed',
        mpesaTransaction: transaction.mpesaTransaction,
        updatedAt: transaction.updatedAt
      });

    } else {
      // Failed
      transaction.status = 'failed';
      transaction.steps.mpesaPayout.error = ResultDesc;

      await transaction.save();
      console.log(`Transaction ${transaction.transactionId} failed via callback`);

      // Broadcast error update via WebSocket
      broadcastError(transaction.transactionId, ResultDesc);
    }

    // Broadcast general status update
    broadcastTransactionUpdate(transaction.transactionId, {
      status: transaction.status,
      steps: transaction.steps,
      xrplTransaction: transaction.xrplTransaction,
      mpesaTransaction: transaction.mpesaTransaction,
      updatedAt: transaction.updatedAt
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('M-Pesa callback error:', error);
    return NextResponse.json(
      { error: 'Callback processing failed' },
      { status: 500 }
    );
  }
}
