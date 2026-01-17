import { AdminRoute } from "@/components/admin/admin-route"
import { AdminLayout } from "@/components/layout/admin-layout"
import { createClient } from "@/lib/supabase/server"
import { UserDetailView } from "@/components/admin/user-detail-view"
import { redirect } from "next/navigation"
import { CreditScoreService } from "@/lib/services/credit-score-service"

export const dynamic = "force-dynamic"

export default async function AdminUserDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient()

  // 1. Fetch Profile
  const { data: user } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single()

  if (!user) {
    redirect("/admin/users")
  }

  // FIXME: The service role key was removed from this request path for security.
  // The original implementation used supabase.auth.admin.getUserById() to fetch
  // admin-only user auth data (e.g., last_sign_in_at, banned_until).
  // To restore this, create a SECURITY DEFINER RPC function that can be safely
  // called by an authenticated admin to retrieve these details for a specific user.
  const authUser = null;

  const allData = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("trades")
      .select("*, assets(symbol, name)")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("tickets").select("*").eq("user_id", params.id).order("created_at", { ascending: false }).limit(10),
    supabase
      .from("activity_log")
      .select("*")
      .eq("target_user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("wallets")
      .select("*")
      .eq("user_id", params.id),
  ])

  const transactions = allData[0].data || []
  const trades = allData[1].data || []
  const tickets = allData[2].data || []
  const activityLogs = allData[3].data || []
  const wallets = allData[4].data || []

  // Add wallets to user object for the view
  const userWithWallets = { ...user, wallets }

  let creditHistory: any[] = []
  try {
    creditHistory = await CreditScoreService.getCreditScoreHistory(params.id, 20)
  } catch (error) {
    console.error("Failed to fetch credit score history:", error)
  }

  return (
    <AdminRoute>
      <AdminLayout>
        <UserDetailView
          user={userWithWallets}
          authUser={authUser} // authUser is now null
          transactions={transactions}
          trades={trades}
          tickets={tickets}
          creditHistory={creditHistory}
          activityLogs={activityLogs}
        />
      </AdminLayout>
    </AdminRoute>
  )
}