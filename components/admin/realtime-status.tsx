"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { logError, logInfo } from "@/lib/utils"

export function RealtimeStatus() {
  const [status, setStatus] = useState<"CONNECTED" | "DISCONNECTED" | "CONNECTING">("CONNECTING")
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel("system_health")
      .subscribe((state) => {
        if (state === "SUBSCRIBED") {
          setStatus("CONNECTED")
          logInfo("Realtime", "Connected")
        }
        if (state === "CLOSED") {
          setStatus("DISCONNECTED")
          logInfo("Realtime", "Disconnected")
        }
        if (state === "CHANNEL_ERROR") {
          setStatus("DISCONNECTED")
          logError("Realtime", "Channel Error")
        }
        if (state === "TIMED_OUT") {
          setStatus("DISCONNECTED")
          logError("Realtime", "Timed Out")
        }
      })

    return () => {
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [supabase, user])

  if (!user) return null

  return (
    <div className="flex items-center gap-2">
      {status === "CONNECTED" ? (
        <Badge variant="outline" className="gap-1 border-green-500/50 text-green-500 bg-green-500/10">
          <Wifi className="h-3 w-3" />
          <span className="hidden sm:inline">Live</span>
        </Badge>
      ) : (
        <Badge variant="destructive" className="gap-1">
          <WifiOff className="h-3 w-3" />
          <span className="hidden sm:inline">Offline</span>
        </Badge>
      )}
    </div>
  )
}
