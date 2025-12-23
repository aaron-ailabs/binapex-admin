"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUserPortfolio } from '@/hooks/use-user-portfolio';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn utility exists, usually does in shadcn/ui setups

type OrderType = 'LIMIT' | 'MARKET' | 'STOP_LIMIT';
type Side = 'BUY' | 'SELL';

export function OrderFormWidget({ symbol = 'BTC-USD', currentPrice = 0, payoutRate = 85, onSuccess }: { symbol: string, currentPrice: number, payoutRate?: number, onSuccess?: () => void }) {
  const supabase = createClient();
  const { balance_usd, holdings, isLoading: isPortfolioLoading } = useUserPortfolio();
  
  const [activeTab, setActiveTab] = useState<OrderType>('MARKET');
  const [side, setSide] = useState<Side>('BUY');
  
  // Inputs
  const [amountInput, setAmountInput] = useState<string>(''); // User input for AMOUNT (usually Asset Amount)
  
  const [priceInput, setPriceInput] = useState<string>(''); // For Limit/Stop
  const [stopPriceInput, setStopPriceInput] = useState<string>(''); // For Stop-Limit
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assetSymbol = symbol.split('-')[0] || symbol.split('/')[0] || "BTC";
  const quoteSymbol = symbol.split('-')[1] || symbol.split('/')[1] || "USD";

  const isBuy = side === 'BUY';
  const themeColor = isBuy ? 'text-emerald-500' : 'text-rose-500';
  const themeBg = isBuy ? 'bg-emerald-600' : 'bg-rose-600';
  const themeBorder = isBuy ? 'border-emerald-500' : 'border-rose-500';

  // Fee Rates
  const FEE_RATE = isBuy ? 0.006 : 0.011; // 0.6% or 1.1%

  // Update Price Input on Current Price Change (only if Market)
  useEffect(() => {
    if (activeTab === 'MARKET') {
      setPriceInput(currentPrice.toString());
    }
  }, [currentPrice, activeTab]);

  // Calculate Available Max
  const availableBalance = isBuy ? balance_usd : (holdings[assetSymbol] || 0);

  // Slider Logic
  const handleSliderChange = (val: number) => {
    setSliderValue(val);
    if (val === 0) {
      setAmountInput('');
      return;
    }

    // Logic from Spec:
    // If BUY: 100% = (USD Balance / Price) / 1.006
    // If SELL: 100% = BTC Holding
    
    // We want to fill the "Amount" input (which is Asset Quantity)
    let calculatedAmount = 0;
    const effectivePrice = parseFloat(priceInput) || currentPrice;

    if (effectivePrice <= 0) return;

        if (isBuy) {
        // Max Asset Qty = (USD Balance) / (Price * (1 + FeeRate))
        const maxAssetQty = (availableBalance / effectivePrice) / (1 + FEE_RATE);
        calculatedAmount = maxAssetQty * (val / 100);
    } else {
        const maxAssetQty = availableBalance; // It's already in BTC
        calculatedAmount = maxAssetQty * (val / 100);
    }

    // Fix: Floor to 6 decimals to avoid "Rounding Up" exceeding balance
    const flooredAmount = Math.floor(calculatedAmount * 1000000) / 1000000;
    setAmountInput(flooredAmount.toFixed(6));
  };

  const handleExecute = async () => {
    if (!amountInput || parseFloat(amountInput) <= 0) return;
    setIsSubmitting(true);

    try {
        const qty = parseFloat(amountInput);
        const price = parseFloat(priceInput) || currentPrice;
        
        // Use Unified API endpoint
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pair: symbol,
                side: side,
                type: activeTab,
                price: price,
                amount: qty,
                triggerPrice: activeTab === 'STOP_LIMIT' ? parseFloat(stopPriceInput) : null,
                payoutRate: payoutRate // Pass through for binary context if needed by API
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to place order');
        }
        
        alert(`${activeTab} Order ${result.status === 'PARTIAL_OR_FILLED' ? 'Executed' : 'Placed'}!`);
        
        // Reset
        setAmountInput('');
        setSliderValue(0);
        if (onSuccess) onSuccess();

    } catch (err: any) {
        alert(`Order Failed: ${err.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  // Fees & Totals for Display
  // Fees & Totals for Display
  const qty = parseFloat(amountInput) || 0;
  const effectiveCurrentPrice = currentPrice > 0 ? currentPrice : 0; // Use 0 if invalid, avoid fake data unless needed
  const price = parseFloat(priceInput) || effectiveCurrentPrice;
  const estTotal = qty * price;
  const estFee = estTotal * FEE_RATE; // 0.6% or 1.1% of Total Value
  
  // Calculate Est. Payout (Investment + Profit)
  const potentialProfit = estTotal * (payoutRate / 100);
  const estPayout = estTotal + potentialProfit;

  return (
    <div className="bg-[#1E1E1E] border border-gray-800 rounded-lg p-3 font-sans text-sm shadow-xl flex flex-col gap-3 min-w-[300px]">
      
      {/* TABS */}
      <div className="flex border-b border-gray-700">
        {['LIMIT', 'MARKET', 'STOP'].map((tab) => (
            <button
                key={tab}
                onClick={() => setActiveTab(tab as OrderType)}
                className={`flex-1 pb-2 text-xs font-bold transition-colors ${
                    activeTab === tab 
                    ? 'text-white border-b-2 border-white' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
            >
                {tab}
            </button>
        ))}
      </div>

      {/* TOGGLE */}
      <div className="flex bg-black p-1 rounded">
        <button
            onClick={() => setSide('BUY')}
            className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                side === 'BUY' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
        >
            BUY
        </button>
        <button
            onClick={() => setSide('SELL')}
            className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                side === 'SELL' 
                ? 'bg-rose-600 text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
        >
            SELL
        </button>
      </div>

      {/* AVAILABLE BALANCE */}
      <div className="flex justify-between items-center text-xs text-gray-400">
        <span>Available</span>
        <div className="flex items-center gap-1 text-white font-mono">
            {isPortfolioLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : (
                <span>
                    {availableBalance.toLocaleString(undefined, { maximumFractionDigits: isBuy ? 2 : 6 })} {isBuy ? quoteSymbol : assetSymbol}
                </span>
            )}
            <button 
                onClick={() => handleSliderChange(100)}
                className="ml-1 bg-gray-700 hover:bg-gray-600 text-[10px] px-1 rounded text-white"
            >
                Max
            </button>
        </div>
      </div>

      {/* DYNAMIC FORM */}
      <div className="flex flex-col gap-3">
        
        {/* Price Input (Disabled for Market) */}
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Price</span>
            <input
                type={activeTab === 'MARKET' ? "text" : "number"}
                aria-label="Price"
                value={activeTab === 'MARKET' ? 'Market Price' : priceInput}
                disabled={activeTab === 'MARKET'}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder={currentPrice.toFixed(2)}
                className={`w-full bg-black border border-gray-700 rounded p-2 pl-12 pr-16 text-right text-white text-xs font-mono focus:outline-none focus:border-gray-500 ${activeTab === 'MARKET' ? 'text-gray-500 italic' : ''}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">{quoteSymbol}</span>
        </div>

        {/* Stop Price (Only for Stop-Limit) */}
        {activeTab === 'STOP_LIMIT' && (
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Stop</span>
                <input
                    type="number"
                    aria-label="Stop Limit Price"
                    value={stopPriceInput}
                    onChange={(e) => setStopPriceInput(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded p-2 pl-12 text-right text-white text-xs font-mono focus:outline-none focus:border-gray-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">{quoteSymbol}</span>
            </div>
        )}

        {/* Amount Input */}
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Amount</span>
            <input
                type="number"
                aria-label="Order Amount"
                value={amountInput}
                onChange={(e) => {
                    setAmountInput(e.target.value);
                    // Reset slider visual if user types manually, or calc implementation
                    setSliderValue(0); 
                }}
                className="w-full bg-black border border-gray-700 rounded p-2 pl-14 pr-16 text-right text-white text-xs font-mono focus:outline-none focus:border-gray-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">{assetSymbol}</span>
        </div>

        {/* DIAMOND SLIDER */}
        <div className="px-1 py-2">
            <input
                type="range"
                min="0"
                max="100"
                step="1"
                aria-label="Order percentage"
                value={sliderValue}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="absolute w-full h-full opacity-0 cursor-pointer z-20"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
            </div>
        </div>

        {/* TOTAL & PAYOUT - Hiding Payout Rate per user request */}
        <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
            {/* 
            <div className="flex justify-between text-xs text-gray-400">
                <span>Payout Rate</span>
                <span className="text-emerald-400 font-bold">{payoutRate}%</span>
            </div>
            */}
            <div className="flex justify-between items-center">
                 <span className="text-xs text-gray-300">Est. Payout</span>
                 <span className="text-sm font-bold text-white font-mono">
                    {estTotal > 0 ? `${estPayout.toFixed(2)} ${quoteSymbol}` : '--'}
                 </span>
            </div>
        </div>

        {/* ACTION BUTTON */}
        <button
            onClick={handleExecute}
            disabled={isSubmitting || !amountInput}
            className={`w-full py-3 rounded font-bold text-white transition-all shadow-lg text-sm ${
                isSubmitting ? 'bg-gray-600 cursor-not-allowed' : `${themeBg} hover:opacity-90`
            }`}
        >
            {isSubmitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin"/> : `${side} ${assetSymbol}`}
        </button>

      </div>
    </div>
  );
}
