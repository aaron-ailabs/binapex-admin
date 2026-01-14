"use client"

import { AdminDataTable } from "@/components/admin/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Shield, Wallet, Eye } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
// We would import the UserDetailDrawer here
import { UserDetailDrawer } from "./user-detail-drawer"

type UserProfile = {
    id: string
    email: string
    full_name: string | null
    created_at: string
    role?: string
    status?: string // assuming we might have this
    balance?: number // assuming joined or fetched
}

export function UsersTable({ initialData }: { initialData: any[] }) {
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    const columns: ColumnDef<UserProfile>[] = [
        {
            accessorKey: "email",
            header: "User",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium text-foreground">{row.original.full_name || "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">{row.original.email}</span>
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                // Mock status logic if field missing
                const status = row.original.status || "active"
                return (
                    <Badge variant="outline" className={
                        status === 'active' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                            status === 'suspended' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    }>
                        {status.toUpperCase()}
                    </Badge>
                )
            }
        },
        {
            accessorKey: "created_at",
            header: "Joined",
            cell: ({ row }) => <span className="text-muted-foreground font-mono text-xs">{format(new Date(row.original.created_at), "MMM d, yyyy")}</span>
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const user = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-panel">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                                setSelectedUser(user)
                                setDrawerOpen(true)
                            }}>
                                <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <Wallet className="mr-2 h-4 w-4" /> View Transactions
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500 focus:text-red-500">
                                <Shield className="mr-2 h-4 w-4" /> Freeze Account
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    return (
        <>
            <AdminDataTable
                columns={columns}
                data={initialData}
                searchKey="email"
                searchPlaceholder="Search by email..."
            />

            {/* User 360 Drawer */}
            {selectedUser && (
                <UserDetailDrawer
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    user={selectedUser}
                />
            )}
        </>
    )
}
