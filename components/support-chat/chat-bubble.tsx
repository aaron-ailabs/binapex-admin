"use client"

import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

export interface ChatMessage {
  id: string
  sender_role: "USER" | "ADMIN"
  sender_id: string
  message: string
  created_at: string
}

interface ChatBubbleProps {
  message: ChatMessage
  isCurrentUser?: boolean
  senderName?: string
}

export function ChatBubble({ message, isCurrentUser = false, senderName }: ChatBubbleProps) {
  const isAdmin = message.sender_role === "ADMIN"
  const isOwnMessage = isCurrentUser

  return (
    <div
      className={cn(
        "flex w-full gap-3 px-4 py-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
        isOwnMessage ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar - only show for received messages */}
      {!isOwnMessage && (
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            isAdmin
              ? "bg-gradient-to-br from-gold to-gold-dark text-black"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isAdmin ? "A" : "U"}
        </div>
      )}

      {/* Message Container */}
      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-1",
          isOwnMessage ? "items-end" : "items-start"
        )}
      >
        {/* Sender Name - only for received messages */}
        {!isOwnMessage && senderName && (
          <span className="px-3 text-xs font-medium text-muted-foreground">
            {senderName}
          </span>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            "break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
            isOwnMessage
              ? "bg-gradient-to-br from-gold/90 to-gold-dark/90 text-black"
              : "bg-muted/50 text-foreground"
          )}
        >
          {message.message}
        </div>

        {/* Timestamp */}
        <span className="px-3 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </span>
      </div>

      {/* Avatar placeholder for sent messages (maintains layout symmetry) */}
      {isOwnMessage && <div className="w-8 shrink-0" />}
    </div>
  )
}
