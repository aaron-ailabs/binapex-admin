"use client"

import { AdminDataTable } from "@/components/admin/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Gavel, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function ActiveTradesTable({ data }: { data: any[] }) {
    const [processingId, setProcessingId] = useState<string | null>(null)
    const supabase = createClient() // Need to import createClient
    const router = useRouter() // Need to import useRouter

    const handleSettle = async (tradeId: string, outcome: 'WIN' | 'LOSS') => {
        setProcessingId(tradeId)
        try {
            // Hardcoded rationale for quick settlement
            const rationale = "Manual settlement by admin"
            const docUrl = null

            const { error } = await supabase.rpc('settle_binary_order', {
                p_order_id: tradeId,
                p_outcome: outcome,
                p_final_price: 0,
                p_rationale: rationale,
                p_supporting_document_url: docUrl
            })

            if (error) throw error

            toast.success(`Trade settled as ${outcome}`)
            router.refresh()
        } catch (error: any) {
            console.error("Settlement error:", error)
            toast.error(`Error: ${error.message}`)
        } finally {
            setProcessingId(null)
        }
    }

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
            minSize: 200,
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={() => handleSettle(row.original.id, 'WIN')}
                        disabled={!!processingId}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-7 text-xs"
                    >
                        {processingId === row.original.id ? <Loader2 className="animate-spin h-3 w-3" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                        WIN
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => handleSettle(row.original.id, 'LOSS')}
                        disabled={!!processingId}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold h-7 text-xs"
                    >
                        {processingId === row.original.id ? <Loader2 className="animate-spin h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                        LOSS
                    </Button>
                </div>
            )
        }
    ]

    return (
        <div className="p-4">
            <AdminDataTable
                columns={columns}
                data={data} // Use dynamic data if possible, but props is fine for now
                searchKey="asset_symbol"
                searchPlaceholder="Filter by asset..."
            />
        </div>
    )
}
