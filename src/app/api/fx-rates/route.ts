import { NextRequest, NextResponse } from 'next/server';
import { fxRateService } from '@/services/fxRateService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency');
    const all = searchParams.get('all');

    if (all === 'true') {
      // Get all available rates
      const rates = await fxRateService.getAllRates();
      return NextResponse.json({
        success: true,
        rates,
        timestamp: new Date().toISOString(),
        source: 'ExchangeRate-API',
      });
    }

    if (currency) {
      // Get specific currency rate
      const rateData = await fxRateService.getExchangeRate(currency);
      return NextResponse.json({
        success: true,
        currency,
        rate: rateData.usdToLocal,
        source: rateData.source,
        timestamp: rateData.timestamp,
        lastUpdated: rateData.lastUpdated,
      });
    }

    // Get rates for supported currencies
    const supportedCurrencies = ['KES', 'NGN', 'GHS', 'UGX', 'TZS'];
    const rates = await fxRateService.getMultipleRates(supportedCurrencies);
    
    return NextResponse.json({
      success: true,
      rates,
      timestamp: new Date().toISOString(),
      source: 'ExchangeRate-API',
    });

  } catch (error) {
    console.error('FX Rates API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch exchange rates',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currencies } = body;

    if (!currencies || !Array.isArray(currencies)) {
      return NextResponse.json(
        { success: false, error: 'Currencies array is required' },
        { status: 400 }
      );
    }

    const rates = await fxRateService.getMultipleRates(currencies);
    
    return NextResponse.json({
      success: true,
      rates,
      timestamp: new Date().toISOString(),
      source: 'ExchangeRate-API',
    });

  } catch (error) {
    console.error('FX Rates API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch exchange rates',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
