"use client"

import { useState, useEffect, useRef } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  content: string
  sender_role: "user" | "admin"
  created_at: string
}

export function ChatInterface() {
  const { user } = useAuth()
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch initial messages and subscribe to realtime updates
  useEffect(() => {
    if (!user) return

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      if (!error && data) {
        setMessages(data as Message[])
      }
      setIsLoading(false)
    }

    fetchMessages()

    // Realtime subscription
    const channel = supabase
      .channel("support_chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    const content = newMessage.trim()
    setNewMessage("") // Optimistic clear

    // Optimistic update (optional, but good for UX)
    // For now we rely on realtime or local state. 
    // Let's rely on the INSERT success or Realtime to add it back to ensure consistency.
    // Or we can add it optimistically.
    
    // Actually, requirement 2 says: "Sending: INSERT... Clear input field. Scroll to bottom."
    // It implies we just fire and forget, and let Realtime pick it up? 
    // Or we should update local state manually to feel instant.
    // The instructions say "When a new message arrives (from Admin), push it to the messages array instantly."
    // It doesn't explicitly say "When User sends, push instantly". 
    // But usually we should.
    // However, since we are subscribing to INSERT on this user's messages, we will receive our own message back from Supabase Realtime.
    // So we don't need to manually update state if Realtime is fast enough.
    // To avoid duplication, I will NOT manually add it, trusting Realtime.

    const { error } = await supabase.from("support_messages").insert({
      user_id: user.id,
      content: content,
      sender_role: "user",
    })

    if (error) {
      console.error("Failed to send message:", error)
      // Logic to restore input if failed could go here
    }
  }

  return (
    <div className="flex h-full flex-col bg-zinc-950 min-h-0">
      {/* Header (Optional, maybe part of parent or simple integrated header) */}
      <div className="flex items-center justify-between border-b border-zinc-900 bg-zinc-950 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span className="text-sm font-semibold text-zinc-200">Support Team</span>
        </div>
      </div>

      {/* Message List */}
      <ScrollArea className="flex-1 bg-zinc-950 p-4 overflow-hidden">
         <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
              </div>
            ) : messages.length === 0 ? (
               <div className="flex h-full flex-col items-center justify-center space-y-2 py-12 text-center text-zinc-500">
                  <p className="text-lg font-medium text-zinc-400">How can we help you today?</p>
                  <p className="text-xs">We usually respond within a few minutes.</p>
               </div>
            ) : (
                messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={cn(
                            "flex w-full",
                            msg.sender_role === "user" ? "justify-end" : "justify-start"
                        )}
                    >
                        <div
                            className={cn(
                                "max-w-[80%] px-4 py-2 text-sm shadow-sm",
                                msg.sender_role === "user"
                                    ? "bg-amber-500 text-black rounded-2xl rounded-tr-none"
                                    : "bg-zinc-800 text-white rounded-2xl rounded-tl-none"
                            )}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))
            )}
            <div ref={scrollRef} />
         </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-zinc-900 bg-zinc-950 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border-none bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-amber-500/50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim()}
            className="bg-amber-500 text-black hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
