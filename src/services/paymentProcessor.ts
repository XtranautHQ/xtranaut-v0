import { getMpesaService } from "@/services/mpesa";
import { broadcastTransactionUpdate } from "@/lib/websocket";

export async function processTransfer(transaction: any) {
  try {
    // Step 1: USD to XRP Conversion
    await performUSDToXRPConversion(transaction);
    
    // Step 2: XRP Transfer (simulated)
    await performXRPTransfer(transaction);
    
    // Step 3: M-PESA Payout
    await performMpesaPayout(transaction);
    
  } catch (error) {
    console.error('Transfer process failed:', error);
    transaction.status = 'failed';
    transaction.retryCount += 1;
    transaction.lastRetryAt = new Date();
    await transaction.save();
  }
}

async function performUSDToXRPConversion(transaction: any) {
  try {
    transaction.status = 'xrp_converting';
    transaction.steps.usdToXrp.completed = true;
    transaction.steps.usdToXrp.timestamp = new Date();
    await transaction.save();

    broadcastTransaction(transaction);
    console.log(`Step 1 completed: USD to XRP conversion for ${transaction.transactionId}`);
  } catch (error) {
    console.error('USD to XRP conversion failed:', error);
    throw error;
  }
}

async function performXRPTransfer(transaction: any) {
  try {
    // Simulate XRP transfer
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    transaction.status = 'xrp_sent';
    transaction.steps.xrpTransfer.completed = true;
    transaction.steps.xrpTransfer.timestamp = new Date();
    transaction.steps.xrpTransfer.hash = '988DFE582B1CD8ABEE740B5660FA0AD6269C642E8373131DE25421439B7F366D';
    transaction.steps.xrpTransfer.ledgerIndex = 98049369;
    
    transaction.xrplTransaction = {
      hash: '988DFE582B1CD8ABEE740B5660FA0AD6269C642E8373131DE25421439B7F366D',
      ledgerIndex: 98049369,
      fee: transaction.fees.networkFee,
      amount: transaction.amounts.xrp,
    };
    
    await transaction.save();

    broadcastTransaction(transaction);
    console.log(`Step 2 completed: XRP transfer for ${transaction.transactionId}`);
  } catch (error) {
    console.error('XRP transfer failed:', error);
    throw error;
  }
}

async function performMpesaPayout(transaction: any) {
  try {
    const mpesaService = getMpesaService();
    
    // Validate phone number
    if (!mpesaService.validatePhoneNumber(transaction.receiver.phone)) {
      throw new Error('Invalid phone number format');
    }
    
    // Format phone number
    const formattedPhone = mpesaService.formatPhoneNumber(transaction.receiver.phone);
    
    // Initiate B2C payment to recipient
    const payoutResult = await mpesaService.initiateB2CPayment(
      formattedPhone,
      transaction.amounts.local,
      transaction.transactionId,
      `Remittance payout for ${transaction.receiver.name}`
    );

    
    if (payoutResult.success) {
      transaction.status = 'mpesa_processing';
      transaction.steps.mpesaPayout.completed = true;
      transaction.steps.mpesaPayout.timestamp = new Date();
      transaction.steps.mpesaPayout.reference = payoutResult.reference;
      
      transaction.mpesaTransaction = {
        reference: payoutResult.reference,
        status: 'pending',
        amount: transaction.amounts.local,
      };
      
      await transaction.save();

      // broadcastTransaction(transaction);
      console.log(`Step 3 completed: M-PESA payout initiated for ${transaction.transactionId}`);
    } else {
      throw new Error(payoutResult.error || 'M-PESA payout failed');
    }
  } catch (error: any) {
    console.error('M-PESA payout failed:', error);
    transaction.steps.mpesaPayout.error = error instanceof Error ? error.message : 'Payout failed';
    await transaction.save();

    throw error;
  }
}

async function broadcastTransaction(transaction: any) {
  broadcastTransactionUpdate(transaction.transactionId, {
    status: transaction.status,
    steps: transaction.steps,
    xrplTransaction: transaction.xrplTransaction,
    mpesaTransaction: transaction.mpesaTransaction,
    updatedAt: transaction.updatedAt
  });
}