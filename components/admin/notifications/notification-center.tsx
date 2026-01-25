"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
    Bell,
    CheckCheck,
    Trash2,
    Filter,
    ArrowUpRight,
    ArrowDownLeft,
    TrendingUp,
    ShieldAlert,
    Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
// date-fns
import { formatDistanceToNow, format } from "date-fns"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { logError } from "@/lib/utils"
import { AdminLoader } from "@/components/ui/admin-loader"
import { TableEmptyState } from "../table-empty-state"
import { DollarSign, CreditCard, Check } from "lucide-react"

interface Notification {
    id: string
    user_id: string
    type: string
    message: string
    is_read: boolean
    created_at: string
    user?: { email: string }
}

export function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("all")
    const supabase = useMemo(() => createClient(), [])
    const { user } = useAuth()

    // Stats
    const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.is_read).length,
        deposits: notifications.filter(n => n.type === 'deposit').length,
        withdrawals: notifications.filter(n => n.type === 'withdrawal').length,
    }

    const fetchNotifications = async () => {
        if (!user) return

        setLoading(true)
        // Join with auth.users if possible, or just fetch notifications
        // Note: To join with auth.users in Supabase client, we need a view or RPC usually, 
        // but here we might just fetch notifications and maybe profiles if needed.
        // For now, simple fetch.
        const { data, error } = await supabase
            .from("admin_notifications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100) // Reasonable limit for checking history

        if (error) {
            logError("API admin_notifications.select", error)
        } else if (data) {
            setNotifications(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchNotifications()

        if (!user) return

        const channel = supabase
            .channel("admin_notification_center")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "admin_notifications" },
                () => fetchNotifications()
            )
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error('Realtime subscription error for admin_notification_center')
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, user])

    const handleMarkAllRead = async () => {
        const { error } = await supabase
            .from("admin_notifications")
            .update({ is_read: true })
            .eq("is_read", false)

        if (!error) {
            toast.success("All notifications marked as read")
            fetchNotifications()
        }
    }

    const handleClearAll = async () => {
        if (!confirm("Are you sure you want to clear all notifications?")) return

        const { error } = await supabase
            .from("admin_notifications")
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all

        if (!error) {
            toast.success("Notifications cleared")
            setNotifications([])
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'deposit': return <ArrowDownLeft className="h-4 w-4 text-green-500" />
            case 'withdrawal': return <ArrowUpRight className="h-4 w-4 text-blue-500" />
            case 'trade': return <TrendingUp className="h-4 w-4 text-yellow-500" />
            case 'security': return <ShieldAlert className="h-4 w-4 text-red-500" />
            default: return <Info className="h-4 w-4 text-gray-500" />
        }
    }

    const filteredNotifications = notifications.filter(n => {
        if (filter === "all") return true
        if (filter === "unread") return !n.is_read
        return n.type === filter
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Notification Center</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark all read
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClearAll} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear History
                    </Button>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">Last 100 notifications</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unread Alerts</CardTitle>
                        <div className="h-4 w-4 rounded-full bg-red-500 text-[10px] flex items-center justify-center text-white font-bold">
                            {stats.unread}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.unread}</div>
                        <p className="text-xs text-muted-foreground">Requires attention</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Deposits</CardTitle>
                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.deposits}</div>
                        <p className="text-xs text-muted-foreground">Incoming funds</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Withdrawals</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.withdrawals}</div>
                        <p className="text-xs text-muted-foreground">Outgoing requests</p>
                    </CardContent>
                </Card>
            </div>

            {/* List Section */}
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Activity Feed</CardTitle>
                    <CardDescription>
                        Real-time monitoring of all user activities and system events.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="all" onValueChange={setFilter} className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="unread">Unread</TabsTrigger>
                            <TabsTrigger value="deposit">Deposits</TabsTrigger>
                            <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
                            <TabsTrigger value="trade">Trades</TabsTrigger>
                        </TabsList>

                        <div className="rounded-md border bg-card overflow-hidden">
                            <div className="overflow-x-auto relative max-h-[700px]">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/80 backdrop-blur-md sticky top-0 z-10">
                                        <tr className="border-b border-border">
                                            <th className="text-left px-6 py-3 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Activity</th>
                                            <th className="text-left px-6 py-3 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Details</th>
                                            <th className="text-right px-6 py-3 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Time</th>
                                            <th className="text-right px-6 py-3 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                         {loading ? (
                                             <tr>
                                                 <td colSpan={4} className="p-0">
                                                     <AdminLoader type="table" count={10} height="h-14" />
                                                 </td>
                                             </tr>
                                         ) : filteredNotifications.length === 0 ? (
                                             <tr>
                                                 <td colSpan={4} className="p-0">
                                                     <TableEmptyState 
                                                         title="No notifications found"
                                                         description="Activity logs will appear here as users interact with the platform."
                                                         icon={Bell}
                                                     />
                                                 </td>
                                             </tr>
                                         ) : (
                                             filteredNotifications.map((notif) => (
                                                 <tr 
                                                     key={notif.id} 
                                                     className={cn(
                                                         "hover:bg-muted/50 transition-colors group",
                                                         !notif.is_read && "bg-primary/5"
                                                     )}
                                                 >
                                                     <td className="px-6 py-2">
                                                         <div className="flex items-center gap-3">
                                                             <div className={cn(
                                                                 "p-2 rounded-lg shrink-0 bg-background border shadow-sm",
                                                             )}>
                                                                 {getIcon(notif.type)}
                                                             </div>
                                                             <div className="flex flex-col">
                                                                 <span className="font-bold text-xs text-foreground uppercase tracking-tight">
                                                                     {notif.type}
                                                                 </span>
                                                                 <span className="text-[10px] text-muted-foreground font-mono uppercase">
                                                                     System Log
                                                                 </span>
                                                             </div>
                                                         </div>
                                                     </td>
                                                     <td className="px-6 py-2">
                                                         <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                                                             {notif.message}
                                                         </p>
                                                     </td>
                                                     <td className="px-6 py-2 text-right whitespace-nowrap">
                                                         <span className="text-[10px] text-muted-foreground font-mono uppercase">
                                                             {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                                         </span>
                                                     </td>
                                                     <td className="px-6 py-2 text-right">
                                                         <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                             {!notif.is_read && (
                                                                 <Button
                                                                     variant="ghost"
                                                                     size="sm"
                                                                     onClick={async () => {
                                                                         const { error } = await supabase
                                                                             .from("admin_notifications")
                                                                             .update({ is_read: true })
                                                                             .eq("id", notif.id)
                                                                         if (!error) fetchNotifications()
                                                                     }}
                                                                     className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                                                                     title="Mark as read"
                                                                 >
                                                                     <Check className="h-3.5 w-3.5" />
                                                                 </Button>
                                                             )}
                                                             <Button
                                                                 variant="ghost"
                                                                 size="sm"
                                                                 onClick={async () => {
                                                                     if (!confirm("Are you sure you want to delete this notification?")) return
                                                                     const { error } = await supabase
                                                                         .from("admin_notifications")
                                                                         .delete()
                                                                         .eq("id", notif.id)
                                                                     if (!error) {
                                                                         toast.success("Notification deleted")
                                                                         setNotifications(prev => prev.filter(n => n.id !== notif.id))
                                                                     }
                                                                 }}
                                                                 className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                                                 title="Delete"
                                                             >
                                                                 <Trash2 className="h-3.5 w-3.5" />
                                                             </Button>
                                                         </div>
                                                     </td>
                                                 </tr>
                                             ))
                                         )}
                                     </tbody>
                                </table>
                            </div>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
