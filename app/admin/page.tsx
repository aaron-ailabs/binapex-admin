import { AdminRoute } from "@/components/admin/admin-route"
import { AdminLayout } from "@/components/layout/admin-layout"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const supabase = await createClient()

  // Fetch initial data for stats
  const [depositsResult, usersResult, tradesResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("type", "deposit")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("trades").select("id", { count: "exact", head: true }).eq("status", "open"),
  ])

  const initialStats = {
    pendingDeposits: depositsResult.data?.length || 0,
    activeUsers: usersResult.count || 0,
    openTrades: tradesResult.count || 0, // Actually Open Limit Orders
  }

  return (
    <AdminRoute>
      <AdminLayout>
        <AdminDashboard
          initialStats={initialStats}
          recentDeposits={depositsResult.data || []}
        />
      </AdminLayout>
    </AdminRoute>
  )
}
