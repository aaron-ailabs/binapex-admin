"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, MessageCircle, X, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChatMessageList } from "./chat-message-list"
import { ChatInputBar } from "./chat-input-bar"
import { useSupportChat } from "@/hooks/use-support-chat"
import { formatDistanceToNow } from "date-fns"

interface Conversation {
  conversation_id: string
  user_id: string
  status: "OPEN" | "CLOSED"
  created_at: string
  updated_at: string
  user_email: string | null
  user_name: string | null
  message_count: number
  latest_message: string | null
  latest_message_at: string | null
  latest_message_sender: "USER" | "ADMIN" | null
}

export function AdminChatPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [conversationsError, setConversationsError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showMobileList, setShowMobileList] = useState(true)
  const supabase = createClient()

  // Load conversations
  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    setConversationsError(null)

    try {
      const { data, error } = await supabase
        .from("admin_support_conversations_view")
        .select("*")
        .order("updated_at", { ascending: false })

      if (error) throw error

      setConversations(data || [])
    } catch (err) {
      console.error("Failed to load conversations:", err)
      setConversationsError(
        err instanceof Error ? err.message : "Failed to load conversations"
      )
    } finally {
      setIsLoadingConversations(false)
    }
  }, [supabase])

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
  }, [supabase])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Subscribe to conversation updates
  useEffect(() => {
    const channel = supabase
      .channel("admin_conversations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_conversations",
        },
        () => {
          // Reload conversations when any change happens
          loadConversations()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
        },
        () => {
          // Reload conversations when new messages arrive
          loadConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadConversations, supabase])

  const selectedConversation = conversations.find(
    (c) => c.conversation_id === selectedConversationId
  )

  // Chat hook for selected conversation
  const { messages, isLoading: isLoadingMessages, error: messagesError, sendMessage } = useSupportChat({
    conversationId: selectedConversationId,
    enabled: !!selectedConversationId,
  })

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId)
    setShowMobileList(false)
  }

  const handleBackToList = () => {
    setShowMobileList(true)
    setSelectedConversationId(null)
  }

  const handleSendMessage = async (message: string) => {
    try {
      await sendMessage(message)
    } catch (error) {
      console.error("Failed to send:", error)
    }
  }

  const handleCloseConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase.rpc("close_support_conversation", {
        p_conversation_id: conversationId,
      })

      if (error) throw error

      // Reload conversations
      loadConversations()

      // If this was the selected conversation, deselect it
      if (conversationId === selectedConversationId) {
        setSelectedConversationId(null)
        setShowMobileList(true)
      }
    } catch (err) {
      console.error("Failed to close conversation:", err)
    }
  }

  return (
    <div className="flex h-full">
      {/* Conversation List */}
      <div
        className={cn(
          "flex h-full flex-col border-r bg-muted/20",
          "w-full md:w-80 lg:w-96",
          // Mobile: hide when chat is open
          showMobileList ? "block" : "hidden md:block"
        )}
      >
        {/* Header */}
        <div className="border-b bg-background p-4">
          <h2 className="text-lg font-semibold">Support Conversations</h2>
          <p className="text-sm text-muted-foreground">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : conversationsError ? (
            <div className="p-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="mt-1 text-xs text-muted-foreground">{conversationsError}</p>
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4 text-center">
              <div>
                <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">No conversations yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  New conversations will appear here
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map((conversation) => (
                <button
                  key={conversation.conversation_id}
                  onClick={() => handleSelectConversation(conversation.conversation_id)}
                  className={cn(
                    "w-full p-4 text-left transition-colors",
                    "hover:bg-muted/50",
                    selectedConversationId === conversation.conversation_id &&
                      "bg-muted/80 border-l-4 border-l-gold"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">
                          {conversation.user_name || conversation.user_email || "Unknown User"}
                        </p>
                        <Badge
                          variant={conversation.status === "OPEN" ? "default" : "secondary"}
                          className={cn(
                            "shrink-0 text-xs",
                            conversation.status === "OPEN"
                              ? "bg-green-500/20 text-green-700 dark:text-green-400"
                              : "bg-gray-500/20 text-gray-700 dark:text-gray-400"
                          )}
                        >
                          {conversation.status}
                        </Badge>
                      </div>
                      {conversation.user_email && (
                        <p className="truncate text-xs text-muted-foreground">
                          {conversation.user_email}
                        </p>
                      )}
                      {conversation.latest_message && (
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {conversation.latest_message_sender === "ADMIN" && "You: "}
                          {conversation.latest_message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                      {conversation.latest_message_at && (
                        <span>
                          {formatDistanceToNow(new Date(conversation.latest_message_at), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                      {conversation.message_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {conversation.message_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div
        className={cn(
          "flex h-full flex-1 flex-col bg-background",
          // Mobile: hide when list is showing
          showMobileList ? "hidden md:flex" : "flex"
        )}
      >
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToList}
                  className="md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h3 className="font-semibold">
                    {selectedConversation.user_name ||
                      selectedConversation.user_email ||
                      "Unknown User"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.user_email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={selectedConversation.status === "OPEN" ? "default" : "secondary"}
                  className={cn(
                    selectedConversation.status === "OPEN"
                      ? "bg-green-500/20 text-green-700 dark:text-green-400"
                      : "bg-gray-500/20 text-gray-700 dark:text-gray-400"
                  )}
                >
                  {selectedConversation.status}
                </Badge>
                {selectedConversation.status === "OPEN" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCloseConversation(selectedConversation.conversation_id)}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Close
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <ChatMessageList
                messages={messages}
                currentUserId={currentUserId || undefined}
                isLoading={isLoadingMessages}
                error={messagesError}
                emptyMessage="No messages in this conversation"
                getSenderName={(senderId) => {
                  if (senderId === currentUserId) return "You"
                  if (senderId === selectedConversation.user_id) {
                    return selectedConversation.user_name || "User"
                  }
                  return "Admin"
                }}
              />
            </div>

            {/* Input */}
            {selectedConversation.status === "OPEN" && (
              <ChatInputBar
                onSendMessage={handleSendMessage}
                placeholder="Type your reply..."
                disabled={isLoadingMessages}
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <MessageCircle className="mx-auto h-16 w-16 text-muted-foreground/50" />
              <p className="mt-4 text-sm font-medium">Select a conversation</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a conversation from the list to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
