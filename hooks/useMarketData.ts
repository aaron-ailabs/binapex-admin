import { useState, useEffect, useRef } from 'react';

export interface Candle {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface MarketDataHook {
  candles: Candle[];
  currentPrice: number;
  change24h: number;
  isLoading: boolean;
  error: string | null;
}

export function useMarketData(symbol: string): MarketDataHook {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [change24h, setChange24h] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // 1. Fetch History on Symbol Change
  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function fetchHistory() {
      try {
        const res = await fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}`);
        if (!res.ok) throw new Error('Failed to load history');
        const data = await res.json();
        
        if (active && Array.isArray(data)) {
          setCandles(data);
          // Set initial price from last candle if available
          if (data.length > 0) {
            setCurrentPrice(data[data.length - 1].close);
          }
        }
      } catch (err) {
        if (active) console.error(err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchHistory();
    return () => { active = false; };
  }, [symbol]);

  // 2. Poll for Live Quote
  useEffect(() => {
    let active = true;

    async function fetchQuote() {
      try {
        const res = await fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (active && data.price) {
          setCurrentPrice(data.price);
          setChange24h(data.changePercent);
          
          // Optional: Update document title
          document.title = `${data.price.toLocaleString()} | ${symbol}`;
        }
      } catch (err) {
        // Silent fail for polling
      }
    }

    // Initial fetch
    fetchQuote();
    
    // Interval
    const interval = setInterval(fetchQuote, 2000);
    return () => { 
      active = false;
      clearInterval(interval); 
    };
  }, [symbol]);

  return { candles, currentPrice, change24h, isLoading, error };
}
