"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Loader2, TrendingUp, TrendingDown, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"

interface Trade {
    id: string
    user_id: string
    asset_symbol: string
    direction: 'HIGH' | 'LOW'
    stake_amount: number
    locked_payout_rate: number
    status: 'pending' | 'won' | 'lost'
    created_at: string
    user_email?: string 
}

export function TradeSettlementTable() {
    const supabase = createClient()
    const [trades, setTrades] = useState<Trade[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    const fetchTrades = async () => {
        setIsLoading(true)
        // Fetch trades with user email if possible (assuming relation or separate fetch)
        // Since we didn't verify the foreign key relation for easy joining, we'll fetch trades first.
        const { data: tradesData, error } = await supabase
            .from('trades')
            .select('*')
            .eq('status', 'open')
            .order('created_at', { ascending: false })
        
        if (error) {
            toast.error("Failed to load trades")
            return
        }

        // Fetch emails manually for now to be safe/fast (or replace with join if FK exists)
        if (tradesData && tradesData.length > 0) {
            const userIds = Array.from(new Set(tradesData.map(t => t.user_id)))
            const { data: users } = await supabase.from('profiles').select('id, email').in('id', userIds)
            
            const enrichedTrades = tradesData.map(trade => ({
                ...trade,
                user_email: users?.find(u => u.id === trade.user_id)?.email || 'Unknown User'
            }))
            setTrades(enrichedTrades)
        } else {
            setTrades([])
        }
        setIsLoading(false)
    }

    const handleSettle = async (tradeId: string, outcome: 'WIN' | 'LOSS') => {
        setProcessingId(tradeId)
        try {
            const { data, error } = await supabase.rpc('admin_settle_trade', {
                p_trade_id: tradeId,
                p_outcome: outcome
            })

            if (error) throw error

            toast.success(`Trade settled as ${outcome}`)
            fetchTrades() // Refresh list
        } catch (error: any) {
            toast.error(`Error: ${error.message}`)
        } finally {
            setProcessingId(null)
        }
    }

    useEffect(() => {
        fetchTrades()
        // Realtime Subscription for new pending trades
        const channel = supabase
            .channel('admin_trades')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: 'status=eq.open' }, () => {
                fetchTrades()
            })
            .subscribe()

        return () => {
             supabase.removeChannel(channel)
        }
    }, [])

    return (
        <Card className="bg-white/5 border-white/10 p-0 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <Loader2 className="animate-spin text-amber-500 h-4 w-4" />
                    Live Open Trades
                </h3>
                <Badge variant="outline" className="text-amber-500 border-amber-500/20">{trades.length} Open</Badge>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-black/20 text-gray-500 font-mono text-xs uppercase">
                        <tr>
                            <th className="p-4">Time</th>
                            <th className="p-4">User</th>
                            <th className="p-4">Asset</th>
                            <th className="p-4">Direction</th>
                            <th className="p-4 text-right">Stake</th>
                            <th className="p-4 text-right">Payout %</th>
                            <th className="p-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {trades.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-gray-600">No pending trades</td>
                            </tr>
                        )}
                        {trades.map(trade => (
                            <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-mono text-xs">
                                    {new Date(trade.created_at).toLocaleTimeString()}
                                </td>
                                <td className="p-4 text-white">
                                    {trade.user_email}
                                    <div className="text-[10px] text-gray-600 font-mono">{trade.user_id.slice(0, 8)}...</div>
                                </td>
                                <td className="p-4 font-bold text-white">{trade.asset_symbol}</td>
                                <td className="p-4">
                                    <Badge className={`${trade.direction === 'HIGH' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                        {trade.direction === 'HIGH' ? <TrendingUp size={14} className="mr-1"/> : <TrendingDown size={14} className="mr-1"/>}
                                        {trade.direction}
                                    </Badge>
                                </td>
                                <td className="p-4 text-right font-mono text-white">${trade.stake_amount}</td>
                                <td className="p-4 text-right font-mono text-amber-500">{trade.locked_payout_rate}%</td>
                                <td className="p-4">
                                    <div className="flex justify-center gap-2">
                                        <Button 
                                            size="sm"
                                            onClick={() => handleSettle(trade.id, 'WIN')}
                                            disabled={!!processingId}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20"
                                        >
                                            {processingId === trade.id ? <Loader2 className="animate-spin"/> : <CheckCircle size={16} className="mr-1"/>}
                                            WIN
                                        </Button>
                                        <Button 
                                            size="sm"
                                            onClick={() => handleSettle(trade.id, 'LOSS')}
                                            disabled={!!processingId}
                                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-900/20"
                                        >
                                            {processingId === trade.id ? <Loader2 className="animate-spin"/> : <XCircle size={16} className="mr-1"/>}
                                            LOSS
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
