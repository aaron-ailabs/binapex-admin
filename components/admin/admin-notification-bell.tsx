"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, Check, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn, logError } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/contexts/auth-context"

interface Notification {
  id: string
  type: string
  message: string
  is_read: boolean
  created_at: string
}

export function AdminNotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()

  const fetchNotifications = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) {
      logError("API admin_notifications.select", error)
    } else if (data) {
      setNotifications(data)
    }

    const { count, error: countError } = await supabase
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)

    if (countError) {
      logError("API admin_notifications.count", countError)
    } else {
      setUnreadCount(count || 0)
    }
  }

  useEffect(() => {
    fetchNotifications()

    if (!user) return

    // Subscribe to new notifications
    const channel = supabase
      .channel("admin_notifications_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
        },
        () => {
          fetchNotifications()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "admin_notifications",
        },
        () => {
          fetchNotifications()
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [supabase, user])

  const markAsRead = async (id: string) => {
    await supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("id", id)
    fetchNotifications()
  }

  const markAllAsRead = async () => {
    await supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("is_read", false)
    fetchNotifications()
  }

  const clearAll = async () => {
      await supabase
        .from("admin_notifications")
        .delete()
        .neq("id", "") // Simple way to delete all visible ones
      fetchNotifications()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-white/10">
          <Bell className="h-5 w-5 text-gray-400" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-zinc-950 border-zinc-800 text-zinc-100">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex gap-2">
            {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-[10px] px-2 hover:bg-white/5">
                    Mark all read
                </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-[10px] px-2 hover:bg-red-500/10 text-red-500">
                Clear all
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500">No notifications</div>
          ) : (
            notifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 cursor-pointer transition-colors focus:bg-white/5",
                  !notif.is_read && "bg-primary/5 border-l-2 border-primary"
                )}
                onClick={() => markAsRead(notif.id)}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className={cn(
                      "text-xs font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider",
                      notif.type === 'deposit' ? "bg-green-500/20 text-green-400" : 
                      notif.type === 'withdrawal' ? "bg-blue-500/20 text-blue-400" :
                      "bg-indigo-500/20 text-indigo-400"
                  )}>
                    {notif.type}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{notif.message}</p>
                {!notif.is_read && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-primary">
                        <Check className="h-3 w-3" />
                        Mark as read
                    </div>
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
