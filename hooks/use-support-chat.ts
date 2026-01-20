"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ChatMessage } from "@/components/support-chat/chat-bubble"
import { useAuth } from "@/contexts/auth-context"
import { logError, logInfo } from "@/lib/utils"

interface UseSupportChatOptions {
  conversationId: string | null
  enabled?: boolean
}

interface UseSupportChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (message: string) => Promise<void>
  refreshMessages: () => Promise<void>
}

export function useSupportChat({
  conversationId,
  enabled = true,
}: UseSupportChatOptions): UseSupportChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const { user } = useAuth()

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!conversationId || !enabled || !user) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (fetchError) throw fetchError

      setMessages(data || [])
    } catch (err) {
      logError("API support_messages.select", err)
      setError(err instanceof Error ? err.message : "Failed to load messages")
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, enabled, supabase, user])

  // Send message using RPC
  const sendMessage = useCallback(
    async (message: string) => {
      if (!conversationId) {
        throw new Error("No conversation ID")
      }

      const { data, error: sendError } = await supabase.rpc("send_support_message", {
        p_conversation_id: conversationId,
        p_message: message,
      })

      if (sendError) {
        logError("API send_support_message", sendError)
        throw new Error(sendError.message || "Failed to send message")
      }

      // Message will be added via Realtime, but we can optimistically add it
      // Actually, let's rely on Realtime for consistency
      return data
    },
    [conversationId, supabase]
  )

  // Subscribe to Realtime updates
  useEffect(() => {
    if (!conversationId || !enabled || !user) return

    if (channelRef.current) {
      channelRef.current.unsubscribe()
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Initial load
    loadMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`support_messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((msg) => msg.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          logInfo("Realtime", "Subscribed to chat updates", { conversationId })
        }
        if (status === "CHANNEL_ERROR") {
          logError("Realtime", "Failed to subscribe to chat updates")
          setError("Real-time updates unavailable")
        }
      })

    channelRef.current = channel

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [conversationId, enabled, loadMessages, supabase, user])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refreshMessages: loadMessages,
  }
}

// Hook to get or create a conversation for the current user
export function useGetOrCreateConversation() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const hasAttemptedRef = useRef(false)

  const getOrCreateConversation = useCallback(async () => {
    if (hasAttemptedRef.current) return

    setIsLoading(true)
    setError(null)
    hasAttemptedRef.current = true

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_or_create_support_conversation"
      )

      if (rpcError) throw rpcError

      setConversationId(data)
    } catch (err) {
      logError("API get_or_create_support_conversation", err)
      setError(err instanceof Error ? err.message : "Failed to initialize chat")
      hasAttemptedRef.current = false // Allow retry
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Auto-initialize on mount
  useEffect(() => {
    getOrCreateConversation()
  }, [getOrCreateConversation])

  return {
    conversationId,
    isLoading,
    error,
    retry: () => {
      hasAttemptedRef.current = false
      getOrCreateConversation()
    },
  }
}
