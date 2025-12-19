"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUserPortfolio } from '@/hooks/use-user-portfolio';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn utility exists, usually does in shadcn/ui setups

type OrderType = 'LIMIT' | 'MARKET' | 'STOP_LIMIT';
type Side = 'BUY' | 'SELL';

export function OrderFormWidget({ symbol = 'BTC-USD', currentPrice = 0, onSuccess }: { symbol: string, currentPrice: number, onSuccess?: () => void }) {
  const supabase = createClient();
  const { balance_usd, holdings, isLoading: isPortfolioLoading } = useUserPortfolio();
  
  const [activeTab, setActiveTab] = useState<OrderType>('MARKET');
  const [side, setSide] = useState<Side>('BUY');
  
  // Inputs
  const [amountInput, setAmountInput] = useState<string>(''); // User input for AMOUNT (Usually Asset Amount or USD Amount? Spec says "Amount Input: With BTC suffix", implying Asset Amount)
  // WAIT: "Amount Input: With BTC suffix" -> This implies Quantity.
  // BUT: "Available Balance: Displays USD (if Buy) ... with tiny Max" -> If I have USD, I usually input USD amount for Market Buy.
  // However, typical advanced forms (like Binance) often allow inputting either.
  // The User Spec Phase 3 says: "If BUY selected: 100% = (USD Balance / Price)..." -> This calculates Max Asset Quantity.
  // So the input should likely be ASSET Quantity ("BTC").
  // Let's stick to "Amount" = Asset Quantity.
  // If Market Buy, we might convert to USD for the RPC call which takes `p_amount_usd`.
  // Wait, RPC `execute_market_order` takes `p_amount_usd`.
  // If the user inputs BTC Amount, we verify: `BTC Amount * Price = USD Amount`.
  
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

  const [payoutRate, setPayoutRate] = useState<number>(85); // Default 85%

  // Fetch Payout Rate
  useEffect(() => {
    const fetchPayoutRate = async () => {
        // Try exact match first (e.g. "Gold", "USD/SGD"), then parts
        const { data, error } = await supabase
            .from('assets')
            .select('payout_rate')
            .or(`symbol.eq.${symbol},symbol.eq.${assetSymbol},symbol.eq.${symbol.replace('/', '-')}`)
            .maybeSingle(); // Use maybeSingle to avoid error if multiple match (unlikely with unique constraint) or none
        
        if (data?.payout_rate) {
            setPayoutRate(data.payout_rate);
        }
    };
    fetchPayoutRate();
  }, [assetSymbol, symbol]);

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Please login");

        const qty = parseFloat(amountInput);
        const price = parseFloat(priceInput) || currentPrice;
        
        // Convert to USD Amount for RPC if needed
        const amountUsd = qty * price;

        if (activeTab === 'MARKET') {
             // Use RPC
             const { data, error } = await supabase.rpc('execute_market_order', {
                 p_user_id: user.id,
                 p_symbol: symbol.replace(/[^a-zA-Z0-9]/g, ''), // Clean to alphanumeric (e.g. USD/SGD -> USDSGD) to match trading_pairs
                 p_side: side,
                 p_quantity: qty, // Live DB expects p_quantity
                 p_price: price   // Live DB expects p_price
             });
             
             if (error) throw error;
             
             // RPC returns JSON, check if it has error inside? usually throws if exception
             alert("Market Order Executed!");
        } else {
            // LIMIT or STOP
            // Direct Insert
            const { error } = await supabase.from('orders').insert({
                user_id: user.id,
                pair: symbol.replace(/[^a-zA-Z0-9]/g, ''), // Clean to match trading_pairs
                side: side,
                type: activeTab,
                price: price,
                amount: qty, // Live DB uses 'amount' (Quantity)
                // fee: ... // Live DB has fee_percentage or fee_rate? 'fee_percentage' numeric, 'fee_rate' numeric.
                fee_rate: FEE_RATE, // Using fee_rate column
                status: 'OPEN' // Limit orders start as OPEN
            });

            if (error) throw error;
            alert(`${activeTab} Order Placed!`);
        }
        
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
  const qty = parseFloat(amountInput) || 0;
  const price = parseFloat(priceInput) || currentPrice;
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
                className={`w-full bg-black border border-gray-700 rounded p-2 pl-12 text-right text-white text-xs font-mono focus:outline-none focus:border-gray-500 ${activeTab === 'MARKET' ? 'text-gray-500 italic' : ''}`}
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
                className="w-full bg-black border border-gray-700 rounded p-2 pl-14 text-right text-white text-xs font-mono focus:outline-none focus:border-gray-500"
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

        {/* TOTAL & PAYOUT */}
        <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
            <div className="flex justify-between text-xs text-gray-400">
                <span>Payout Rate</span>
                <span className="text-emerald-400 font-bold">{payoutRate}%</span>
            </div>
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
