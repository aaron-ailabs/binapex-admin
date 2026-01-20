"use client"

import { useState, useRef, KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputBarProps {
  onSendMessage: (message: string) => Promise<void> | void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ChatInputBar({
  onSendMessage,
  placeholder = "Type your message...",
  disabled = false,
  className,
}: ChatInputBarProps) {
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async () => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || isSending || disabled) return

    setIsSending(true)
    try {
      await onSendMessage(trimmedMessage)
      setMessage("")
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsSending(false)
      // Refocus textarea
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

  const isDisabled = disabled || isSending

  return (
    <div
      className={cn(
        "sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className
      )}
    >
      <div className="flex items-end gap-2 p-3 md:p-4">
        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          rows={1}
          className={cn(
            "min-h-[44px] max-h-[120px] resize-none rounded-2xl border-muted bg-muted/30 px-4 py-3 text-sm",
            "placeholder:text-muted-foreground/60",
            "focus:border-gold/50 focus:ring-gold/30",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "hsl(var(--gold) / 0.3) transparent",
          }}
        />

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={isDisabled || !message.trim()}
          size="icon"
          className={cn(
            "h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-gold to-gold-dark text-black",
            "hover:from-gold-dark hover:to-gold",
            "disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:opacity-50",
            "transition-all duration-200",
            "shadow-lg shadow-gold/20",
            // Touch-friendly size
            "min-h-[44px] min-w-[44px]"
          )}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </div>

      {/* Helper text */}
      <div className="px-4 pb-2 text-xs text-muted-foreground md:hidden">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}
