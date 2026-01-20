"use client"

import { useState, useEffect } from "react"
import { MessageCircle, X, Minimize2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChatMessageList } from "./chat-message-list"
import { ChatInputBar } from "./chat-input-bar"
import { useGetOrCreateConversation, useSupportChat } from "@/hooks/use-support-chat"
import { createClient } from "@/lib/supabase/client"

export function UserChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  // Get or create conversation
  const {
    conversationId,
    isLoading: isLoadingConversation,
    error: conversationError,
    retry: retryConversation,
  } = useGetOrCreateConversation()

  // Load messages
  const {
    messages,
    isLoading: isLoadingMessages,
    error: messagesError,
    sendMessage,
  } = useSupportChat({
    conversationId,
    enabled: isOpen && !!conversationId,
  })

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

  const handleToggle = () => {
    setIsOpen((prev) => !prev)
  }

  const handleSendMessage = async (message: string) => {
    try {
      await sendMessage(message)
    } catch (error) {
      console.error("Failed to send:", error)
      // Error handling is done in the hook
    }
  }

  const error = conversationError || messagesError
  const isLoading = isLoadingConversation || isLoadingMessages

  return (
    <>
      {/* Floating Widget Button */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-300",
          isOpen
            ? "bottom-[420px] right-4 md:bottom-[520px] md:right-6"
            : "bottom-4 right-4 md:bottom-6 md:right-6"
        )}
      >
        <Button
          onClick={handleToggle}
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full bg-gradient-to-br from-gold to-gold-dark text-black shadow-2xl",
            "hover:from-gold-dark hover:to-gold hover:scale-110",
            "transition-all duration-200",
            "ring-4 ring-background",
            // Touch-friendly
            "min-h-[56px] min-w-[56px]"
          )}
        >
          {isOpen ? (
            <Minimize2 className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
          <span className="sr-only">{isOpen ? "Minimize" : "Open"} support chat</span>
        </Button>

        {/* Unread badge (optional - can be implemented later) */}
        {!isOpen && (
          <div className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-red-500 text-xs font-bold text-white flex items-center justify-center animate-pulse">
            {/* Could show unread count here */}
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div
        className={cn(
          "fixed bottom-4 right-4 z-40 flex flex-col overflow-hidden",
          "rounded-2xl border bg-background shadow-2xl",
          "transition-all duration-300 ease-in-out",
          "md:bottom-6 md:right-6",
          isOpen
            ? "h-[400px] w-[calc(100vw-2rem)] opacity-100 md:h-[500px] md:w-[400px]"
            : "h-0 w-0 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-gold/10 to-gold-dark/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-black">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Support Chat</h3>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Connecting..." : "We're here to help"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className="h-8 w-8 rounded-full hover:bg-muted"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
                <p className="text-sm font-medium text-destructive">Connection Error</p>
                <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              </div>
              <Button
                onClick={retryConversation}
                variant="outline"
                size="sm"
                className="border-gold text-gold hover:bg-gold/10"
              >
                Try Again
              </Button>
            </div>
          ) : isLoadingConversation ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
                <p className="text-sm text-muted-foreground">Initializing chat...</p>
              </div>
            </div>
          ) : (
            <ChatMessageList
              messages={messages}
              currentUserId={currentUserId || undefined}
              isLoading={isLoadingMessages}
              error={messagesError}
              emptyMessage="Start a conversation with our support team"
            />
          )}
        </div>

        {/* Input */}
        {!error && !isLoadingConversation && conversationId && (
          <ChatInputBar
            onSendMessage={handleSendMessage}
            placeholder="Type your message..."
            disabled={isLoading}
          />
        )}
      </div>
    </>
  )
}
