"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Shield, Wallet, Eye, ExternalLink, UserCog } from "lucide-react"
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
import { useRouter } from "next/navigation"
import { AdminDataTable } from "@/components/admin/data-table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { adminFreezeUser } from "@/lib/admin-rpc"
import { UserRoleDialog } from "./user-role-dialog"

type UserProfile = {
    id: string
    email: string
    full_name: string | null
    role: string
    status: string // 'active', 'frozen', 'suspended'
    created_at: string
    total_count?: number
}

export function UsersTable({ initialData }: { initialData: any[] }) {
    const [freezeTarget, setFreezeTarget] = useState<UserProfile | null>(null)
    const [roleDialogUser, setRoleDialogUser] = useState<UserProfile | null>(null)
    const [isFreezing, setIsFreezing] = useState(false)
    const [roleFilter, setRoleFilter] = useState<string>("all")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const router = useRouter()

    const handleFreeze = async () => {
        if (!freezeTarget) return
        setIsFreezing(true)
        try {
            const shouldFreeze = freezeTarget.status !== 'frozen'
            const result = await adminFreezeUser(freezeTarget.id, shouldFreeze)

            if (result.success) {
                toast.success(result.message || `User status updated`)
                setFreezeTarget(null)
                router.refresh()
            } else {
                toast.error(result.error || "Failed to update user status")
            }
        } catch (error) {
            toast.error("An unexpected error occurred")
        } finally {
            setIsFreezing(false)
        }
    }

    const filteredData = initialData.filter(user => {
        const roleMatch = roleFilter === "all" || user.role === roleFilter
        const statusMatch = statusFilter === "all" || user.status === statusFilter
        return roleMatch && statusMatch
    })

    const columns: ColumnDef<UserProfile>[] = [
        {
            accessorKey: "id",
            header: "User ID",
            cell: ({ row }) => <span className="text-xs font-mono text-muted-foreground">{row.original.id.slice(0, 8)}</span>
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium text-foreground">{row.original.email}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{row.original.full_name || "N/A"}</span>
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
                const status = row.original.status || 'active'
                return (
                    <Badge variant="outline" className={
                        status === 'active' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                            status === 'frozen' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    }>
                        {status.toUpperCase()}
                    </Badge>
                )
            }
        },
        {
            accessorKey: "created_at",
            header: () => <div className="text-right">Joined</div>,
            cell: ({ row }) => (
                <div className="text-right text-muted-foreground text-xs font-mono">
                    {format(new Date(row.original.created_at), "MMM d, yyyy")}
                </div>
            )
        },
        {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const user = row.original
                const isFrozen = user.status === 'frozen'

                return (
                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10">
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
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => setRoleDialogUser(user)}
                                >
                                    <UserCog className="mr-2 h-4 w-4" /> Edit Role
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                    <Wallet className="mr-2 h-4 w-4" /> Manage Balances
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-red-500 focus:text-red-500 cursor-pointer"
                                    onClick={() => setFreezeTarget(user)}
                                >
                                    <Shield className="mr-2 h-4 w-4" /> {isFrozen ? "Unfreeze Account" : "Freeze Account"}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[150px] bg-card/50 border-white/10">
                        <SelectValue placeholder="Filter Role" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121212] border-white/10 text-white">
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="trader">Trader</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px] bg-card/50 border-white/10">
                        <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121212] border-white/10 text-white">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="frozen">Frozen</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <AdminDataTable
                columns={columns}
                data={filteredData}
                searchKey="email"
                searchPlaceholder="Search by email..."
            />

            <Dialog open={!!freezeTarget} onOpenChange={() => setFreezeTarget(null)}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>{freezeTarget?.status === 'frozen' ? "Unfreeze Account" : "Freeze Account"}</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to {freezeTarget?.status === 'frozen' ? "enable" : "disable"} the account for <strong>{freezeTarget?.email}</strong>?
                            {freezeTarget?.status !== 'frozen' && " This will prevent the user from trading or withdrawing funds until the account is unfrozen."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFreezeTarget(null)} disabled={isFreezing} className="border-white/10 hover:bg-white/5">
                            Cancel
                        </Button>
                        <Button variant={freezeTarget?.status === 'frozen' ? "default" : "destructive"} onClick={handleFreeze} disabled={isFreezing}>
                            {isFreezing ? "Processing..." : (freezeTarget?.status === 'frozen' ? "Confirm Unfreeze" : "Confirm Freeze")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <UserRoleDialog
                user={roleDialogUser}
                open={!!roleDialogUser}
                onOpenChange={(open) => !open && setRoleDialogUser(null)}
            />
        </div>
    )
}
