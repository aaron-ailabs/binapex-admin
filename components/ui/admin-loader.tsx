"use client"

import { Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface AdminLoaderProps {
  type?: "spinner" | "table" | "card"
  count?: number // for table rows
  height?: string // for table rows
  text?: string // for spinner
  className?: string
}

export function AdminLoader({ type = "spinner", count = 5, height = "h-12", text, className }: AdminLoaderProps) {
  if (type === "spinner") {
    return (
      <div className={`flex flex-col items-center justify-center p-8 space-y-4 min-h-[200px] ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {text && <p className="text-sm text-muted-foreground animate-pulse">{text}</p>}
      </div>
    )
  }

  if (type === "table") {
    return (
      <div className={`space-y-3 w-full ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className={`w-full ${height} bg-muted/50`} />
        ))}
      </div>
    )
  }

  return <Skeleton className={`w-full h-[200px] bg-muted/50 ${className}`} />
}
