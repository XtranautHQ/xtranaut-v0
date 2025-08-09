import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/lib/models/Transaction';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim();
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Number(limitParam) || 20, 100);

    const query: any = {};
    if (email) {
      query['sender.email'] = email;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const data = transactions.map((t: any) => ({
      transactionId: t.transactionId,
      sender: t.sender,
      receiver: t.receiver,
      amounts: t.amounts,
      fees: t.fees,
      status: t.status,
      steps: t.steps,
      xrplTransaction: t.xrplTransaction,
      mpesaTransaction: t.mpesaTransaction,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return NextResponse.json({ transactions: data });
  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


