"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, TrendingDown } from "lucide-react"

interface ExecutionWidgetProps {
    symbol: string
    currentPrice: number
    payoutRate: number
    balance: number
    onSuccess: () => void
}

export function ExecutionWidget({ symbol, currentPrice, payoutRate, balance, onSuccess }: ExecutionWidgetProps) {
    const supabase = createClient()
    const [duration, setDuration] = useState(60)
    const [amount, setAmount] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handlePercentage = (pct: number) => {
        const val = (balance * (pct / 100)).toFixed(2)
        setAmount(val)
    }

    const executeTrade = async (direction: 'HIGH' | 'LOW') => {
        if (!amount || Number(amount) <= 0) return
        setIsSubmitting(true)
        
        try {
            const { data, error } = await supabase.rpc('place_trade', {
                p_asset_symbol: symbol,
                p_direction: direction,
                p_stake: Number(amount),
                p_duration: duration
            })

            if (error) throw error
            
            // Simple success
            setAmount("")
            onSuccess() 
        } catch (e: any) {
            console.error(e)
            alert(e.message) // Simple alert for now
        } finally {
            setIsSubmitting(false)
        }
    }

    const potentialPayout = amount ? (Number(amount) + (Number(amount) * payoutRate / 100)).toFixed(2) : "0.00"

    return (
        <div className="bg-[#1E1E1E] border border-gray-800 rounded-xl p-4 flex flex-col gap-6 shadow-2xl h-full">
            {/* Header - Hiding Payout Rate per user request */}
            {/* 
            <div className="flex justify-between items-center">
                <span className="text-gray-400 font-mono text-xs uppercase">Payout Rate</span>
                <Badge className="bg-amber-500 text-black font-bold text-lg hover:bg-amber-400 transition-colors cursor-default">
                    {payoutRate}%
                </Badge>
            </div>
            */}

            {/* Step 1: Duration */}
            <div className="space-y-2">
                <label className="text-xs text-gray-500 font-bold uppercase">1. Select Duration</label>
                <div className="grid grid-cols-3 gap-2">
                    {[60, 120, 300].map(s => (
                        <button
                            key={s}
                            onClick={() => setDuration(s)}
                            className={`py-2 rounded font-mono font-bold text-sm transition-all ${
                                duration === s 
                                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                        >
                            {s === 300 ? '5m' : `${s}s`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Step 2: Amount */}
            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-xs text-gray-500 font-bold uppercase">2. Investment Amount</label>
                    <span className="text-xs text-gray-400 font-mono">Bal: ${balance.toFixed(2)}</span>
                </div>
                
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">$</span>
                    <Input 
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => {
                            const val = e.target.value;
                            // Regex for positive decimal numbers (integers or decimals)
                            if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                setAmount(val);
                            }
                        }}
                        className="bg-black/50 border-white/10 pl-7 text-white font-mono text-lg py-6"
                        placeholder="100" 
                    />
                </div>

                <div className="flex gap-1">
                    {[25, 50, 75, 100].map(pct => (
                        <button
                            key={pct}
                            onClick={() => handlePercentage(pct)}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-xs text-gray-400 py-1 rounded transition-colors"
                        >
                            {pct}%
                        </button>
                    ))}
                </div>
                
                {/* Hidden per user request 
                <div className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/5 border-dashed">
                     <span className="text-xs text-gray-500">Potential Payout</span>
                     <span className="text-emerald-400 font-mono font-bold text-lg">${potentialPayout}</span>
                </div>
                */}
            </div>

            {/* Step 3: Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-auto">
                <Button 
                    onClick={() => executeTrade('HIGH')}
                    disabled={isSubmitting || !amount}
                    className="h-24 flex flex-col gap-1 bg-gradient-to-t from-emerald-900 to-emerald-600 hover:to-emerald-500 border-none transition-all relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                    {isSubmitting ? <Loader2 className="animate-spin text-white" /> : <TrendingUp size={32} className="text-white mb-1" />}
                    <span className="text-xl font-black text-white uppercase tracking-tighter">Higher</span>
                </Button>

                <Button 
                    onClick={() => executeTrade('LOW')}
                    disabled={isSubmitting || !amount}
                    className="h-24 flex flex-col gap-1 bg-gradient-to-t from-rose-900 to-rose-600 hover:to-rose-500 border-none transition-all relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                    {isSubmitting ? <Loader2 className="animate-spin text-white" /> : <TrendingDown size={32} className="text-white mb-1" />}
                    <span className="text-xl font-black text-white uppercase tracking-tighter">Lower</span>
                </Button>
            </div>
        </div>
    )
}
