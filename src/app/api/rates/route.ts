import { NextRequest, NextResponse } from 'next/server';
import { currencyService } from '@/services/currencyService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const amount = searchParams.get('amount');

    if (from && to) {
      // Get specific conversion rate
      let result;
      
      if (from.toLowerCase() === 'xrp' && to.toLowerCase() === 'usd') {
        result = await currencyService.getXrpToUsdRate();
      } else if (from.toLowerCase() === 'usd' && to.toLowerCase() === 'kes') {
        result = await currencyService.getUsdToKesRate();
      } else if (from.toLowerCase() === 'xrp' && to.toLowerCase() === 'kes') {
        result = await currencyService.convertXrpToKes(1); // Get rate for 1 XRP
      } else if (from.toLowerCase() === 'usd' && to.toLowerCase() === 'xrp') {
        result = await currencyService.convertUsdToXrp(1); // Get rate for 1 USD
      } else {
        return NextResponse.json(
          { 
            success: false,
            error: `Conversion from ${from} to ${to} is not supported` 
          },
          { status: 400 }
        );
      }

      if (!result.success) {
        return NextResponse.json(
          { 
            success: false,
            error: result.error 
          },
          { status: 500 }
        );
      }

      let response: any = {
        success: true,
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate: result.rate,
        source: result.source,
        timestamp: new Date().toISOString()
      };

      // If amount is provided, calculate converted amount
      if (amount) {
        const amountNum = parseFloat(amount);
        if (!isNaN(amountNum) && amountNum > 0) {
          response.amount = amountNum;
          response.convertedAmount = result.convertedAmount || (amountNum * result.rate!);
        }
      }

      return NextResponse.json(response);

    } else {
      // Get all rates
      const rates = await currencyService.getAllRates();

      if (!rates.xrpToUsd.success || !rates.usdToKes.success) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to fetch exchange rates' 
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        rates: {
          XRP_USD: {
            rate: rates.xrpToUsd.rate,
            source: rates.xrpToUsd.source
          },
          USD_KES: {
            rate: rates.usdToKes.rate,
            source: rates.usdToKes.source
          },
          XRP_KES: {
            rate: rates.xrpToUsd.rate! * rates.usdToKes.rate!,
            source: `${rates.xrpToUsd.source} + ${rates.usdToKes.source}`
          }
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}