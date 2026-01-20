"use client"

import { useEffect, useRef } from "react"
import { ChatBubble, type ChatMessage } from "./chat-bubble"
import { Loader2 } from "lucide-react"

interface ChatMessageListProps {
  messages: ChatMessage[]
  currentUserId?: string
  isLoading?: boolean
  error?: string | null
  emptyMessage?: string
  getSenderName?: (senderId: string) => string
}

export function ChatMessageList({
  messages,
  currentUserId,
  isLoading = false,
  error = null,
  emptyMessage = "No messages yet. Start the conversation!",
  getSenderName,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previousMessagesLengthRef = useRef(messages.length)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Only auto-scroll if:
    // 1. New messages were added
    // 2. User is near the bottom (within 100px)
    const container = containerRef.current
    if (!container) return

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100

    const hasNewMessages = messages.length > previousMessagesLengthRef.current

    if (hasNewMessages && (isNearBottom || previousMessagesLengthRef.current === 0)) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    previousMessagesLengthRef.current = messages.length
  }, [messages])

  // Initial scroll on mount
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "instant" })
      }, 100)
    }
  }, [])

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
          <p className="text-sm">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load messages</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-8 w-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Send a message to start the conversation
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col overflow-y-auto overscroll-contain scroll-smooth"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "hsl(var(--gold) / 0.3) transparent",
      }}
    >
      {/* Messages */}
      <div className="flex flex-1 flex-col justify-end py-4">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            isCurrentUser={message.sender_id === currentUserId}
            senderName={getSenderName?.(message.sender_id)}
          />
        ))}
        {/* Scroll anchor */}
        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  )
}
