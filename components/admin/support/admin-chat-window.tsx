"use client"

import { useState, useEffect, useRef } from "react"
import { Send, ArrowLeft, Pencil, X, Check, CheckCheck, Download, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface Message {
  id: string
  content: string
  sender_role: "user" | "admin"
  created_at: string
  user_id: string
  is_read: boolean
  attachment_url?: string
  attachment_type?: string
}

function ChatMessageAttachment({ path, type }: { path?: string, type?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!path) return

    async function fetchUrl() {
      const { data } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path!, 3600)

      if (data?.signedUrl) {
        setUrl(data.signedUrl)
      }
    }
    fetchUrl()
  }, [path, supabase])

  if (!path) return null
  if (!url) return <div className="h-48 w-48 animate-pulse rounded-lg bg-black/20" />

  return (
    <div className="mt-1 mb-1">
      <img
        src={url}
        alt="Attachment"
        className="max-h-60 max-w-full rounded-lg border border-black/10 object-contain cursor-pointer"
        onClick={() => window.open(url, '_blank')}
      />
    </div>
  )
}

interface AdminChatWindowProps {
  selectedUserId: string | null
  onBack?: () => void
}

export function AdminChatWindow({ selectedUserId, onBack }: AdminChatWindowProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [userDetail, setUserDetail] = useState<{ email: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch user details
  useEffect(() => {
    if (!selectedUserId) return;

    const fetchUser = async () => {
      const { data } = await supabase.from('profiles').select('email').eq('id', selectedUserId).single()
      if (data) setUserDetail(data)
      else {
        // fallback if profiles doesn't have email logic aligned or RLS
        // We rely on the inbox list view usually, but for header we want it.
        // Let's assume we can get it or just show ID
        setUserDetail({ email: 'User' })
      }
    }
    fetchUser()
  }, [selectedUserId])


  // Fetch messages when selected user changes
  useEffect(() => {
    if (!selectedUserId) {
      setMessages([])
      return
    }

    const fetchMessages = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("user_id", selectedUserId)
        .order("created_at", { ascending: true })

      if (!error && data) {
        setMessages(data as Message[])

        // Mark USER messages as read
        const unreadUserMsgIds = (data as Message[])
          .filter(m => m.sender_role === 'user' && !m.is_read)
          .map(m => m.id)

        if (unreadUserMsgIds.length > 0) {
          await supabase.from("support_messages").update({ is_read: true }).in("id", unreadUserMsgIds)
        }
      }
      setIsLoading(false)
    }

    fetchMessages()

    // Realtime subscription for THIS user's chat
    const channel = supabase
      .channel(`admin_chat_${selectedUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
          filter: `user_id=eq.${selectedUserId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as Message])
            // If message is from user, mark read immediately if this window is active
            if ((payload.new as Message).sender_role === 'user') {
              supabase.from("support_messages").update({ is_read: true }).eq('id', (payload.new as Message).id)
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new as Message : m))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedUserId, supabase])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUserId) return

    const content = newMessage.trim()
    setNewMessage("")

    const { error } = await supabase.from("support_messages").insert({
      user_id: selectedUserId, // IMPORTANT: The CUSTOMER'S ID
      content: content,
      sender_role: "admin",
    })

    if (error) {
      console.error("Failed to send reply:", error)
    }
  }

  if (!selectedUserId) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#222e35] text-[#aebac1] border-b-[6px] border-[#00a884]">
        {/* Placeholder for no chat selected - WhatsApp Web style */}
        <div className="max-w-[460px] text-center">
          <h1 className="text-[32px] font-light text-[#e9edef] mt-7">WhatsApp Web (Binapex Support)</h1>
          <div className="mt-4 text-sm leading-5">
            Send and receive messages without keeping your phone online. <br />
            Use Binapex Support on up to 4 linked devices and 1 phone.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a] min-h-0 relative">
      {/* Wallpaper */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
          backgroundRepeat: 'repeat'
        }}
      />

      {/* Header */}
      <div className="bg-[#1a1a1a] p-3 px-4 flex items-center justify-between border-b border-[#262626] z-10 w-full">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden text-[#a3a3a3]" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="h-10 w-10 rounded-full overflow-hidden cursor-pointer border border-[#262626]">
            <img src={`https://ui-avatars.com/api/?name=${userDetail?.email || 'User'}&background=random`} alt="User" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col cursor-pointer">
            <span className="text-[#fafafa] text-base leading-tight">
              {userDetail?.email || selectedUserId}
            </span>
            <span className="text-xs text-[#a3a3a3] mt-0.5">
              click to view info
            </span>
          </div>
        </div>
        <div className="flex gap-4 text-[#a3a3a3]">
          {/* Search, etc */}
        </div>
      </div>

      {/* Message List */}
      <ScrollArea className="flex-1 p-0 overflow-hidden z-10">
        <div className="flex flex-col p-4 space-y-2 min-h-full justify-end pb-2">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#EBD062] border-t-transparent"></div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex w-full mb-1",
                  msg.sender_role === "admin" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "relative px-3 py-1.5 shadow-sm max-w-[80%] min-w-[100px] text-sm group break-words",
                    msg.sender_role === "admin"
                      ? "bg-[#EBD062] text-black rounded-lg rounded-tr-none"
                      : "bg-[#262626] text-[#fafafa] rounded-lg rounded-tl-none"
                  )}
                >
                  {msg.attachment_url && (
                    <ChatMessageAttachment path={msg.attachment_url} type={msg.attachment_type} />
                  )}

                  <div className="mr-8 pb-1 font-medium">
                    {msg.content}
                  </div>

                  <div className="absolute bottom-1 right-2 flex items-center gap-1">
                    <span className={cn("text-[10px] leading-none", msg.sender_role === "admin" ? "text-black/60" : "text-white/60")}>
                      {format(new Date(msg.created_at), "HH:mm")}
                    </span>
                    {msg.sender_role === "admin" && (
                      <span className={cn(
                        "text-[10px] leading-none",
                        msg.is_read ? "text-black" : "text-black/40"
                      )}>
                        {msg.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="bg-[#1a1a1a] p-2 px-4 z-10 flex items-end gap-2 border-t border-[#262626]">
        {/* Paperclip */}
        <Button variant="ghost" size="icon" className="text-[#a3a3a3] h-10 w-10">
          <Paperclip className="h-6 w-6" />
        </Button>

        <form onSubmit={handleSendMessage} className="flex-1 flex items-end gap-2 mb-1">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message"
            className="flex-1 border-none bg-[#262626] text-[#fafafa] placeholder:text-[#a3a3a3] focus-visible:ring-1 focus-visible:ring-[#EBD062]/50 rounded-lg min-h-[40px] py-2"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim()}
            className="text-[#a3a3a3] hover:bg-transparent h-10 w-10 hover:text-[#EBD062]"
          >
            <Send className="h-6 w-6" />
          </Button>
        </form>
      </div>
    </div>
  )
}
