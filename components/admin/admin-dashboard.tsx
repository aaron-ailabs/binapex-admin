"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Users, DollarSign, TrendingUp, Activity, MessageSquare } from "lucide-react"
import { useAdminRealtime } from "@/hooks/use-admin-realtime"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface AdminDashboardProps {
  initialStats: {
    pendingDeposits: number
    activeUsers: number
    openTrades: number
  }
  recentDeposits: any[]
}

export function AdminDashboard({ initialStats, recentDeposits }: AdminDashboardProps) {
  const router = useRouter()
  const { stats, isConnected } = useAdminRealtime()

  // Use real-time stats if available, otherwise use initial stats
  const currentStats = {
    pendingDeposits: stats.pendingDeposits || initialStats.pendingDeposits,
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      <div className="grid gap-6">
        {/* Recent Deposits */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <h3 className="text-lg font-bold">Recent Deposits</h3>
            <Link href="/admin/finance">
              <Button variant="ghost" size="sm" className="hover:bg-white/5 text-xs">
                View All
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-gray-500 font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium text-center">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-12">No pending deposits</td>
                  </tr>
                ) : (
                  recentDeposits.map((deposit) => (
                    <tr 
                      key={deposit.id} 
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => router.push("/admin/finance")}
                    >
                      <td className="px-6 py-3">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{deposit.profiles?.email || "Unknown User"}</span>
                          <span className="text-[10px] text-gray-500 font-mono uppercase">{deposit.user_id.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className="text-white font-bold font-mono">
                          {deposit.currency} {Number(deposit.amount).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                          PENDING
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right text-gray-500 text-xs">
                        {format(new Date(deposit.created_at), "HH:mm")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
          <Link href="/admin/support">
            <Button
              variant="outline"
              className="w-full justify-start border-border hover:border-primary/50 bg-transparent"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Support Chats
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
        </div>
      </GlassCard>
    </div>
  )
}
