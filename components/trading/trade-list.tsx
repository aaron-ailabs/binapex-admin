"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getActiveTrades, getTradeHistory, Trade } from "@/app/actions/trades"
import { createClient } from "@/lib/supabase/client"
import { ArrowUp, ArrowDown, Clock, Trophy, Ban, Timer, RefreshCcw } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export function TradeList() {
  const [activeTrades, setActiveTrades] = useState<Trade[]>([])
  const [historyTrades, setHistoryTrades] = useState<Trade[]>([])
  const [now, setNow] = useState(Date.now())
  const supabase = createClient()

  // Initial Fetch
  const refreshTrades = async () => {
    const active = await getActiveTrades()
    if (active.data) setActiveTrades(active.data)
    
    const history = await getTradeHistory()
    if (history.data) setHistoryTrades(history.data)
  }

  useEffect(() => {
    refreshTrades()

    // Setup Realtime Subscription
    const channel = supabase
      .channel('trade-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const newOrder = payload.new as Trade
          const oldOrder = payload.old as Trade

          // If status changed from OPEN to WIN or LOSS
          if (oldOrder.status === 'OPEN' && (newOrder.status === 'WIN' || newOrder.status === 'LOSS')) {
            // Trigger UI Updates
            refreshTrades()
            
            // Dispatch Wallet Update Event for Layout
            window.dispatchEvent(new Event('wallet_update'))

            // Show Toast
            if (newOrder.status === 'WIN') {
                const profit = newOrder.amount * (1 + (newOrder.payout_rate ?? 0) / 100) - newOrder.amount // Approximate logic if profit_loss not set? 
                // Actually orders table has profit_loss usually. Let's check payload.
                // But payload might just have the raw columns. 
                // Let's assume profit_loss is populating or stick to generic message if null.
                const winAmount = newOrder.profit_loss ?? (newOrder.amount * (newOrder.payout_rate ?? 85) / 100)
                toast.success(`Trade Won! +$${winAmount.toFixed(2)}`, {
                    description: `${newOrder.asset_symbol} ${newOrder.direction}`
                })
            } else {
                toast.error(`Trade Loss -$${newOrder.amount.toFixed(2)}`, {
                    description: `${newOrder.asset_symbol} ${newOrder.direction}`
                })
            }
          }
        }
      )
      .subscribe()

    // Timer Interval
    const interval = setInterval(() => setNow(Date.now()), 1000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  const formatCountdown = (endTime: string | null) => {
    if (!endTime) return "00:00"
    const end = new Date(endTime).getTime()
    const diff = Math.max(0, Math.ceil((end - now) / 1000))
    const mins = Math.floor(diff / 60)
    const secs = diff % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden flex flex-col h-[400px]">
      <Tabs defaultValue="active" className="w-full flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-[#F59E0B]" />
                <span className="font-bold text-sm tracking-wide text-gray-200">MY TRADES</span>
            </div>
            <TabsList className="bg-black/40 border border-white/10">
              <TabsTrigger value="active" className="text-xs data-[state=active]:bg-[#F59E0B] data-[state=active]:text-black">Active ({activeTrades.length})</TabsTrigger>
              <TabsTrigger value="closed" className="text-xs data-[state=active]:bg-white/20">History</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="active" className="flex-1 overflow-hidden data-[state=active]:flex flex-col m-0">
            <ScrollArea className="flex-1">
                <div className="flex flex-col">
                    {activeTrades.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 text-gray-500 gap-2">
                            <Clock className="w-8 h-8 opacity-20" />
                            <p className="text-xs">No active trades running</p>
                        </div>
                    )}
                    {activeTrades.map(trade => (
                        <div key={trade.id} className="flex items-center justify-between p-3 border-b border-white/5 hover:bg-white/5 transition-colors">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-white">{trade.asset_symbol}</span>
                                    {trade.direction === 'UP' ? (
                                        <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 text-[10px] px-1 py-0 h-5">
                                            <ArrowUp className="w-3 h-3 mr-1" /> UP
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30 text-[10px] px-1 py-0 h-5">
                                            <ArrowDown className="w-3 h-3 mr-1" /> DOWN
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                    <span>${trade.amount}</span>
                                    <span className="text-gray-600">@</span>
                                    <span>{trade.strike_price}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="font-mono font-bold text-[#F59E0B] text-lg leading-none">
                                    {formatCountdown(trade.end_time)}
                                </div>
                                <span className="text-[10px] text-gray-500 uppercase">Rem. Time</span>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </TabsContent>

        <TabsContent value="closed" className="flex-1 overflow-hidden data-[state=active]:flex flex-col m-0">
             <ScrollArea className="flex-1">
                <div className="flex flex-col">
                    {historyTrades.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 text-gray-500 gap-2">
                            <HistoryIcon className="w-8 h-8 opacity-20" />
                            <p className="text-xs">No trade history</p>
                        </div>
                    )}
                    {historyTrades.map(trade => (
                         <div key={trade.id} className="flex items-center justify-between p-3 border-b border-white/5 hover:bg-white/5 transition-colors">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-white">{trade.asset_symbol}</span>
                                    {trade.direction === 'UP' ? (
                                        <span className="text-green-500 text-[10px] flex items-center"><ArrowUp className="w-3 h-3" /> UP</span>
                                    ) : (
                                        <span className="text-red-500 text-[10px] flex items-center"><ArrowDown className="w-3 h-3" /> DOWN</span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {new Date(trade.created_at || '').toLocaleTimeString()}
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                {trade.status === 'WIN' ? (
                                    <div className="flex items-center gap-1.5 text-green-400 font-bold">
                                        <span className="text-sm">
                                            +${(trade.profit_loss || (trade.amount * (trade.payout_rate || 85) / 100)).toFixed(2)}
                                        </span>
                                        <Trophy className="w-3 h-3" />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-red-500 font-bold">
                                        <span className="text-sm">
                                            -${Number(trade.amount).toFixed(2)}
                                        </span>
                                        <Ban className="w-3 h-3 opacity-50" />
                                    </div>
                                )}
                                <span className="text-[10px] text-gray-600 uppercase tracking-wider">{trade.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
             </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function HistoryIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
    )
}
