import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/lib/models/Transaction';
import { broadcastTransactionUpdate, broadcastTransactionComplete, broadcastError } from '@/lib/websocket';
import { shouldRetry, calculateRetryDelay, isRetryableError } from '@/lib/utils';

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
      await handleSuccessfulPayout(transaction, CallbackMetadata, CheckoutRequestID);
    } else {
      // Failed
      await handleFailedPayout(transaction, ResultDesc);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('M-Pesa callback error:', error);
    return NextResponse.json(
      { error: 'Callback processing failed' },
      { status: 500 }
    );
  }
}

async function handleSuccessfulPayout(transaction: any, CallbackMetadata: any, CheckoutRequestID: string) {
  try {
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
    console.log(`Transaction ${transaction.transactionId} completed via callback`);

    // Broadcast real-time update via WebSocket
    broadcastTransactionComplete(transaction.transactionId, {
      status: 'completed',
      mpesaTransaction: transaction.mpesaTransaction,
      updatedAt: transaction.updatedAt
    });

    // Broadcast general status update
    broadcastTransactionUpdate(transaction.transactionId, {
      status: transaction.status,
      steps: transaction.steps,
      xrplTransaction: transaction.xrplTransaction,
      mpesaTransaction: transaction.mpesaTransaction,
      updatedAt: transaction.updatedAt
    });

  } catch (error) {
    console.error('Error handling successful payout:', error);
    throw error;
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

  } catch (error) {
    console.error('Error handling failed payout:', error);
    throw error;
  }
}

async function retryMpesaPayout(transaction: any) {
  try {
    console.log(`Retrying M-PESA payout for transaction ${transaction.transactionId}`);
    
    // In a real implementation, you would retry the M-PESA API call here
    // For now, we'll simulate a retry with a new reference
    const newReference = `MPESA_RETRY_${Date.now()}`;
    
    transaction.steps.mpesaPayout.reference = newReference;
    transaction.mpesaTransaction = {
      reference: newReference,
      status: 'pending',
      amount: transaction.amounts.local,
    };
    
    await transaction.save();
    
    // Simulate processing time
    setTimeout(async () => {
      try {
        // Simulate success for retry (in real implementation, this would be another callback)
        transaction.status = 'completed';
        transaction.steps.mpesaPayout.completed = true;
        transaction.steps.mpesaPayout.timestamp = new Date();
        transaction.mpesaTransaction.status = 'success';
        
        await transaction.save();
        
        console.log(`Retry successful for transaction ${transaction.transactionId}`);
        
        // Broadcast updates
        broadcastTransactionComplete(transaction.transactionId, {
          status: 'completed',
          mpesaTransaction: transaction.mpesaTransaction,
          updatedAt: transaction.updatedAt
        });
        
        broadcastTransactionUpdate(transaction.transactionId, {
          status: transaction.status,
          steps: transaction.steps,
          xrplTransaction: transaction.xrplTransaction,
          mpesaTransaction: transaction.mpesaTransaction,
          updatedAt: transaction.updatedAt
        });
        
      } catch (error) {
        console.error(`Error in retry simulation for ${transaction.transactionId}:`, error);
      }
    }, 5000);
    
  } catch (error) {
    console.error(`Error in retryMpesaPayout for ${transaction.transactionId}:`, error);
    throw error;
  }
}
