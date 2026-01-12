"use client"

import { useState, useEffect } from "react"
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
    const supabase = createClient()

    // Stats
    const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.is_read).length,
        deposits: notifications.filter(n => n.type === 'deposit').length,
        withdrawals: notifications.filter(n => n.type === 'withdrawal').length,
    }

    const fetchNotifications = async () => {
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

        if (!error && data) {
            setNotifications(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchNotifications()

        const channel = supabase
            .channel("admin_notification_center")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "admin_notifications" },
                () => fetchNotifications()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

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

                        <div className="rounded-md border">
                            <div className="flex flex-col">
                                {filteredNotifications.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No notifications found matching this filter.
                                    </div>
                                ) : (
                                    filteredNotifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={cn(
                                                "flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/50 transition-colors",
                                                !notif.is_read && "bg-muted/20"
                                            )}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={cn(
                                                    "mt-1 p-2 rounded-full bg-background border shadow-sm",
                                                )}>
                                                    {getIcon(notif.type)}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className={cn("text-sm font-medium", !notif.is_read && "text-primary")}>
                                                        {notif.message}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Badge variant="secondary" className="text-[10px] uppercase font-normal h-5">
                                                            {notif.type}
                                                        </Badge>
                                                        <span>•</span>
                                                        <span>{format(new Date(notif.created_at), 'MMM d, h:mm a')}</span>
                                                        <span>({formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })})</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {!notif.is_read && (
                                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
