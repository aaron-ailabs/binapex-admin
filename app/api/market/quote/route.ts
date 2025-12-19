import { NextResponse } from 'next/server';
import { getAsset } from '@/lib/market-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

  try {
    const asset = await getAsset(symbol);
    const ticker = asset?.yahoo_ticker || (symbol.includes('/') ? symbol.replace('/', '-') : symbol);

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=1m`;
    const response = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 5 } // Short cache for live price
    });

    if (!response.ok) throw new Error('Failed to fetch quote');

    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta) throw new Error('No quote data');

    return NextResponse.json({
      symbol,
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100
    });

  } catch (error) {
    console.error(`Quote error for ${symbol}:`, error);
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}
