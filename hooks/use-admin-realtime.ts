"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface LiveStats {
  pendingDeposits: number
  openTickets: number
  activeUsers: number
  openTrades: number
}

export function useAdminRealtime() {
  const [stats, setStats] = useState<LiveStats>({
    pendingDeposits: 0,
    openTickets: 0,
    activeUsers: 0,
    openTrades: 0,
  })
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel

    const setupRealtime = async () => {
      // Fetch initial stats
      const fetchStats = async () => {
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
      }

      await fetchStats()

      // Subscribe to real-time updates
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
             if (payload.new.status === 'open') {
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
            } 
            else if (payload.old.status !== "open" && payload.new.status === "open") {
               setStats((prev) => ({ ...prev, openTrades: prev.openTrades + 1 }))
            }
          },
        )
        .subscribe((status) => {
          setIsConnected(status === "SUBSCRIBED")
        })
    }

    setupRealtime()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  return { stats, isConnected }
}
