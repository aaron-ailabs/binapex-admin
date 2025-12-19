import { NextResponse } from 'next/server';
import { getBatchPrices, MarketData } from '@/lib/market-data';

export const dynamic = 'force-dynamic'; // Ensure logic runs to check DB/Cache

export async function GET() {
  try {
    // 1. Fetch all prices using the centralized utility (cached assets + Yahoo batch fetch)
    const marketData = await getBatchPrices();

    // 2. Group by category for the frontend
    const results: Record<string, Record<string, Partial<MarketData>>> = {
      stocks: {},
      forex: {},
      crypto: {},
      commodities: {}
    };

    marketData.forEach((item) => {
      // Normalize category keys to match frontend expectation
      let categoryKey = 'stocks'; // Default
      const cat = item.category?.toLowerCase().trim();

      if (cat === 'crypto' || cat === 'cryptocurrency') categoryKey = 'crypto';
      else if (cat === 'forex' || cat === 'currency') categoryKey = 'forex';
      else if (cat === 'commodity' || cat === 'commodities') categoryKey = 'commodities';
      else if (cat === 'stock' || cat === 'equity' || cat === 'stocks') categoryKey = 'stocks';

      if (results[categoryKey]) {
        results[categoryKey][item.symbol] = {
            symbol: item.symbol,
            ticker: item.ticker,
            price: item.price,
            rate: item.rate,
            change_pct: item.change_pct,
            volume: item.volume
        };
      }
    });

    return NextResponse.json(results);

  } catch (error) {
    console.error('Market dashboard fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
