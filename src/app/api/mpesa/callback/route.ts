import { NextRequest, NextResponse } from 'next/server';
import { remittanceService } from '@/services/remittanceService';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('M-Pesa callback received:', JSON.stringify(body, null, 2));

    // Extract callback data based on M-Pesa STK Push callback format
    const { Body } = body;
    const stkCallback = Body?.stkCallback;

    if (!stkCallback) {
      return NextResponse.json({ success: false, message: 'Invalid callback format' });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = stkCallback;

    // Extract transaction reference from metadata
    let transactionId = '';
    let mpesaReceiptNumber = '';
    let amount = 0;
    let phoneNumber = '';

    if (CallbackMetadata && CallbackMetadata.Item) {
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case 'Amount':
            amount = item.Value;
            break;
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = item.Value;
            break;
          case 'PhoneNumber':
            phoneNumber = item.Value;
            break;
          case 'TransactionDate':
            // Transaction date if needed
            break;
        }
      }
    }

    // Find transaction by checkout request ID or merchant request ID
    // In a real implementation, you'd store these IDs when initiating the STK push
    const client = await clientPromise;
    const db = client.db('xrp-remittance');
    const collection = db.collection('transactions');

    // For this MVP, we'll find by phone number and recent timestamp
    const transaction = await collection.findOne({
      recipientPhone: phoneNumber,
      'stages.mpesaPayment.status': 'processing',
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Last 30 minutes
    });

    if (!transaction) {
      console.log('Transaction not found for M-Pesa callback');
      return NextResponse.json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }

    transactionId = transaction._id.toString();

    // Update transaction based on result code
    if (ResultCode === 0) {
      // Success
      transaction.stages.mpesaPayment.status = 'completed';
      transaction.stages.mpesaPayment.mpesaTransactionId = MerchantRequestID;
      transaction.stages.mpesaPayment.mpesaCode = mpesaReceiptNumber;
      transaction.stages.mpesaPayment.timestamp = new Date();
      
      // Update overall transaction status
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      transaction.updatedAt = new Date();

      await collection.replaceOne({ _id: transactionId }, transaction);

      // Send success notification
      try {
        const notificationService = await import('@/services/notificationService');
        await notificationService.notificationService.sendSuccessNotification(transaction);
      } catch (notificationError) {
        console.error('Error sending success notification:', notificationError);
      }

      console.log(`M-Pesa payment successful for transaction ${transactionId}`);

    } else {
      // Failure
      transaction.stages.mpesaPayment.status = 'failed';
      transaction.stages.mpesaPayment.timestamp = new Date();
      transaction.status = 'failed';
      transaction.updatedAt = new Date();
      
      transaction.errors.push({
        stage: 'mpesaPayment',
        message: ResultDesc || 'M-Pesa payment failed',
        timestamp: new Date(),
        details: { ResultCode, MerchantRequestID, CheckoutRequestID }
      });

      await collection.replaceOne({ _id: transactionId }, transaction);

      // Send failure notification
      try {
        const notificationService = await import('@/services/notificationService');
        await notificationService.notificationService.sendFailureNotification(
          transaction, 
          ResultDesc || 'M-Pesa payment failed'
        );
      } catch (notificationError) {
        console.error('Error sending failure notification:', notificationError);
      }

      console.log(`M-Pesa payment failed for transaction ${transactionId}: ${ResultDesc}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Callback processed successfully' 
    });

  } catch (error) {
    console.error('Error processing M-Pesa callback:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process callback' 
      },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification if needed)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  
  if (challenge) {
    return NextResponse.json({ 'hub.challenge': challenge });
  }
  
  return NextResponse.json({ message: 'M-Pesa callback endpoint' });
}