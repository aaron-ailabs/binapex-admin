"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { useAuth } from "@/contexts/auth-context"
import { logError, logInfo } from "@/lib/utils"

interface LiveStats {
  pendingDeposits: number
  openTickets: number
  activeUsers: number
  openTrades: number
}

export function useAdminRealtime() {
  const { user, isAuthenticated } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [stats, setStats] = useState<LiveStats>({
    pendingDeposits: 0,
    openTickets: 0,
    activeUsers: 0,
    openTrades: 0,
  })
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) return

    let channel: RealtimeChannel | null = null

    const fetchStats = async () => {
      try {
        const [depositsResult, ticketsResult, usersResult, tradesResult] = await Promise.all([
          supabase
            .from("transactions")
            .select("id", { count: "exact", head: true })
            .eq("type", "deposit")
            .eq("status", "pending"),
          supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("trades").select("id", { count: "exact", head: true }).eq("status", "open"),
        ])

        setStats({
          pendingDeposits: depositsResult.count || 0,
          openTickets: ticketsResult.count || 0,
          activeUsers: usersResult.count || 0,
          openTrades: tradesResult.count || 0,
        })
      } catch (e) {
        logError("API admin_realtime.fetchStats", e)
      }
    }

    fetchStats()

    channel = supabase
      .channel("admin-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: "type=eq.deposit",
        },
        (payload) => {
          setStats((prev) => ({ ...prev, pendingDeposits: prev.pendingDeposits + 1 }))
          toast.info("New deposit request received", {
            description: `Transaction ID: ${payload.new.id}`,
          })
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: "type=eq.deposit",
        },
        (payload: any) => {
          if (payload.old.status === "pending" && payload.new.status !== "pending") {
            setStats((prev) => ({
              ...prev,
              pendingDeposits: Math.max(0, prev.pendingDeposits - 1),
            }))
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tickets",
        },
        (payload: any) => {
          setStats((prev) => ({ ...prev, openTickets: prev.openTickets + 1 }))
          toast.info("New support ticket", {
            description: payload.new.subject || "New ticket submitted",
          })
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
        },
        (payload: any) => {
          if (payload.old.status === "open" && payload.new.status !== "open") {
            setStats((prev) => ({
              ...prev,
              openTickets: Math.max(0, prev.openTickets - 1),
            }))
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trades",
        },
        (payload: any) => {
          if (payload.new.status === "open") {
            setStats((prev) => ({ ...prev, openTrades: prev.openTrades + 1 }))
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trades",
        },
        (payload: any) => {
          if (payload.old.status === "open" && payload.new.status !== "open") {
            setStats((prev) => ({ ...prev, openTrades: Math.max(0, prev.openTrades - 1) }))
          } else if (payload.old.status !== "open" && payload.new.status === "open") {
            setStats((prev) => ({ ...prev, openTrades: prev.openTrades + 1 }))
          }
        },
      )
      .subscribe((state) => {
        setIsConnected(state === "SUBSCRIBED")
        logInfo("Realtime", `admin-updates ${state}`)
        if (state === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error for admin-updates')
        }
      })

    return () => {
      if (channel) {
        channel.unsubscribe()
        supabase.removeChannel(channel)
      }
    }
  }, [isAuthenticated, supabase, user])

  return { stats, isConnected }
}
