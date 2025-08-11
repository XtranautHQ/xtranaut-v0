import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/lib/models/Transaction';
import { broadcastError, broadcastTransactionUpdate } from '@/lib/websocket';
import { shouldRetry, calculateRetryDelay, isRetryableError } from '@/lib/utils';
import { processTransfer } from '@/services/paymentProcessor';

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
        transactionId: TransactionID,
        reference: ConversationID,
        amount: transaction.amounts.local,
        status: 'success',
      };
      await transaction.save();

      broadcastTransactionUpdate(transaction.transactionId, {
        status: transaction.status,
        steps: transaction.steps,
        xrplTransaction: transaction.xrplTransaction,
        mpesaTransaction: transaction.mpesaTransaction,
        updatedAt: transaction.updatedAt
      });
    } else {
      // Failed
      transaction.status = 'failed';
      transaction.steps.mpesaPayout.error = ResultDesc;
      transaction.mpesaTransaction = {
        reference: ConversationID,
        status: 'failed',
      }

      await transaction.save();

      broadcastTransactionUpdate(transaction.transactionId, {
        status: transaction.status,
        steps: transaction.steps,
        xrplTransaction: transaction.xrplTransaction,
        mpesaTransaction: transaction.mpesaTransaction,
        updatedAt: transaction.updatedAt
      });

      handleFailedPayout(transaction, ResultDesc);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('M-Pesa B2C result error:', error);
    return NextResponse.json(
      { error: 'Result processing failed' },
      { status: 500 }
    );
  }
}


async function handleFailedPayout(transaction: any, ResultDesc: string) {
  try {
    const isRetryable = isRetryableError(ResultDesc);
    
    if (isRetryable && shouldRetry(transaction.status, transaction.retryCount, transaction.maxRetries)) {
      // Schedule retry
      transaction.status = 'mpesa_processing';
      transaction.retryCount += 1;
      transaction.lastRetryAt = new Date();
      transaction.steps.mpesaPayout.error = ResultDesc;
      
      await transaction.save();
      
      console.log(`Transaction ${transaction.transactionId} failed, scheduling retry ${transaction.retryCount}/${transaction.maxRetries}`);
      
      // Schedule retry with exponential backoff
      const retryDelay = calculateRetryDelay(transaction.retryCount);
      setTimeout(async () => {
        try {
          await retryMpesaPayout(transaction);
        } catch (error) {
          console.error(`Retry failed for transaction ${transaction.transactionId}:`, error);
        }
      }, retryDelay);
      
    } else {
      // Final failure
      transaction.status = 'failed';
      transaction.steps.mpesaPayout.error = ResultDesc;
      await transaction.save();
      
      console.log(`Transaction ${transaction.transactionId} failed permanently`);
      
      // Broadcast error update via WebSocket
      // broadcastError(transaction.transactionId, ResultDesc);
    }

    // Broadcast general status update
    broadcastTransactionUpdate(transaction.transactionId, {
      status: transaction.status,
      steps: transaction.steps,
      xrplTransaction: transaction.xrplTransaction,
      mpesaTransaction: transaction.mpesaTransaction,
      updatedAt: transaction.updatedAt
    });

  } catch (error) {
    console.error('Error handling failed payout:', error);
    throw error;
  }
}

async function retryMpesaPayout(transaction: any) {
  try {
    console.log(`Retrying M-PESA payout for transaction ${transaction.transactionId}`);
    
    setTimeout(async () => {
      try {
        processTransfer(transaction);
      } catch (error) {
        console.error(`Error in retry simulation for ${transaction.transactionId}:`, error);
      }
    }, 3000);
    
  } catch (error) {
    console.error(`Error in retryMpesaPayout for ${transaction.transactionId}:`, error);
    throw error;
  }
}
