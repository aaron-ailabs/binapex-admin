import { NextResponse } from 'next/server';
import { getAsset } from '@/lib/market-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTC/USD';
  const interval = searchParams.get('interval') || '1d';
  const period = searchParams.get('period') || '1mo';

  try {
    // 1. Resolve Ticker from Registry
    const asset = await getAsset(symbol);
    const ticker = asset?.yahoo_ticker || (symbol.includes('/') ? symbol.replace('/', '-') : symbol);

    // 2. Map period to Yahoo range
    const rangeMap: Record<string, string> = {
      '1d': '1d', '5d': '5d', '1mo': '1mo', '3mo': '3mo',
      '6mo': '6mo', '1y': '1y', 'ytd': 'ytd', 'max': 'max'
    };
    const range = rangeMap[period] || '1mo';

    // 3. Fetch Data
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}`;
    const response = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 }
    });

    if (!response.ok) throw new Error(`Yahoo API ${response.status}`);

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result || !result.timestamp) throw new Error('No data found');

    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    // 4. Transform Data
    const candles = timestamps.map((t: number, i: number) => ({
      time: interval === '1d' 
        ? new Date(t * 1000).toISOString().split('T')[0] 
        : t, // Intraday uses unix timestamp
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
    })).filter((c: any) => c.open !== null && c.close !== null);

    return NextResponse.json(candles);

  } catch (error) {
    console.error(`History fetch error for ${symbol}:`, error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
