import { NextRequest, NextResponse } from 'next/server';
import { remittanceService } from '@/services/remittanceService';
import connectDB from '@/lib/mongoose';

export async function POST(request: NextRequest) {
  try {
    // Ensure database connection
    await connectDB();
    
    const body = await request.json();
    const { 
      senderName, 
      senderEmail, 
      recipientName, 
      recipientPhone, 
      usdAmount, 
      country,
      metadata 
    } = body;

    // Validate required fields
    if (!senderName || !senderEmail || !recipientName || !recipientPhone || !usdAmount || !country) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: senderName, senderEmail, recipientName, recipientPhone, usdAmount, country' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid email address format' 
        },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^(\+254|254|0)[7][0-9]{8}$/;
    if (!phoneRegex.test(recipientPhone.replace(/\s/g, ''))) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid Kenyan phone number format. Use format: +254712345678' 
        },
        { status: 400 }
      );
    }

    // Validate amount
    const amount = parseFloat(usdAmount);
    if (isNaN(amount) || amount <= 0 || amount > 10000) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Amount must be between $1 and $10,000 USD' 
        },
        { status: 400 }
      );
    }

    // Validate country
    const supportedCountries = ['Kenya', 'Uganda', 'Tanzania', 'Rwanda'];
    if (!supportedCountries.includes(country)) {
      return NextResponse.json(
        { 
          success: false,
          error: `Unsupported country. Supported countries: ${supportedCountries.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Process the remittance
    const result = await remittanceService.processRemittance({
      senderName,
      senderEmail,
      recipientName,
      recipientPhone: recipientPhone.replace(/\s/g, ''), // Remove spaces
      usdAmount: amount,
      country,
      metadata
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        transactionId: result.transactionId,
        message: 'Remittance processing initiated successfully',
        transaction: {
          id: result.transaction?._id,
          status: result.transaction?.status,
          senderName: result.transaction?.senderName,
          recipientName: result.transaction?.recipientName,
          usdAmount: result.transaction?.usdAmount,
          xrpAmount: result.transaction?.xrpAmount,
          kesAmount: result.transaction?.kesAmount,
          createdAt: result.transaction?.createdAt,
          stages: result.transaction?.stages
        }
      }, { status: 201 });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        transactionId: result.transactionId
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing remittance:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Ensure database connection
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const senderEmail = searchParams.get('senderEmail');
    const transactionId = searchParams.get('transactionId');

    if (transactionId) {
      // Get specific transaction
      const transaction = await remittanceService.getTransaction(transactionId);
      
      if (!transaction) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Transaction not found' 
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        transaction: {
          id: transaction._id,
          status: transaction.status,
          senderName: transaction.senderName,
          senderEmail: transaction.senderEmail,
          recipientName: transaction.recipientName,
          recipientPhone: transaction.recipientPhone,
          usdAmount: transaction.usdAmount,
          xrpAmount: transaction.xrpAmount,
          kesAmount: transaction.kesAmount,
          fees: transaction.fees,
          rates: transaction.rates,
          stages: transaction.stages,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
          completedAt: transaction.completedAt,
          errors: transaction.errors,
          country: transaction.country
        }
      });

    } else if (senderEmail) {
      // Get transactions by sender email
      const transactions = await remittanceService.getTransactionsBySender(senderEmail);
      
      return NextResponse.json({
        success: true,
        transactions: transactions.map(t => ({
          id: t._id,
          status: t.status,
          recipientName: t.recipientName,
          usdAmount: t.usdAmount,
          kesAmount: t.kesAmount,
          createdAt: t.createdAt,
          completedAt: t.completedAt,
          country: t.country
        }))
      });

    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'Either transactionId or senderEmail parameter is required' 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error fetching remittance data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}