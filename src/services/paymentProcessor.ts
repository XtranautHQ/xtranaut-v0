import { getMpesaService } from "@/services/mpesa";
import { broadcastTransactionUpdate } from "@/lib/websocket";
import { getXRPLService, XRPLTransactionResult } from "./xrpl";
import Transaction from "@/lib/models/Transaction";
import { SecurityValidator, AuditLogger } from "@/lib/security";

export async function processTransfer(transaction: any) {
  try {
    // Validate transaction before processing
    const validation = SecurityValidator.validateTransactionData(transaction);
    if (!validation.isValid) {
      throw new Error(`Transaction validation failed: ${validation.errors.join(', ')}`);
    }

    AuditLogger.logTransactionEvent(transaction.transactionId, 'TRANSACTION_CREATED', {
      amount: transaction.amounts.usd,
      currency: transaction.amounts.localCurrency,
      senderEmail: SecurityValidator.sanitizeInput(transaction.sender.email),
      receiverCountry: transaction.receiver.country,
    });
    broadcastTransaction(transaction);


    await performXRPTransfer(transaction);
    await performMpesaPayout(transaction);
  } catch (error) {
    console.error('Transfer process failed:', error);
    
    // Log security event
    AuditLogger.logTransactionEvent(transaction.transactionId, 'TRANSFER_FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error',
      retryCount: transaction.retryCount,
    });

    transaction.status = 'failed';
    await transaction.save();

    broadcastTransaction(transaction);
  }
}

// export async function performUSDToXRPConversion(session: any) {
//   try {
//     await dbConnect();
    
//     // Extract and validate metadata from session
//     const metadata = session.metadata;
//     if (!metadata) {
//       throw new Error('No metadata found in checkout session');
//     }

//     // Sanitize and validate all input data
//     const {
//       sn: senderName,
//       se: senderEmail,
//       rn: receiverName,
//       rp: receiverPhone,
//       cc: receiverCountry,
//       usd: usdAmount,
//       add: vaultEnabled,
//       lc: localCurrency,
//       fx: usdToLocalRate
//     } = metadata;

//     // Validate all inputs
//     const senderNameValidation = SecurityValidator.validateName(SecurityValidator.sanitizeInput(senderName));
//     const senderEmailValidation = SecurityValidator.validateEmail(SecurityValidator.sanitizeInput(senderEmail));
//     const receiverNameValidation = SecurityValidator.validateName(SecurityValidator.sanitizeInput(receiverName));
//     const receiverPhoneValidation = SecurityValidator.validatePhoneNumber(SecurityValidator.sanitizeInput(receiverPhone), receiverCountry);
//     const receiverCountryValidation = SecurityValidator.validateCountry(receiverCountry);
//     const amountValidation = SecurityValidator.validateAmount(parseFloat(usdAmount), localCurrency);

//     // Collect all validation errors
//     const allErrors = [
//       ...senderNameValidation.errors,
//       ...senderEmailValidation.errors,
//       ...receiverNameValidation.errors,
//       ...receiverPhoneValidation.errors,
//       ...receiverCountryValidation.errors,
//       ...amountValidation.errors,
//     ];

//     if (allErrors.length > 0) {
//       throw new Error(`Validation failed: ${allErrors.join(', ')}`);
//     }

//     // Generate secure idempotency key
//     const idempotencyKey = `stripe_${session.id}_${SecurityUtils.generateSecureId()}`;
    
//     // Check if transaction already exists
//     const existingTransaction = await Transaction.findOne({ idempotencyKey });
//     if (existingTransaction) {
//       console.log(`Transaction already exists for idempotency key: ${idempotencyKey}`);
//       return existingTransaction;
//     }

//     // Get current XRP price with retry logic
//     let usdToXrpRate: number;
//     try {
//       usdToXrpRate = await getXrpPriceCached();
//     } catch (error) {
//       throw new Error(`Failed to fetch XRP price: ${error instanceof Error ? error.message : 'Unknown error'}`);
//     }

//     const fxTimestamp = new Date();
//     const feePercentage = 1.0; // 1% fee
//     const fxHash = generateFXRateHash(
//       usdToXrpRate,
//       parseFloat(usdToLocalRate || '0'),
//       fxTimestamp,
//       feePercentage
//     );

//     // Calculate amounts with validation
//     const usdAmountNum = parseFloat(usdAmount);
//     if (isNaN(usdAmountNum) || usdAmountNum <= 0) {
//       throw new Error('Invalid USD amount');
//     }

//     const xrpAmount = usdAmountNum / usdToXrpRate;
//     const localAmount = usdAmountNum * parseFloat(usdToLocalRate || '0');
//     const platformFee = 0.25; // Fixed XRP network fee
//     const totalFee = platformFee * usdToXrpRate;
//     const savings = (usdAmountNum * 0.08) - totalFee; // 8% Western Union fee comparison

//     // Create transaction record with enhanced security
//     const transactionId = `TXN-${Date.now()}-${SecurityUtils.generateSecureId().substring(0, 8)}`;
//     const transaction = new Transaction({
//       transactionId,
//       idempotencyKey,
//       sender: {
//         name: SecurityValidator.sanitizeInput(senderName),
//         email: SecurityValidator.sanitizeInput(senderEmail),
//       },
//       receiver: {
//         name: SecurityValidator.sanitizeInput(receiverName),
//         phone: SecurityValidator.sanitizeInput(receiverPhone),
//         country: receiverCountry,
//       },
//       amounts: {
//         usd: usdAmountNum,
//         xrp: xrpAmount,
//         local: localAmount,
//         localCurrency: localCurrency || 'KES',
//       },
//       fees: {
//         platformFee,
//         totalFee,
//         savings,
//       },
//       vault: {
//         enabled: vaultEnabled === '1',
//         amount: vaultEnabled === '1' ? 20 : 0,
//       },
//       fxRate: {
//         usdToXrp: usdToXrpRate,
//         usdToLocal: parseFloat(usdToLocalRate || '0'),
//         source: 'CoinGecko API',
//         timestamp: fxTimestamp,
//         hash: fxHash,
//         feePercentage,
//       },
//       status: 'xrp_converting',
//       steps: {
//         usdToXrp: { completed: true, timestamp: new Date() },
//         xrpTransfer: { completed: false },
//         mpesaPayout: { completed: false },
//       },
//     });

//     await transaction.save();
//     console.log(`Transaction created from Stripe webhook: ${transactionId}`);

//     // Log successful transaction creation
//     AuditLogger.logTransactionEvent(transactionId, 'TRANSACTION_CREATED', {
//       amount: usdAmountNum,
//       currency: localCurrency,
//       senderEmail: SecurityValidator.sanitizeInput(senderEmail),
//       receiverCountry: receiverCountry,
//     });

//     broadcastTransaction(transaction);
//     console.log(`Step 1 completed: USD to XRP conversion for ${transactionId}`);

//     return transaction;
//   } catch (error) {
//     console.error('USD to XRP conversion failed:', error);
    
//     // Log security event
//     AuditLogger.logSecurityEvent('USD_TO_XRP_CONVERSION_FAILED', {
//       sessionId: session.id,
//       error: error instanceof Error ? error.message : 'Unknown error',
//       metadata: session.metadata ? 'present' : 'missing',
//     });

//     throw error;
//   }
// }

export async function performXRPTransfer(transaction: any) {
  try {
    // Validate transaction data before XRP transfer
    if (!transaction.amounts?.xrp || transaction.amounts.xrp <= 0) {
      throw new Error('Invalid XRP amount for transfer');
    }

    const xrplService = await getXRPLService();
    
    // Validate partner wallet address
    const partnerWalletAddress = process.env.PARTNER_WALLET_ADDRESS;
    if (!partnerWalletAddress) {
      throw new Error('Partner wallet address not configured');
    }

    // Perform XRP transfer with amount validation
    const xrpAmount = transaction.amounts.xrp / 100; // Convert to proper XRP units
    if (xrpAmount < 0.000001) { // Minimum XRP amount
      throw new Error('XRP amount too small for transfer');
    }

    const tx = await xrplService.sendXRP(partnerWalletAddress, xrpAmount);

    // Update transaction with transfer details
    transaction.status = 'xrp_sent';
    transaction.steps.xrpTransfer.completed = true;
    transaction.steps.xrpTransfer.timestamp = new Date();
    transaction.steps.xrpTransfer.hash = tx.hash;
    transaction.steps.xrpTransfer.ledgerIndex = tx.ledgerIndex;
    
    transaction.xrplTransaction = {
      hash: tx.hash,
      ledgerIndex: tx.ledgerIndex,
      fee: tx.fee,
      amount: transaction.amounts.xrp,
    };
    
    await transaction.save();

    // Log successful XRP transfer
    AuditLogger.logTransactionEvent(transaction.transactionId, 'XRP_TRANSFER_COMPLETED', {
      hash: tx.hash,
      amount: xrpAmount,
      ledgerIndex: tx.ledgerIndex,
    });

    broadcastTransaction(transaction);
    console.log(`Step 2 completed: XRP transfer for ${transaction.transactionId}`);
  } catch (error) {
    console.error('XRP transfer failed:', error);
    
    // Log security event
    AuditLogger.logTransactionEvent(transaction.transactionId, 'XRP_TRANSFER_FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error',
      amount: transaction.amounts?.xrp,
    });

    throw error;
  }
}

export async function performMpesaPayout(transaction: any) {
  try {
    const mpesaService = getMpesaService();
    
    // Validate phone number with enhanced security
    const phoneValidation = SecurityValidator.validatePhoneNumber(transaction.receiver.phone, transaction.receiver.country);
    if (!phoneValidation.isValid) {
      throw new Error(`Invalid phone number: ${phoneValidation.errors.join(', ')}`);
    }
    
    // Format phone number securely
    const formattedPhone = mpesaService.formatPhoneNumber(transaction.receiver.phone);
    
    // Validate payout amount
    if (!transaction.amounts?.local || transaction.amounts.local <= 0) {
      throw new Error('Invalid local amount for payout');
    }

    // Initiate B2C payment to recipient with enhanced security
    const payoutResult = await mpesaService.initiateB2CPayment(
      formattedPhone,
      transaction.amounts.local,
      transaction.transactionId,
      `Remittance payout for ${SecurityValidator.sanitizeInput(transaction.receiver.name)}`
    );

    if (payoutResult.success) {
      transaction.status = 'mpesa_processing';
      transaction.steps.mpesaPayout.reference = payoutResult.reference;
      
      transaction.mpesaTransaction = {
        reference: payoutResult.reference,
        status: 'pending',
        amount: transaction.amounts.local,
      };
      
      await transaction.save();

      // Log successful M-PESA payout initiation
      AuditLogger.logTransactionEvent(transaction.transactionId, 'MPESA_PAYOUT_INITIATED', {
        reference: payoutResult.reference,
        amount: transaction.amounts.local,
        phone: formattedPhone.substring(0, 4) + '****' + formattedPhone.substring(-4), // Mask phone number
      });

      console.log(`Step 3 completed: M-PESA payout initiated for ${transaction.transactionId}`);
    } else {
      throw new Error(payoutResult.error || 'M-PESA payout failed');
    }
  } catch (error: any) {
    console.error('M-PESA payout failed:', error);
    
    // Log security event
    AuditLogger.logTransactionEvent(transaction.transactionId, 'MPESA_PAYOUT_FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error',
      phone: transaction.receiver.phone ? transaction.receiver.phone.substring(0, 4) + '****' : 'unknown',
    });

    transaction.steps.mpesaPayout.error = error instanceof Error ? error.message : 'Payout failed';
    await transaction.save();

    throw error;
  }
}

export async function retryTransfer(transactionId: string) {
 try {
  const transaction = await Transaction.findOne({
    transactionId
  });
  if (!transaction) {
    throw new Error(`Transaction not found: ${transactionId}`);
  }

  if (transaction.steps.xrpTransfer.completed == false) {
    performXRPTransfer(transaction).catch(console.error);
  }

  if (transaction.steps.mpesaPayout.completed == false) {
    performMpesaPayout(transaction).catch(console.error);
  }

  
  transaction.retryCount += 1;
  transaction.lastRetryAt = new Date();
  await transaction.save();
 } catch (error) {
    console.error('Retry transfer failed:', error);
    
    // Log security event
    AuditLogger.logTransactionEvent(transactionId, 'RETRY_TRANSFER_FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

async function broadcastTransaction(transaction: any) {
  try {
    broadcastTransactionUpdate(transaction.transactionId, {
      status: transaction.status,
      steps: transaction.steps,
      xrplTransaction: transaction.xrplTransaction,
      mpesaTransaction: transaction.mpesaTransaction,
      updatedAt: transaction.updatedAt
    });
  } catch (error) {
    console.error('Failed to broadcast transaction update:', error);
    // Don't throw error for broadcast failures as it's not critical
  }
}