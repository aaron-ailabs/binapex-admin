"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { User, MessageSquare } from "lucide-react"

interface InboxItem {
  user_id: string
  last_message: string
  sender_role: "user" | "admin"
  last_activity: string
  user_email: string | null
}

interface InboxListProps {
  onSelectUser: (userId: string) => void
  selectedUserId: string | null
}

export function InboxList({ onSelectUser, selectedUserId }: InboxListProps) {
  const supabase = createClient()
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchInbox = async () => {
    const { data, error } = await supabase
      .from("admin_support_inbox")
      .select("*")
      .order("last_activity", { ascending: false })

    if (error) {
        console.error("Error fetching inbox:", error)
    } else {
        setInbox(data as InboxItem[])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchInbox()

    // Subscribe to new messages to refresh the list order
    const channel = supabase
      .channel("admin_inbox_updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
        },
        () => {
          // Ideally we optimize this to just move/update the item, 
          // but refetching is safer for ensuring correct order and data.
          // Since this is an admin dashboard with limited concurrent usage, it's fine.
          fetchInbox()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="flex h-full w-full flex-col border-r border-zinc-800 bg-zinc-900 min-h-0">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-xl font-semibold text-white">Inbox</h2>
        <p className="text-zinc-400 text-xs">Active Conversations</p>
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-800/50" />
                ))}
            </div>
        ) : inbox.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No messages yet</p>
            </div>
        ) : (
            <div className="flex flex-col">
            {inbox.map((item) => (
                <button
                key={item.user_id}
                onClick={() => onSelectUser(item.user_id)}
                className={cn(
                    "flex flex-col items-start gap-1 p-4 text-left transition-colors hover:bg-zinc-800/50 border-b border-zinc-800/50 last:border-0",
                    selectedUserId === item.user_id && "bg-zinc-800 border-l-4 border-l-amber-500"
                )}
                >
                <div className="flex w-full items-center justify-between">
                    <span className="font-medium text-zinc-200 truncate max-w-[180px]">
                        {item.user_email || "Unknown User"}
                    </span>
                    <span className="text-xs text-zinc-500 shrink-0">
                        {formatDistanceToNow(new Date(item.last_activity), { addSuffix: true })}
                    </span>
                </div>
                <p className={cn(
                    "w-full truncate text-sm",
                    item.sender_role === "user" ? "text-zinc-300 font-medium" : "text-zinc-500 italic"
                )}>
                    {item.sender_role === "admin" && "You: "}
                    {item.last_message}
                </p>
                </button>
            ))}
            </div>
        )}
      </ScrollArea>
    </div>
  )
}
