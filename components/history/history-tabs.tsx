"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GlassCard } from "@/components/ui/glass-card"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import type { Transaction, Trade, Asset } from "@/lib/types/database"
import { format } from "date-fns"
import { ExternalLink } from "lucide-react"

import { PaginationControls } from "@/components/ui/pagination-controls"

interface HistoryTabsProps {
  transactions: Transaction[]
  trades: (Trade & { asset?: Asset })[]
  currentPage: number
  transactionsCount: number
  tradesCount: number
  pageSize: number
}

export function HistoryTabs({ 
  transactions, 
  trades,
  currentPage,
  transactionsCount,
  tradesCount,
  pageSize
}: HistoryTabsProps) {
  const [activeTab, setActiveTab] = useState("transactions")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "failed":
      case "cancelled":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  const getTradeStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "closed":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
      case "liquidated":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  const transactionsPages = Math.ceil(transactionsCount / pageSize)
  const tradesPages = Math.ceil(tradesCount / pageSize)

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 bg-black/20">
        <TabsTrigger value="transactions">Financial Transactions</TabsTrigger>
        <TabsTrigger value="trades">Trade History</TabsTrigger>
      </TabsList>

      <TabsContent value="transactions" className="mt-6">
        <GlassCard className="p-6">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No transactions found</p>
            </div>
          ) : (
            <>
            <DataTable
              data={transactions}
              columns={[
                {
                  header: "Date",
                  accessor: (row: Transaction) => (
                    <div>
                      <div className="text-white">{format(new Date(row.created_at), "MMM dd, yyyy")}</div>
                      <div className="text-xs text-gray-400">{format(new Date(row.created_at), "HH:mm:ss")}</div>
                    </div>
                  ),
                },
                {
                  header: "Type",
                  accessor: (row: Transaction) => (
                    <span className="capitalize text-white font-medium">{row.type.replace("_", " ")}</span>
                  ),
                },
                {
                  header: "Amount",
                  accessor: (row: Transaction) => (
                    <span
                      className={`font-mono font-bold ${
                        row.type === "deposit" || row.type === "trade_profit" ? "text-emerald-500" : "text-white"
                      }`}
                    >
                      {row.type === "deposit" || row.type === "trade_profit" ? "+" : "-"}$
                      {Math.abs(row.amount).toFixed(2)}
                    </span>
                  ),
                },
                {
                  header: "Status",
                  accessor: (row: Transaction) => (
                    <Badge variant="outline" className={getStatusColor(row.status)}>
                      {row.status}
                    </Badge>
                  ),
                },
                {
                  header: "Method",
                  accessor: (row: Transaction) => (
                    <span className="text-sm text-gray-400 capitalize">{row.payment_method || "N/A"}</span>
                  ),
                },
                {
                  header: "Receipt",
                  accessor: (row: Transaction) =>
                    row.receipt_url ? (
                      <a
                        href={row.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#F59E0B] hover:text-[#FBBF24] flex items-center gap-1"
                      >
                        <span className="text-sm">View</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-gray-600">-</span>
                    ),
                },
              ]}
            />
            <PaginationControls totalPages={transactionsPages} currentPage={currentPage} />
            </>
          )}
        </GlassCard>
      </TabsContent>

      <TabsContent value="trades" className="mt-6">
        <GlassCard className="p-6">
          {trades.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No trades found</p>
            </div>
          ) : (
            <>
            <DataTable
              data={trades}
              columns={[
                {
                  header: "Date",
                  accessor: (row: Trade) => (
                    <div>
                      <div className="text-white">{format(new Date(row.opened_at), "MMM dd, yyyy")}</div>
                      <div className="text-xs text-gray-400">{format(new Date(row.opened_at), "HH:mm")}</div>
                    </div>
                  ),
                },
                {
                  header: "Asset",
                  accessor: (row: Trade & { asset?: Asset }) => (
                    <div>
                      <div className="text-white font-medium">{row.asset?.symbol || "N/A"}</div>
                      <div className="text-xs text-gray-400">{row.asset?.name || ""}</div>
                    </div>
                  ),
                },
                {
                  header: "Type",
                  accessor: (row: Trade) => (
                    <Badge
                      variant="outline"
                      className={
                        row.type === "buy"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-red-500/10 text-red-500 border-red-500/20"
                      }
                    >
                      {row.type === "buy" ? "LONG" : "SHORT"}
                    </Badge>
                  ),
                },
                {
                  header: "Entry",
                  accessor: (row: Trade) => <span className="font-mono text-white">${row.entry_price.toFixed(2)}</span>,
                },
                {
                  header: "Exit",
                  accessor: (row: Trade) => (
                    <span className="font-mono text-white">
                      {row.exit_price ? `$${row.exit_price.toFixed(2)}` : "-"}
                    </span>
                  ),
                },
                {
                  header: "Size",
                  accessor: (row: Trade) => <span className="font-mono text-gray-400">{row.size.toFixed(4)}</span>,
                },
                {
                  header: "Leverage",
                  accessor: (row: Trade) => <span className="font-mono text-gray-400">{row.leverage}x</span>,
                },
                {
                  header: "P/L",
                  accessor: (row: Trade) => {
                    const pl = row.profit_loss;
                    if (pl === null || pl === undefined) {
                         return <span className="text-gray-500 font-mono">--</span>;
                    }
                    return (
                        <span
                          className={`font-mono font-bold ${pl >= 0 ? "text-emerald-500" : "text-red-500"}`}
                        >
                          {pl >= 0 ? "+" : ""}${pl.toFixed(2)}
                        </span>
                    );
                  },
                },
                {
                  header: "Status",
                  accessor: (row: Trade) => (
                    <Badge variant="outline" className={getTradeStatusColor(row.status)}>
                      {row.status}
                    </Badge>
                  ),
                },
              ]}
            />
            <PaginationControls totalPages={tradesPages} currentPage={currentPage} />
            </>
          )}
        </GlassCard>
      </TabsContent>
    </Tabs>
  )
}
