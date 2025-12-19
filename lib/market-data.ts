import { createClient } from '@/lib/supabase/client';

export type MarketData = {
  symbol: string;
  ticker: string;
  price: number;
  rate?: number;
  change_pct: number;
  volume: number;
  category: string;
};

// Simple in-memory cache for assets to avoid DB hammering
let assetCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

async function getActiveAssets() {
  const now = Date.now();
  if (assetCache && now - assetCache.timestamp < CACHE_TTL) {
    return assetCache.data;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch assets:', error);
    return [];
  }

  assetCache = { data, timestamp: now };
  return data;
}

export async function getBatchPrices(): Promise<MarketData[]> {
  const assets = await getActiveAssets();
  if (!assets.length) return [];

  const tickers = assets.map(a => a.yahoo_ticker).filter(Boolean);
  const quoteMap: Record<string, any> = {};

  // Parallel fetch from Yahoo (Server-side friendly if used in Route/Action)
  // Note: In client-side, this might CORS. This utility is best for Server Actions/Routes.
  // Using the same verified endpoint logic as the dashboard route.
  await Promise.all(tickers.map(async (ticker) => {
    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=1m`;
      const response = await fetch(yahooUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 30 }
      });

      if (response.ok) {
        const data = await response.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta) {
          quoteMap[ticker] = {
            regularMarketPrice: meta.regularMarketPrice,
            regularMarketPreviousClose: meta.previousClose,
            regularMarketChangePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
            regularMarketVolume: meta.regularMarketVolume || 0
          };
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch quote for ${ticker}:`, err);
    }
  }));

  // Map back to internal symbols
  return assets.map(asset => {
    const ticker = asset.yahoo_ticker;
    const q = quoteMap[ticker] || {};
    const price = q.regularMarketPrice ?? 0;
    const prevClose = q.regularMarketPreviousClose ?? price;
    const change_pct = prevClose !== 0 ? (price - prevClose) / prevClose : 0;
    const yahooChangePct = (q.regularMarketChangePercent ?? 0) / 100;

    return {
      symbol: asset.symbol,
      ticker: ticker,
      price: ticker.includes('=X') ? undefined : price, // Logic from previous dashboard: stocks have price
      rate: ticker.includes('=X') ? price : undefined,  // Forex has rate
      change_pct: yahooChangePct || change_pct || 0,
      volume: q.regularMarketVolume ?? 0,
      category: asset.category
    };
  });
}

export async function getAsset(symbol: string) {
  const assets = await getActiveAssets();
  return assets.find(a => a.symbol === symbol) || null;
}
