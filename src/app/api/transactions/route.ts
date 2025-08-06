import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { remittanceService } from '@/services/remittanceService';
import connectDB from '@/lib/mongoose';

export async function POST(request: NextRequest) {
  try {
    // Ensure database connection
    await connectDB();
    
    const body = await request.json();
    const { transactionData } = body;

    if (!transactionData) {
      return NextResponse.json(
        { error: 'Transaction data is required' },
        { status: 400 }
      );
    }

    // Check if this is a legacy transaction or new remittance
    if (transactionData.snapshot && transactionData.snapshot.input) {
      // This is a new remittance transaction from the form
      const input = transactionData.snapshot.input;
      
      const result = await remittanceService.processRemittance({
        senderName: input.senderName,
        senderEmail: input.senderEmail,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        usdAmount: input.usdAmount,
        country: input.country,
        metadata: { 
          addToVault: input.addToVault,
          formSnapshot: transactionData.snapshot 
        }
      });

      if (result.success) {
        return NextResponse.json({
          success: true,
          transactionId: result.transactionId,
          message: 'Remittance processing initiated successfully'
        });
      } else {
        return NextResponse.json(
          { 
            success: false,
            error: result.error 
          },
          { status: 400 }
        );
      }
    } else {
      // Legacy transaction handling
      const client = await clientPromise;
      const db = client.db('xrp-remittance');
      const collection = db.collection('transactions');

      // Add timestamp and unique ID
      const transaction = {
        ...transactionData,
        _id: new Date().getTime().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'pending'
      };

      const result = await collection.insertOne(transaction);

      return NextResponse.json({
        success: true,
        transactionId: result.insertedId,
        message: 'Transaction saved successfully'
      });
    }

  } catch (error) {
    console.error('Error saving transaction:', error);
    return NextResponse.json(
      { error: 'Failed to save transaction' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Ensure database connection
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db('xrp-remittance');
    const collection = db.collection('transactions');

    const transactions = await collection
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments();

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
} 