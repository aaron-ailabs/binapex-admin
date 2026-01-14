"use client"

import { AdminDataTable } from "@/components/admin/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
// We'll need a server action or client-side supabase call here
import { createClient } from "@/lib/supabase/client"

export function DepositsTable({ data }: { data: any[] }) {

    const handleApprove = async (id: string) => {
        try {
            const supabase = createClient()
            // Assuming we have an RPC or we use the API
            const { error } = await supabase.rpc("approve_deposit", { transaction_id: id })
            if (error) throw error
            toast.success("Deposit approved")
            window.location.reload()
        } catch (e: any) {
            toast.error(e.message || "Failed to approve")
        }
    }

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "created_at",
            header: "Date",
            cell: ({ row }) => <span className="text-xs text-muted-foreground">{format(new Date(row.original.created_at), "MMM d, HH:mm")}</span>,
        },
        {
            accessorKey: "email",
            header: "User",
            cell: ({ row }) => <span className="text-sm font-medium">{row.original.profiles?.email}</span>
        },
        {
            accessorKey: "amount",
            header: "Amount",
            cell: ({ row }) => <span className="font-mono font-bold text-green-500">+${row.original.amount}</span>
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.original.status || "pending"
                return (
                    <Badge variant="outline" className={
                        status === 'completed' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                            status === 'rejected' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    }>
                        {status.toUpperCase()}
                    </Badge>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                if (row.original.status !== 'pending') return null
                return (
                    <div className="flex gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10" onClick={() => handleApprove(row.original.id)}>
                            <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                            <XCircle className="h-4 w-4" />
                        </Button>
                    </div>
                )
            }
        }
    ]

    return (
        <div className="p-4">
            <AdminDataTable
                columns={columns}
                data={data}
                searchKey="email"
                searchPlaceholder="Search deposits..."
            />
        </div>
    )
}
