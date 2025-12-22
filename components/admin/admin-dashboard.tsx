"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Users, DollarSign, MessageSquare, TrendingUp, Activity } from "lucide-react"
import { useAdminRealtime } from "@/hooks/use-admin-realtime"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface AdminDashboardProps {
  initialStats: {
    pendingDeposits: number
    openTickets: number
    activeUsers: number
    openTrades: number
  }
  recentDeposits: any[]
  recentTickets: any[]
}

export function AdminDashboard({ initialStats, recentDeposits, recentTickets }: AdminDashboardProps) {
  const { stats, isConnected } = useAdminRealtime()

  // Use real-time stats if available, otherwise use initial stats
  const currentStats = {
    pendingDeposits: stats.pendingDeposits || initialStats.pendingDeposits,
    openTickets: stats.openTickets || initialStats.openTickets,
    activeUsers: stats.activeUsers || initialStats.activeUsers,
    openTrades: stats.openTrades || initialStats.openTrades,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">Monitor platform activity in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-gray-500"}`} />
          <span className="text-sm text-gray-400">{isConnected ? "Live" : "Connecting..."}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Active Users</p>
              <p className="text-3xl font-bold text-white font-mono">{currentStats.activeUsers}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Pending Deposits</p>
              <p className="text-3xl font-bold text-white font-mono">{currentStats.pendingDeposits}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
              <MessageSquare className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Open Tickets</p>
              <p className="text-3xl font-bold text-white font-mono">{currentStats.openTickets}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Open Trades</p>
              <p className="text-3xl font-bold text-white font-mono">{currentStats.openTrades}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Deposits */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Recent Deposits</h3>
            <Link href="/admin/finance">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentDeposits.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No pending deposits</p>
            ) : (
              recentDeposits.map((deposit) => (
                <div key={deposit.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white font-mono">
                      {deposit.currency} {Number(deposit.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">{format(new Date(deposit.created_at), "MMM dd, HH:mm")}</p>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Pending
                  </Badge>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Recent Tickets */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Recent Tickets</h3>
            <Link href="/admin/tickets">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentTickets.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No open tickets</p>
            ) : (
              recentTickets.map((ticket) => (
                <div key={ticket.id} className="p-3 bg-black/30 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-white line-clamp-1">{ticket.subject}</p>
                    <Badge
                      variant="outline"
                      className={
                        ticket.priority === "urgent"
                          ? "bg-red-500/10 text-red-500 border-red-500/20"
                          : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      }
                    >
                      {ticket.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {ticket.profiles?.full_name || ticket.profiles?.email || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500">{format(new Date(ticket.created_at), "MMM dd, HH:mm")}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/finance">
            <Button
              variant="outline"
              className="w-full justify-start border-border hover:border-primary/50 bg-transparent"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Approve Deposits
            </Button>
          </Link>
          <Link href="/admin/tickets">
            <Button
              variant="outline"
              className="w-full justify-start border-border hover:border-primary/50 bg-transparent"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Review Tickets
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button
              variant="outline"
              className="w-full justify-start border-border hover:border-primary/50 bg-transparent"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
          </Link>
          <Link href="/admin/risk">
            <Button
              variant="outline"
              className="w-full justify-start border-border hover:border-primary/50 bg-transparent"
            >
              <Activity className="h-4 w-4 mr-2" />
              Risk Monitor
            </Button>
          </Link>
        </div>
      </GlassCard>
    </div>
  )
}
