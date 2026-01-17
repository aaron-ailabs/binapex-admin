"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Shield, Wallet, Eye, ExternalLink } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
import Link from "next/link"
import { AdminDataTable } from "@/components/admin/data-table"

type UserProfile = {
    id: string
    email: string
    full_name: string | null
    role: string
    membership_tier: string
    created_at: string
    kyc_verified: boolean
}

export function UsersTable({ initialData }: { initialData: any[] }) {
    const columns: ColumnDef<UserProfile>[] = [
        {
            accessorKey: "id",
            header: "User ID",
            cell: ({ row }) => <span className="text-xs font-mono text-muted-foreground">{row.original.id.slice(0, 8)}...</span>
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium text-foreground">{row.original.email}</span>
                    <span className="text-xs text-muted-foreground">{row.original.full_name || "N/A"}</span>
                </div>
            ),
        },
        {
            accessorKey: "role",
            header: "Role",
            cell: ({ row }) => {
                const role = row.original.role || 'trader'
                return (
                    <Badge variant="outline" className={
                        role === 'admin' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                            role === 'moderator' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                "bg-gray-500/10 text-gray-400 border-gray-500/20"
                    }>
                        {role.toUpperCase()}
                    </Badge>
                )
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const isVerified = row.original.kyc_verified
                const tier = row.original.membership_tier || 'standard'
                return (
                    <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={
                            isVerified ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }>
                            {isVerified ? "VERIFIED" : "PENDING"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground uppercase">{tier}</span>
                    </div>
                )
            }
        },
        {
            accessorKey: "created_at",
            header: "Joined",
            cell: ({ row }) => <span className="text-muted-foreground text-xs">{format(new Date(row.original.created_at), "MMM d, yyyy")}</span>
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const user = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/5">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-panel border-white/10 bg-[#121212] text-white">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                                <Link href={`/admin/users/${user.id}`} className="cursor-pointer">
                                    <Eye className="mr-2 h-4 w-4" /> View Full Profile
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem className="cursor-pointer">
                                <Wallet className="mr-2 h-4 w-4" /> Manage Balances
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500 focus:text-red-500 cursor-pointer">
                                <Shield className="mr-2 h-4 w-4" /> Freeze Account
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    return (
        <AdminDataTable
            columns={columns}
            data={initialData}
            searchKey="email"
            searchPlaceholder="Search by email..."
        />
    )
}
