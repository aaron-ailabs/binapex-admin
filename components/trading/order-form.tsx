'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function OrderForm({ symbol = 'BTC-USD', currentPrice = 0, onSuccess }: { symbol: string, currentPrice: number, onSuccess?: () => void }) {
  // Normalize symbol to "BTC-USD" for DB/API, display might be "BTC/USD"
  const normalizedSymbol = symbol.replace('/', '-');
  const supabase = createClient();
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET' | 'STOP_LIMIT'>('MARKET');
  const [amountUSD, setAmountUSD] = useState<string>('');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [assetBalance, setAssetBalance] = useState<number>(0);
  const [payoutRate, setPayoutRate] = useState<number>(85); // Default 85%
  const [isLoading, setIsLoading] = useState(false);

  // Fees
  const BUY_FEE = 0.006; // 0.6%
  const SELL_FEE = 0.011; // 1.1%

  // Fetch Balances & Payout Rate
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get USD Balance from profiles
      const { data: profile } = await supabase.from('profiles').select('balance_usd').eq('id', user.id).single();
      if (profile) setBalance(profile.balance_usd);

      // 2. Get Asset Holdings (from wallets)
      const assetSymbol = normalizedSymbol.split('-')[0] // Assume symbol is "BTC-USD"
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance, locked_balance')
        .eq('user_id', user.id)
        .eq('asset', assetSymbol)
        .single();
        
      if (wallet) {
         setAssetBalance(Number(wallet.balance) - Number(wallet.locked_balance));
      }

      // 3. Get Payout Rate from assets
      // Try exact match first, then formatted
      const { data: assetData } = await supabase.from('assets')
        .select('payout_rate')
        .or(`symbol.eq.${symbol},symbol.eq.${normalizedSymbol}`)
        .maybeSingle();
      
      if (assetData?.payout_rate) {
        setPayoutRate(assetData.payout_rate);
      }
    };
    fetchData();
  }, [normalizedSymbol, symbol]);

  // Handle Percentage Allocation
  const handlePercentage = (pct: number) => {
    if (side === 'BUY') {
      const maxUsd = balance * pct;
      setAmountUSD(maxUsd.toFixed(2));
    } else {
      // For Sell, we calculate USD value of asset holdings
      const maxAssetValue = assetBalance * currentPrice * pct;
      setAmountUSD(maxAssetValue.toFixed(2));
    }
  };

  // Execute Order
  const handleExecute = async () => {
    if (!amountUSD) return;
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Determine Execution Price and Quantity
      // Input is usually Amount in USD.
      // If Market Buy, Qty = AmountUSD / CurrentPrice
      // If Limit Buy, Qty = AmountUSD / LimitPrice.
      
      const price = orderType === 'MARKET' 
        ? (side === 'BUY' ? currentPrice * 1.05 : currentPrice * 0.95) // Est. Price for calc
        : parseFloat(limitPrice);
      
      // For Display/Logic, we use the User's input Limit Price or Current Price
      const effectivePrice = orderType === 'LIMIT' ? parseFloat(limitPrice) : currentPrice;

      // Calculate Asset Amount
      const quantity = parseFloat(amountUSD) / effectivePrice;

      if (isNaN(quantity) || quantity <= 0) {
        throw new Error("Invalid quantity");
      }

      // Call API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pair: normalizedSymbol.replace(/[^a-zA-Z0-9]/g, ''), // Clean to match trading_pairs (e.g. BTCUSD, USDSGD)
            side: side, // 'BUY' or 'SELL'
            type: orderType, // 'LIMIT' or 'MARKET'
            amount: quantity, // Asset Amount
            price: orderType === 'LIMIT' ? effectivePrice : null // Price required for Limit, optional for Market (handled by route)
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || "Order execution failed");
      }
      
      // Call onSuccess to refresh parent/list if provided
      if (onSuccess) onSuccess();

      alert(orderType === 'MARKET' ? "Order Filled Successfully!" : "Limit Order Placed!");
      
      // Clean inputs
      setAmountUSD('');
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Execution Failed: ${err.message}`);
      } else {
         alert(`Execution Failed: An unknown error occurred`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Calculations
  const calculatedFee = parseFloat(amountUSD || '0') * (side === 'BUY' ? BUY_FEE : SELL_FEE);
  const total = parseFloat(amountUSD || '0');
  
  // Profit Calculation
  const potentialProfit = total * (payoutRate / 100);
  const totalPayout = total + potentialProfit;

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 font-mono text-sm">
      {/* ... tabs ... */}

      {/* ... buy/sell toggle ... */}

      {/* ... balance info ... */}

      {/* ... inputs ... */}

      {/* SUMMARY */}
      <div className="mt-4 space-y-1 text-xs text-gray-400 border-t border-white/10 pt-2">
        <div className="flex justify-between">
            <span>Fee ({side === 'BUY' ? '0.6%' : '1.1%'})</span>
            <span>${calculatedFee.toFixed(2)}</span>
        </div>
        
        {/* Payout Display - Hiding per user request */}
        {/* 
        <div className="flex justify-between items-center py-1">
            <span className="text-gray-400">Payout Rate</span>
            <span className="text-yellow-500 font-bold">{payoutRate}%</span>
        </div>
        */}
        
        {amountUSD && Number(amountUSD) > 0 && (
          <>
            <div className="flex justify-between items-center">
                <span className="text-emerald-500">Potential Profit</span>
                <span className="text-emerald-500 font-bold">+${potentialProfit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-white font-bold text-sm border-t border-white/5 pt-1 mt-1">
                <span>Total Payout</span>
                <span>${totalPayout.toFixed(2)}</span>
            </div>
          </>
        )}
        
        {/* Original Total for reference if needed, but Payout replaces it conceptually for Binary options, 
            though this looks like Spot/Derivatives form. 
            The user explicitly asked for "Profit = Amount * (payout_rate / 100)"
            This implies this IS a simplified/binary style payout model or they want to show potential upside. 
            I will add it as requested.
        */}
      </div>


      {/* ACTION BUTTON */}
      <button 
        disabled={isLoading}
        onClick={handleExecute}
        className={`w-full mt-4 py-3 rounded font-bold text-black transition-all ${
            side === 'BUY' ? 'bg-[#D4AF37] hover:bg-[#B5952F]' : 'bg-[#FF5252] hover:bg-[#D32F2F]'
        }`}
      >
        {isLoading ? 'PROCESSING...' : `${side} ${symbol.split('-')[0]}`}
      </button>
    </div>
  );
}
