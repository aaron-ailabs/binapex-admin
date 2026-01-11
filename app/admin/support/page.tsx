"use client"

import { useState } from "react"
import { InboxList } from "@/components/admin/support/inbox-list"
import { AdminChatWindow } from "@/components/admin/support/admin-chat-window"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default function AdminSupportPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  return (
    <div className="flex h-[calc(100dvh-theme(spacing.16))] overflow-hidden bg-zinc-950 border border-zinc-800 m-4 rounded-xl shadow-2xl">
      {/* Sidebar: Inbox List */}
      <div className={cn(
        "border-r border-zinc-800 md:w-1/3 md:min-w-[300px] md:block",
        selectedUserId ? "hidden" : "w-full block"
      )}>
        <InboxList 
          onSelectUser={setSelectedUserId} 
          selectedUserId={selectedUserId} 
        />
      </div>

      {/* Main Panel: Chat Window */}
      <div className={cn(
        "flex-1 bg-zinc-950 md:w-2/3 md:block",
        selectedUserId ? "w-full block" : "hidden"
      )}>
        <AdminChatWindow 
          selectedUserId={selectedUserId} 
          onBack={() => setSelectedUserId(null)}
        />
      </div>
    </div>
  )
}
