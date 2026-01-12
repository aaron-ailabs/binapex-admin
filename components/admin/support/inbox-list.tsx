"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { Search, MessageSquare } from "lucide-react"

interface InboxItem {
  user_id: string
  last_message: string
  sender_role: "user" | "admin"
  last_activity: string
  user_email: string | null
  unread_count: number
}

interface InboxListProps {
  onSelectUser: (userId: string) => void
  selectedUserId: string | null
}

export function InboxList({ onSelectUser, selectedUserId }: InboxListProps) {
  const supabase = createClient()
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchInbox = async () => {
    // We use the VIEW which now includes unread_count
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

    // Subscribe to new messages
    const channel = supabase
      .channel("admin_inbox_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
        },
        () => {
          fetchInbox() // Refetch to update order and unread counts
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredInbox = inbox.filter(item =>
    (item.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    item.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-full w-full flex-col border-r border-[#262626] bg-[#0a0a0a] min-h-0">
      {/* Header */}
      <div className="p-3 bg-[#1a1a1a] flex items-center justify-between border-b border-[#262626]">
        <div className="h-10 w-10 rounded-full bg-[#262626] overflow-hidden border border-[#262626]">
          <img src="https://ui-avatars.com/api/?name=Admin&background=random" alt="Admin" />
        </div>
        <div className="flex gap-4 text-[#a3a3a3]">
          {/* Icons like Status, Channels, etc could go here */}
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-[#262626] bg-[#1a1a1a]">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#a3a3a3]" />
          </div>
          <input
            type="text"
            placeholder="Search or start new chat"
            className="block w-full pl-10 pr-3 py-1.5 border-none rounded-lg leading-5 bg-[#262626] text-[#fafafa] placeholder-[#a3a3a3] focus:outline-none focus:ring-1 focus:ring-[#EBD062]/50 sm:text-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-[#262626]" />
            ))}
          </div>
        ) : filteredInbox.length === 0 ? (
          <div className="p-8 text-center text-[#a3a3a3]">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No messages found</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredInbox.map((item) => (
              <button
                key={item.user_id}
                onClick={() => onSelectUser(item.user_id)}
                className={cn(
                  "flex px-3 py-3 gap-3 hover:bg-[#1a1a1a] transition-colors cursor-pointer relative group",
                  selectedUserId === item.user_id ? "bg-[#262626]" : "bg-transparent"
                )}
              >
                <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0 border border-[#262626]">
                  <img
                    src={`https://ui-avatars.com/api/?name=${item.user_email || 'User'}&background=random`}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center border-b border-[#262626] pb-3 group-last:border-none">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="text-[#fafafa] font-normal text-[17px] truncate">
                      {item.user_email || "Unknown User"}
                    </span>
                    <span className={cn(
                      "text-xs shrink-0",
                      item.unread_count > 0 ? "text-[#EBD062] font-medium" : "text-[#a3a3a3]"
                    )}>
                      {formatDistanceToNow(new Date(item.last_activity), { addSuffix: false })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="text-[#a3a3a3] text-sm truncate pr-2 flex-1">
                      {item.sender_role === "admin" && (
                        <span className="mr-1 text-[#EBD062]">✓</span>
                      )}
                      {item.last_message}
                    </p>

                    {item.unread_count > 0 && (
                      <span className="bg-[#EBD062] text-black text-xs font-bold px-1.5 min-w-[1.25rem] h-5 rounded-full flex items-center justify-center shrink-0">
                        {item.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
