"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Loader2, Trophy, XCircle, Clock } from "lucide-react"

interface Trade {
    id: string
    asset_symbol: string
    direction: 'HIGH' | 'LOW'
    stake_amount: number
    locked_payout_rate: number
    status: 'pending' | 'won' | 'lost'
    created_at: string
    profit_loss?: number
}

export function ActivePositions() {
    const supabase = createClient()
    const [trades, setTrades] = useState<Trade[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Fetch Initial Trades
    const fetchTrades = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20) // Show last 20
        
        if (data) setTrades(data as Trade[])
        setIsLoading(false)
    }

    useEffect(() => {
        fetchTrades()

        // Realtime Subscription
        const channel = supabase
            .channel('realtime_trades')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'trades' 
            }, () => {
                fetchTrades() // Refresh list on any change
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    return (
        <Card className="bg-white/5 border-white/10 flex flex-col h-full">
            <div className="p-4 border-b border-white/10">
                <h3 className="text-amber-500 font-bold tracking-widest text-sm uppercase">Live Positions</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[500px] scrollbar-thin scrollbar-thumb-white/10">
                {isLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin text-amber-500"/></div>
                ) : trades.length === 0 ? (
                    <div className="text-gray-500 text-center text-xs p-4">No active positions</div>
                ) : (
                    trades.map(trade => (
                        <div key={trade.id} className="bg-black/40 p-3 rounded border border-white/5 flex justify-between items-center text-sm hover:bg-white/5 transition-colors">
                            <div className="flex flex-col gap-1">
                                <div className="font-bold text-white text-md">{trade.asset_symbol}</div>
                                <div className={`text-xs font-mono font-black tracking-wider ${trade.direction === 'HIGH' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {trade.direction === 'HIGH' ? '↑ HIGHER' : '↓ LOWER'}
                                </div>
                            </div>
                            
                            <div className="text-right flex flex-col gap-1 items-end">
                                <div className="font-mono text-gray-300 font-bold">${Number(trade.stake_amount).toFixed(2)}</div>
                                {trade.status === 'pending' && (
                                    <Badge className="border-amber-500/50 text-amber-400 bg-amber-500/10 gap-1 text-[10px] px-2">
                                        <Clock size={10} /> Ongoing
                                    </Badge>
                                )}
                                {trade.status === 'won' && (
                                    <Badge className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10 gap-1 text-[10px] px-2">
                                        <Trophy size={10} /> +${(Number(trade.profit_loss) + Number(trade.stake_amount)).toFixed(2)}
                                    </Badge>
                                )}
                                {trade.status === 'lost' && (
                                    <Badge className="border-rose-500/50 text-rose-400 bg-rose-500/10 gap-1 text-[10px] px-2">
                                        <XCircle size={10} /> $0.00
                                    </Badge>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    )
}
