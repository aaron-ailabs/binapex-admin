"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import {
    Download,
    Filter,
    Search,
    ArrowUpRight,
    ArrowDownLeft,
    Repeat,
    RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

// Types
type TransactionType = 'deposit' | 'withdrawal' | 'trade' | 'all'

export function TransactionHistory() {
    const [activeTab, setActiveTab] = useState<TransactionType>('all')
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const supabase = createClient()

    const fetchTransactions = async () => {
        setLoading(true)
        let query = supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100)

        // Basic filtering strategy
        if (activeTab === 'deposit') {
            query = query.eq('type', 'deposit')
        } else if (activeTab === 'withdrawal') {
            query = query.in('type', ['withdraw', 'withdrawal'])
        } else if (activeTab === 'all') {
            // Fetch all transactions
        }

        // Apply Status Filter
        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter)
        }

        // Search handled client side for demo simplicity or we can add text search if cols are indexed

        const { data, error } = await query

        if (error) {
            toast.error("Failed to fetch transactions")
        } else {
            setTransactions(data || [])
        }
        setLoading(false)
    }

    const fetchTrades = async () => {
        setLoading(true)
        // Separate table fetch for Trades tab
        const { data, error } = await supabase
            .from('executed_trades')
            .select(`
                *,
                buy_order:buy_order_id(user_id),
                sell_order:sell_order_id(user_id),
                pair:trading_pair_id(symbol)
            `)
            .order('executed_at', { ascending: false })
            .limit(100)

        if (error) {
            toast.error("Failed to fetch trades")
            setTransactions([])
        } else {
            // Normalize for display
            const normalized = data.map(t => ({
                id: t.id,
                created_at: t.executed_at,
                type: 'trade',
                amount: t.amount,
                price: t.price,
                pair: t.pair?.symbol,
                status: 'completed',
                user_id: t.buy_order?.user_id // Simplified owner attribution for list
            }))
            setTransactions(normalized)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (activeTab === 'trade') {
            fetchTrades()
        } else {
            fetchTransactions()
        }
    }, [activeTab, statusFilter])

    const handleExport = () => {
        // Implement CSV Export
        const headers = ["ID", "Date", "Type", "Amount", "Status", "Currency"]
        const csvContent = [
            headers.join(","),
            ...transactions.map(t => [
                t.id,
                t.created_at,
                t.type,
                t.amount,
                t.status,
                t.currency || 'USD'
            ].join(","))
        ].join("\n")

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `transactions_${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("Export started")
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Transaction History</h2>
                    <p className="text-muted-foreground">Comprehensive log of all financial movements.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => (activeTab === 'trade' ? fetchTrades() : fetchTransactions())}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                    <Button variant="default" size="sm" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full md:w-auto">
                            <TabsList>
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="deposit">Deposits</TabsTrigger>
                                <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
                                <TabsTrigger value="trade">Trades</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex gap-2">
                            <div className="relative w-full md:w-[300px]">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by ID or User..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Reference ID</TableHead>
                                    <TableHead>User ID</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">Loading transactions...</TableCell>
                                    </TableRow>
                                ) : transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">No results found.</TableCell>
                                    </TableRow>
                                ) : (
                                    transactions.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell className="font-medium">
                                                {format(new Date(tx.created_at), 'MMM d, yyyy HH:mm')}
                                            </TableCell>
                                            <TableCell className="capitalize flex items-center gap-2">
                                                {tx.type === 'deposit' && <ArrowDownLeft className="text-green-500 h-4 w-4" />}
                                                {tx.type === 'withdraw' && <ArrowUpRight className="text-blue-500 h-4 w-4" />}
                                                {tx.type === 'trade' && <Repeat className="text-yellow-500 h-4 w-4" />}
                                                {tx.type}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {tx.id.slice(0, 8)}...
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {tx.user_id?.slice(0, 8)}...
                                            </TableCell>
                                            <TableCell>
                                                <span className={
                                                    tx.type === 'deposit' ? 'text-green-500 font-bold' :
                                                        tx.type === 'withdraw' ? 'text-zinc-500' :
                                                            ''
                                                }>
                                                    {tx.type === 'withdraw' ? '-' : '+'}{Number(tx.amount).toFixed(8)} {tx.currency || 'USD'}
                                                </span>
                                                {tx.pair && <span className="text-xs text-muted-foreground ml-1">({tx.pair})</span>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    tx.status === 'completed' ? 'default' :
                                                        tx.status === 'pending' ? 'secondary' : 'destructive'
                                                }>
                                                    {tx.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
