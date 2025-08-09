import { NextRequest, NextResponse } from 'next/server';
import { getXrpPriceCached, getXrpPriceCacheInfo, refreshXrpPrice } from '@/lib/xrpPrice';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === '1';

    if (force) {
      await refreshXrpPrice();
    }

    const price = await getXrpPriceCached();
    const cache = getXrpPriceCacheInfo();
    return NextResponse.json({ price, updatedAt: cache?.updatedAt ?? null });
  } catch (error) {
    console.error('XRP price API error:', error);
    return NextResponse.json({ price: 0.52, updatedAt: null }, { status: 200 });
  }
}


