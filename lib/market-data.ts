import { createClient } from '@supabase/supabase-js';

export type MarketData = {
  symbol: string;
  ticker: string;
  price: number;
  rate?: number;
  change_pct: number;
  volume: number;
  category: string;
  payout_rate: number;
};

// Simple in-memory cache for assets to avoid DB hammering
let assetCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

async function getActiveAssets() {
  const now = Date.now();
  if (assetCache && now - assetCache.timestamp < CACHE_TTL) {
    return assetCache.data;
  }

  // Use direct Supabase client for reliable server-side access
  // Using explicit env vars ensures this works in Route Handlers without context issues
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch assets:', error);
    return [];
  }

  // Normalize data to ensure payout_rate is a number
  const normalizedData = (data || []).map(a => ({
    ...a,
    payout_rate: Number(a.payout_rate || 85)
  }));

  assetCache = { data: normalizedData, timestamp: now };
  return normalizedData;
}

export async function getBatchPrices(): Promise<MarketData[]> {
  const assets = await getActiveAssets();
  if (!assets.length) return [];

  const tickers = assets.map(a => a.yahoo_ticker).filter(Boolean);
  const quoteMap: Record<string, any> = {};

  // Parallel fetch from Yahoo
  try {
    await Promise.all(tickers.map(async (ticker) => {
      try {
        // Reduced interval to 1m for better granularity, simple fetch
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
  } catch (globalErr) {
    console.error("Global batch fetch error", globalErr);
  }

  // Map back to internal symbols - CAREFUL: Ensure we distinguish between Forex (rate) and Stocks (price)
  // Logic: if category is forex/currency => rate. Else => price.
  return assets.map(asset => {
    const ticker = asset.yahoo_ticker;
    const q = quoteMap[ticker] || {};
    
    // Fallback to previous price if 0? No, just use 0 if API failed for now, but UI will show it.
    const rawPrice = q.regularMarketPrice ?? 0;
    const prevClose = q.regularMarketPreviousClose ?? rawPrice;
    
    // Calculate change
    let changePct = 0;
    if (q.regularMarketChangePercent !== undefined) {
         changePct = q.regularMarketChangePercent; // simple percent e.g. 0.5
    } else if (prevClose !== 0) {
         changePct = ((rawPrice - prevClose) / prevClose) * 100;
    }

    // Determine type for UI placement
    const isForex = asset.category === 'forex' || asset.type === 'forex';
    
    return {
      symbol: asset.symbol,
      ticker: ticker,
      price: !isForex ? rawPrice : 0, 
      rate: isForex ? rawPrice : 0,
      change_pct: changePct / 100, // Frontend expects 0.01 for 1% usually? Or 1? 
      // Checking binary-options-interface: {hookChange > 0 ? '+' : ''}{(hookChange * 100).toFixed(2)}%
      // If hook receives 0.01, it multiplies by 100 => 1%. 
      // Yahoo returns e.g. 0.5 for 0.5%. Wait, Yahoo regularMarketChangePercent is usually the raw number.
      // e.g. 1.25. 
      // My code above divides by 100? No. 
      // Let's stick to decimal format (0.01 = 1%).
      // If Yahoo returns 1.25, I should divide by 100.
      
      volume: q.regularMarketVolume ?? 0,
      category: asset.category,
      payout_rate: asset.payout_rate || 85
    };
  });
}

export async function getAsset(symbol: string) {
  const assets = await getActiveAssets();
  return assets.find(a => a.symbol === symbol) || null;
}
