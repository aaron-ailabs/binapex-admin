"use client"

import * as React from "react"
import { Search, Send, MoreVertical, Phone, Video, Paperclip, Smile, User, Circle, Loader2, Image as ImageIcon, FileText, Trash2, Edit2, X, Check } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import {
    getSupportChats,
    getChatMessages,
    sendMessage,
    markChatRead,
    uploadAttachment,
    editMessage,
    deleteMessage,
    type ChatUser,
    type ChatMessage
} from "@/lib/supabase/admin-chat"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"

export function SupportChatInterface() {
    const [chats, setChats] = React.useState<ChatUser[]>([])
    const [selectedChat, setSelectedChat] = React.useState<ChatUser | null>(null)
    const [messages, setMessages] = React.useState<ChatMessage[]>([])
    const [inputText, setInputText] = React.useState("")
    const [loadingChats, setLoadingChats] = React.useState(true)
    const [sending, setSending] = React.useState(false)
    const [uploading, setUploading] = React.useState(false)
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [editText, setEditText] = React.useState("")
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const supabase = createClient()

    // Fetch Sidebar Chats
    const fetchChats = React.useCallback(async () => {
        const data = await getSupportChats()
        setChats(data)
        setLoadingChats(false)
    }, [])

    // Initial Load & Realtime Subscription for Sidebar
    React.useEffect(() => {
        fetchChats()

        const channel = supabase
            .channel('admin-chat-list')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'support_messages' },
                () => {
                    fetchChats()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchChats, supabase])

    // Fetch Messages when Chat Selected
    React.useEffect(() => {
        if (!selectedChat) return

        const fetchMsgs = async () => {
            const msgs = await getChatMessages(selectedChat.user_id)
            setMessages(msgs)
            await markChatRead(selectedChat.user_id)
            fetchChats()
        }

        fetchMsgs()

        const channel = supabase
            .channel(`chat:${selectedChat.user_id}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to ALL events (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'support_messages',
                    filter: `user_id=eq.${selectedChat.user_id}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setMessages((prev) => [...prev, payload.new as ChatMessage])
                        if ((payload.new as ChatMessage).sender_role === 'user') {
                            markChatRead(selectedChat.user_id)
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new as ChatMessage : m))
                    } else if (payload.eventType === 'DELETE') {
                        setMessages((prev) => prev.filter(m => m.id !== payload.old.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedChat, fetchChats, supabase])

    // Auto-scroll
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages, editingId])

    const handleSend = async () => {
        if ((!inputText.trim() && !uploading) || !selectedChat) return

        setSending(true)
        const content = inputText
        setInputText("")

        const newMsg = await sendMessage(selectedChat.user_id, content)
        if (!newMsg) {
            setInputText(content)
        }
        setSending(false)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !selectedChat) return

        setUploading(true)
        const file = e.target.files[0]

        try {
            const result = await uploadAttachment(file)
            if (result) {
                await sendMessage(selectedChat.user_id, `Sent an attachment: ${file.name}`, result.url, result.type)
            }
        } catch (error) {
            console.error("Upload failed", error)
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleEdit = async (messageId: string) => {
        if (!editText.trim()) return
        await editMessage(messageId, editText)
        setEditingId(null)
        setEditText("")
    }

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-xl border border-white/10 bg-card/30 backdrop-blur-sm shadow-2xl">
            {/* Sidebar - Chat List */}
            <div className="w-80 border-r border-white/10 flex flex-col bg-black/20">
                <div className="p-4 border-b border-white/5">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search user..." className="pl-8 bg-white/5 border-white/10 focus-visible:ring-primary/20" />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    {loadingChats ? (
                        <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <div className="flex flex-col gap-1 p-2">
                            {chats.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                    <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                                    <p className="text-sm">No active chats</p>
                                </div>
                            ) : (
                                chats.map((chat) => (
                                    <button
                                        key={chat.user_id}
                                        onClick={() => setSelectedChat(chat)}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/5",
                                            selectedChat?.user_id === chat.user_id ? "bg-primary/10 hover:bg-primary/15" : ""
                                        )}
                                    >
                                        <div className="relative">
                                            <Avatar>
                                                <AvatarImage src={chat.avatar_url} />
                                                <AvatarFallback>{chat.full_name?.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-sm truncate text-foreground">{chat.full_name || chat.email}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {chat.last_message_time ? formatTime(chat.last_message_time) : ""}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">{chat.last_message}</p>
                                        </div>
                                        {chat.unread_count > 0 && (
                                            <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground text-[10px]">
                                                {chat.unread_count}
                                            </Badge>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-card/10">
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/20">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={selectedChat.avatar_url} />
                                    <AvatarFallback>{selectedChat.full_name?.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-bold text-sm text-foreground">{selectedChat.full_name}</h3>
                                    <p className="text-xs text-muted-foreground">{selectedChat.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={cn("flex w-full group/message", msg.sender_role === 'admin' ? "justify-end" : "justify-start")}>

                                        {/* Admin Actions (Left side for admin messages) */}
                                        {msg.sender_role === 'admin' && editingId !== msg.id && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/message:opacity-100 transition-opacity mr-2 self-center">
                                                        <MoreVertical className="h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => { setEditingId(msg.id); setEditText(msg.content); }}>
                                                        <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}

                                        <div className={cn(
                                            "max-w-[70%] p-3 rounded-2xl text-sm relative group",
                                            msg.sender_role === 'admin'
                                                ? "bg-primary text-primary-foreground rounded-br-none"
                                                : "bg-white/10 text-foreground rounded-bl-none"
                                        )}>

                                            {/* Attachments */}
                                            {msg.attachment_url && (
                                                <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                                                    {msg.attachment_type === 'image' ? (
                                                        <div className="relative h-48 w-full max-w-sm">
                                                            <Image
                                                                src={msg.attachment_url}
                                                                alt="Attachment"
                                                                fill
                                                                className="object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                                onClick={() => window.open(msg.attachment_url, '_blank')}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <a
                                                            href={msg.attachment_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center gap-2 p-3 bg-black/20 hover:bg-black/30 transition-colors"
                                                        >
                                                            <FileText className="h-5 w-5" />
                                                            <span className="underline truncate max-w-[200px]">View Attachment</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {/* Editing Mode */}
                                            {editingId === msg.id ? (
                                                <div className="flex flex-col gap-2 min-w-[200px]">
                                                    <Input
                                                        className="bg-black/20 border-white/10 h-8 text-xs"
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-1">
                                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}>
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 bg-white/10 hover:bg-white/20" onClick={() => handleEdit(msg.id)}>
                                                            <Check className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p>{msg.content}</p>
                                            )}

                                            <span className={cn(
                                                "text-[10px] absolute -bottom-5 w-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity",
                                                msg.sender_role === 'admin' ? "text-right right-0 text-muted-foreground" : "text-left left-0 text-muted-foreground"
                                            )}>
                                                {formatTime(msg.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-4 bg-black/20 border-t border-white/10">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex items-end gap-2 bg-white/5 p-2 rounded-xl border border-white/5 focus-within:border-primary/30 transition-colors"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
                                    disabled={uploading}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                                </Button>
                                <Input
                                    className="flex-1 bg-transparent border-none focus-visible:ring-0 py-2 text-sm placeholder:text-muted-foreground"
                                    placeholder={uploading ? "Uploading..." : "Type a message..."}
                                    value={inputText}
                                    disabled={uploading}
                                    onChange={(e) => setInputText(e.target.value)}
                                    autoComplete="off"
                                />
                                <Button
                                    type="submit"
                                    disabled={sending || uploading || !inputText.trim()}
                                    size="icon"
                                    className={cn("h-9 w-9 shrink-0 rounded-lg transition-all", inputText ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-white/10 text-muted-foreground hover:bg-white/20")}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center flex-col text-muted-foreground gap-2">
                        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center">
                            <MessageSquare className="h-6 w-6 opacity-80" />
                        </div>
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    )
}
import { MessageSquare } from "lucide-react"

