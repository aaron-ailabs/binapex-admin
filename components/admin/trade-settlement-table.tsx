"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Loader2, TrendingUp, TrendingDown, CheckCircle, XCircle, History, AlertCircle, RefreshCcw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useDeterministicFetch } from "@/hooks/use-deterministic-fetch"
import { AdminLoader } from "@/components/ui/admin-loader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn, logError, logInfo } from "@/lib/utils"
import { TableEmptyState } from "./table-empty-state"

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
    const { user } = useAuth()
    const supabase = useMemo(() => createClient(), [])

    const fetchTradesFn = useCallback(async () => {
        const { data: tradesData, error } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'OPEN')
            .eq('type', 'binary')
            .order('created_at', { ascending: false })

        if (error) throw error

        if (tradesData && tradesData.length > 0) {
            const userIds = Array.from(new Set(tradesData.map(t => t.user_id)))
            const { data: users } = await supabase.from('profiles').select('id, email').in('id', userIds)

            const enrichedTrades = tradesData.map(trade => ({
                ...trade,
                user_email: users?.find(u => u.id === trade.user_id)?.email || 'Unknown User'
            }))
            return enrichedTrades as Trade[]
        }
        return []
    }, [supabase])

    const {
        data: trades = [],
        status,
        error,
        retry: fetchTrades,
        isLoading,
        setData: setTrades
    } = useDeterministicFetch({
        fn: fetchTradesFn,
        timeoutMs: 10000,
        onError: (err) => toast.error("Failed to load trades", { description: err.message })
    })

    const [processingId, setProcessingId] = useState<string | null>(null)
    const [now, setNow] = useState(Date.now())
    const [auditOpen, setAuditOpen] = useState(false)
    const [auditLoading, setAuditLoading] = useState(false)
    const [auditLogs, setAuditLogs] = useState<SettlementAudit[]>([])
    const [auditOrderId, setAuditOrderId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [confirmTarget, setConfirmTarget] = useState<{ tradeId: string, outcome: 'WIN' | 'LOSS' } | null>(null)

    const handleSettle = async (tradeId: string, outcome: 'WIN' | 'LOSS') => {
        setConfirmTarget(null)
        setProcessingId(tradeId)
        try {
            const trade = trades.find(t => t.id === tradeId)
            if (!trade) {
                toast.error("Trade not found")
                return
            }

            // [FIX] Removed administrative prompts per user request
            const rationale = "Manual settlement by admin"
            const docUrl = null

            const { data, error } = await supabase.rpc('settle_binary_order', {
                p_order_id: tradeId,
                p_outcome: outcome,
                p_final_price: 0,
                p_rationale: rationale,
                p_supporting_document_url: docUrl
            })

            if (error) throw error

            toast.success(`Trade settled as ${outcome}`)

            // [FIX] Optimistically update local state to prevent "Ongoing" flicker
            setTrades(prev => prev.filter(t => t.id !== tradeId))
        } catch (error: any) {
            logError("API settle_binary_order", error)
            toast.error(`Error: ${error.message}`)
        } finally {
            setProcessingId(null)
        }
    }

    useEffect(() => {
        if (!user) return
        fetchTrades()
        const interval = setInterval(() => setNow(Date.now()), 1000)

        // Listen for ANY change in the orders table to capture auto-settlements
        const channel = supabase
            .channel('admin_trades_all')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders'
            }, (payload) => {
                logInfo("Realtime", "Order change detected", payload)
                fetchTrades() // Refresh list on any change
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error('Realtime subscription error for admin_trades_all')
                }
            })

        return () => {
            channel.unsubscribe()
            supabase.removeChannel(channel)
            clearInterval(interval)
        }
    }, [fetchTrades, supabase, user])

    const formatCountdown = (endTime: string | null | undefined) => {
        if (!endTime) return "--:--"
        const end = new Date(endTime).getTime()
        if (isNaN(end)) return "--:--"
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
            logError("API trade_settlement_audit_logs.select", error)
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
            trade.user_id?.toLowerCase().includes(query) ||
            trade.asset_symbol?.toLowerCase().includes(query)
        )
    })

    if (isLoading && trades.length === 0) {
        return (
            <Card className="bg-white/5 border-white/10 p-4">
                <AdminLoader type="table" count={6} text="Loading active trades..." />
            </Card>
        )
    }

    if (status === "error") {
        return (
            <Card className="bg-white/5 border-white/10 p-8 flex flex-col items-center justify-center">
                <Alert variant="destructive" className="max-w-md mb-4 bg-red-900/20 border-red-900/50">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <AlertTitle className="text-red-400">Error</AlertTitle>
                    <AlertDescription className="text-red-300">
                        {error?.message || "Failed to load trades"}
                    </AlertDescription>
                </Alert>
                <Button
                    onClick={fetchTrades}
                    variant="outline"
                    className="gap-2 border-white/20 text-white hover:bg-white/10"
                >
                    <RefreshCcw className="h-4 w-4" />
                    Retry
                </Button>
            </Card>
        )
    }

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

            <div className="overflow-x-auto relative max-h-[600px]">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-muted/80 backdrop-blur-md sticky top-0 z-10 text-gray-500 font-mono text-[10px] uppercase tracking-wider">
                        <tr>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3">Ends In</th>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Asset</th>
                            <th className="px-4 py-3">Direction</th>
                            <th className="px-4 py-3 text-right">Stake</th>
                            <th className="px-4 py-3 text-right">Payout %</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredTrades.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={8} className="p-0">
                                    <TableEmptyState
                                        title="No matching trades found"
                                        description="Active binary option trades will appear here once users place them."
                                    />
                                </td>
                            </tr>
                        )}
                        {filteredTrades.map(trade => (
                            <tr key={trade.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-4 py-2 font-mono text-[10px]">
                                    {trade.created_at ? new Date(trade.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                </td>
                                <td className="px-4 py-2 font-mono text-[10px] text-amber-500 font-bold">
                                    {formatCountdown(trade.end_time)}
                                </td>
                                <td className="px-4 py-2">
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium text-xs leading-none mb-1">{trade.user_email || "Unknown User"}</span>
                                        <span className="text-[9px] text-gray-600 font-mono uppercase tracking-tighter">
                                            {trade.user_id ? trade.user_id.slice(0, 12) : "Unknown ID"}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-2 font-bold text-white text-xs">{trade.asset_symbol || "-"}</td>
                                <td className="px-4 py-2">
                                    <Badge variant="outline" className={cn(
                                        "text-[10px] py-0 gap-1",
                                        trade.direction === 'UP' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                    )}>
                                        {trade.direction === 'UP' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                        {trade.direction === 'UP' ? 'HIGH' : 'LOW'}
                                    </Badge>
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-white text-xs font-bold">${trade.amount}</td>
                                <td className="px-4 py-2 text-right font-mono text-amber-500 text-[10px]">{trade.payout_rate}%</td>
                                <td className="px-4 py-2">
                                    <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="sm"
                                            onClick={() => setConfirmTarget({ tradeId: trade.id, outcome: 'WIN' })}
                                            disabled={!!processingId}
                                            className="h-7 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
                                        >
                                            {processingId === trade.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle size={12} className="mr-1" />}
                                            WIN
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => setConfirmTarget({ tradeId: trade.id, outcome: 'LOSS' })}
                                            disabled={!!processingId}
                                            className="h-7 px-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px]"
                                        >
                                            {processingId === trade.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle size={12} className="mr-1" />}
                                            LOSS
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => openAudit(trade.id)}
                                            className="h-7 w-7 p-0 text-gray-500 hover:bg-white/10"
                                            title="History"
                                        >
                                            <History className="h-3.5 w-3.5" />
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
                                                {log.admin_id ? log.admin_id.slice(0, 8) : "-"}
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

            <Dialog open={!!confirmTarget} onOpenChange={() => setConfirmTarget(null)}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Confirm Settlement</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to settle this trade as <strong>{confirmTarget?.outcome}</strong>?
                            {confirmTarget?.outcome === 'WIN'
                                ? " This will credit the user's balance with the payout amount."
                                : " This will result in a total loss of the stake for the user."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setConfirmTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant={confirmTarget?.outcome === 'WIN' ? "default" : "destructive"}
                            className={confirmTarget?.outcome === 'WIN' ? "bg-emerald-600 hover:bg-emerald-500" : ""}
                            onClick={() => confirmTarget && handleSettle(confirmTarget.tradeId, confirmTarget.outcome)}
                        >
                            Confirm {confirmTarget?.outcome}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
