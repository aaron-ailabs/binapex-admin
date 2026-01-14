"use client"

import { AdminDataTable } from "@/components/admin/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Info } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

type SettlementLog = {
    id: string
    order_id: string
    user_email?: string
    asset_symbol?: string // RPC might return this if joined
    outcome: string
    final_price: number
    rationale: string
    created_at: string
    admin_id: string
    amount?: number
    direction?: string
}

export function SettlementHistoryTable({ data }: { data: any[] }) {
    const columns: ColumnDef<SettlementLog>[] = [
        {
            accessorKey: "created_at",
            header: "Date",
            cell: ({ row }) => (
                <span className="text-muted-foreground font-mono text-xs">
                    {format(new Date(row.original.created_at), "MMM d, HH:mm:ss")}
                </span>
            ),
        },
        {
            accessorKey: "user_email",
            header: "User",
            cell: ({ row }) => <span className="text-sm font-medium">{row.original.user_email || "N/A"}</span>
        },
        {
            accessorKey: "asset_symbol",
            header: "Asset",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-bold text-xs">{row.original.asset_symbol || "BTC/USD"}</span>
                    <span className={
                        row.original.direction === 'call' ? "text-green-500 text-[10px]" : "text-red-500 text-[10px]"
                    }>{String(row.original.direction || "").toUpperCase()}</span>
                </div>
            )
        },
        {
            accessorKey: "amount",
            header: "Amount",
            cell: ({ row }) => <span className="font-mono text-xs">${Number(row.original.amount || 0).toFixed(2)}</span>
        },
        {
            accessorKey: "outcome",
            header: "Outcome",
            cell: ({ row }) => {
                const outcome = row.original.outcome || "unknown"
                return (
                    <Badge variant="outline" className={
                        outcome === 'win' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                            outcome === 'loss' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                outcome === 'refund' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                    "bg-amber-500/10 text-amber-500"
                    }>
                        {outcome.toUpperCase()}
                    </Badge>
                )
            }
        },
        {
            accessorKey: "final_price",
            header: "Strike Price",
            cell: ({ row }) => <span className="font-mono text-xs text-amber-500">{row.original.final_price}</span>
        },
        {
            accessorKey: "rationale",
            header: "Rationale",
            cell: ({ row }) => {
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger className="cursor-help flex items-center gap-1 text-xs text-muted-foreground underline decoration-dashed">
                                <Info className="h-3 w-3" /> View Note
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px] bg-black border border-white/20 p-2">
                                <p>{row.original.rationale}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )
            }
        },
        {
            accessorKey: "admin_id",
            header: "Admin Ref", // displaying generic icon or ID
            cell: () => <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        }
    ]

    return (
        <div className="p-4">
            <AdminDataTable
                columns={columns}
                data={data}
                searchKey="user_email"
                searchPlaceholder="Search logs by user..."
            />
        </div>
    )
}
