"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Loader2, TrendingUp, TrendingDown, CheckCircle, XCircle, History } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface SettlementAudit {
    id: string
    outcome: string
    rationale: string | null
    supporting_document_url: string | null
    final_price: number | null
    admin_id: string
    created_at: string
}

interface Trade {
    id: string
    user_id: string
    asset_symbol: string
    direction: 'UP' | 'DOWN'
    amount: number
    payout_rate: number
    status: 'OPEN' | 'WIN' | 'LOSS'
    created_at: string
    end_time: string
    user_email?: string
}

export function TradeSettlementTable() {
    const supabase = createClient()
    const [trades, setTrades] = useState<Trade[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [now, setNow] = useState(Date.now())
    const [auditOpen, setAuditOpen] = useState(false)
    const [auditLoading, setAuditLoading] = useState(false)
    const [auditLogs, setAuditLogs] = useState<SettlementAudit[]>([])
    const [auditOrderId, setAuditOrderId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const fetchTrades = async () => {
        setIsLoading(true)
        const { data: tradesData, error } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'OPEN')
            .eq('type', 'binary')
            .order('created_at', { ascending: false })

        if (error) {
            toast.error("Failed to load trades")
            return
        }

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
            const trade = trades.find(t => t.id === tradeId)
            if (!trade) {
                toast.error("Trade not found")
                return
            }

            const rationale = window.prompt("Enter settlement rationale") || ""
            const docUrl = window.prompt("Optional: enter supporting document URL") || null

            const { data, error } = await supabase.rpc('settle_binary_order', {
                p_order_id: tradeId,
                p_outcome: outcome,
                p_final_price: 0,
                p_rationale: rationale,
                p_supporting_document_url: docUrl
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
        const interval = setInterval(() => setNow(Date.now()), 1000)

        const channel = supabase
            .channel('admin_trades')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'status=eq.OPEN' }, () => {
                fetchTrades()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
            clearInterval(interval)
        }
    }, [])

    const formatCountdown = (endTime: string) => {
        const end = new Date(endTime).getTime()
        const diff = Math.max(0, Math.ceil((end - now) / 1000))
        const mins = Math.floor(diff / 60)
        const secs = diff % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const openAudit = async (orderId: string) => {
        setAuditOrderId(orderId)
        setAuditOpen(true)
        setAuditLoading(true)
        const { data, error } = await supabase
            .from("trade_settlement_audit_logs")
            .select("*")
            .eq("order_id", orderId)
            .order("created_at", { ascending: false })

        if (error) {
            toast.error("Failed to load settlement history")
            setAuditLogs([])
        } else {
            setAuditLogs(data || [])
        }
        setAuditLoading(false)
    }

    const filteredTrades = trades.filter(trade => {
        const query = searchQuery.toLowerCase().trim()
        if (!query) return true
        return (
            trade.user_email?.toLowerCase().includes(query) ||
            trade.user_id.toLowerCase().includes(query) ||
            trade.asset_symbol.toLowerCase().includes(query)
        )
    })

    return (
        <Card className="bg-white/5 border-white/10 p-0 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Loader2 className="animate-spin text-amber-500 h-4 w-4" />
                        Live Open Trades
                    </h3>
                    <p className="text-xs text-gray-400">Manage and settle binary options positions manually.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Input
                        placeholder="Filter by user, ID or asset..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-xs bg-black/40 border-white/10 h-9 text-xs"
                    />
                    <Badge variant="outline" className="text-amber-500 border-amber-500/20">{filteredTrades.length} Active</Badge>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-black/20 text-gray-500 font-mono text-xs uppercase">
                        <tr>
                            <th className="p-4">Created</th>
                            <th className="p-4">Ends In</th>
                            <th className="p-4">User</th>
                            <th className="p-4">Asset</th>
                            <th className="p-4">Direction</th>
                            <th className="p-4 text-right">Stake</th>
                            <th className="p-4 text-right">Payout %</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredTrades.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-gray-600">No matching trades found</td>
                            </tr>
                        )}
                        {filteredTrades.map(trade => (
                            <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-mono text-xs">
                                    {new Date(trade.created_at).toLocaleTimeString()}
                                </td>
                                <td className="p-4 font-mono text-xs text-amber-500 font-bold">
                                    {formatCountdown(trade.end_time)}
                                </td>
                                <td className="p-4 text-white">
                                    {trade.user_email}
                                    <div className="text-[10px] text-gray-600 font-mono">{trade.user_id.slice(0, 8)}...</div>
                                </td>
                                <td className="p-4 font-bold text-white">{trade.asset_symbol}</td>
                                <td className="p-4">
                                    <Badge className={`${trade.direction === 'UP' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                        {trade.direction === 'UP' ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                                        {trade.direction === 'UP' ? 'HIGH' : 'LOW'}
                                    </Badge>
                                </td>
                                <td className="p-4 text-right font-mono text-white">${trade.amount}</td>
                                <td className="p-4 text-right font-mono text-amber-500">{trade.payout_rate}%</td>
                                <td className="p-4">
                                    <div className="flex justify-center gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleSettle(trade.id, 'WIN')}
                                            disabled={!!processingId}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20"
                                        >
                                            {processingId === trade.id ? <Loader2 className="animate-spin" /> : <CheckCircle size={16} className="mr-1" />}
                                            WIN
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleSettle(trade.id, 'LOSS')}
                                            disabled={!!processingId}
                                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-900/20"
                                        >
                                            {processingId === trade.id ? <Loader2 className="animate-spin" /> : <XCircle size={16} className="mr-1" />}
                                            LOSS
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openAudit(trade.id)}
                                            className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                                        >
                                            <History className="h-4 w-4 mr-1" />
                                            History
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
                <DialogContent className="bg-black border border-white/10 max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Settlement History</DialogTitle>
                        <DialogDescription>
                            All recorded settlement decisions for this order.
                        </DialogDescription>
                    </DialogHeader>
                    {auditLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                        </div>
                    ) : auditLogs.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No settlement records found for this order.
                        </div>
                    ) : (
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-sm text-gray-300">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="py-2 px-3 text-left text-xs text-muted-foreground">Time</th>
                                        <th className="py-2 px-3 text-left text-xs text-muted-foreground">Outcome</th>
                                        <th className="py-2 px-3 text-left text-xs text-muted-foreground">Admin</th>
                                        <th className="py-2 px-3 text-left text-xs text-muted-foreground">Final Price</th>
                                        <th className="py-2 px-3 text-left text-xs text-muted-foreground">Rationale</th>
                                        <th className="py-2 px-3 text-left text-xs text-muted-foreground">Doc</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.map(log => (
                                        <tr key={log.id} className="border-b border-white/5">
                                            <td className="py-2 px-3 font-mono text-xs">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="py-2 px-3">
                                                <Badge
                                                    variant="outline"
                                                    className={log.outcome === "WIN" ? "text-emerald-400 border-emerald-400/30" : "text-rose-400 border-rose-400/30"}
                                                >
                                                    {log.outcome}
                                                </Badge>
                                            </td>
                                            <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                                                {log.admin_id}
                                            </td>
                                            <td className="py-2 px-3 font-mono text-xs">
                                                {log.final_price != null ? `$${log.final_price}` : "-"}
                                            </td>
                                            <td className="py-2 px-3 max-w-xs">
                                                {log.rationale || "-"}
                                            </td>
                                            <td className="py-2 px-3">
                                                {log.supporting_document_url ? (
                                                    <a
                                                        href={log.supporting_document_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-amber-400 underline"
                                                    >
                                                        View
                                                    </a>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    )
}
