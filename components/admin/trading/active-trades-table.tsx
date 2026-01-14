"use client"

import { AdminDataTable } from "@/components/admin/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Gavel } from "lucide-react"
import { useState } from "react"
// We will need a SettleTradeDialog component later
// import { SettleTradeDialog } from "./settle-trade-dialog"

export function ActiveTradesTable({ data }: { data: any[] }) {
    const [selectedTrade, setSelectedTrade] = useState<any>(null)
    const [openSettle, setOpenSettle] = useState(false)

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "user",
            header: "User",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium">{row.original.profiles?.email || "Unknown"}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{row.original.id.slice(0, 8)}...</span>
                </div>
            )
        },
        {
            accessorKey: "asset_symbol",
            header: "Asset",
            cell: ({ row }) => <span className="font-bold">{row.original.asset_symbol}</span>
        },
        {
            accessorKey: "direction",
            header: "Direction",
            cell: ({ row }) => (
                <Badge variant="outline" className={row.original.direction === 'call' ? "text-green-500 border-green-500/20" : "text-red-500 border-red-500/20"}>
                    {row.original.direction.toUpperCase()}
                </Badge>
            )
        },
        {
            accessorKey: "amount",
            header: "Amount",
            cell: ({ row }) => <span className="font-mono">${row.original.amount}</span>
        },
        {
            accessorKey: "created_at",
            header: "Opened",
            cell: ({ row }) => <span className="text-xs text-muted-foreground">{format(new Date(row.original.created_at), "HH:mm:ss")}</span>
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => {
                    setSelectedTrade(row.original)
                    setOpenSettle(true)
                }}>
                    <Gavel className="mr-1 h-3 w-3" /> Force Settle
                </Button>
            )
        }
    ]

    return (
        <div className="p-4">
            <AdminDataTable
                columns={columns}
                data={data}
                searchKey="asset_symbol"
                searchPlaceholder="Filter by asset..."
            />
            {/* Dialog placeholder */}
        </div>
    )
}
