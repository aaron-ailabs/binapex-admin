import { AdminRoute } from "@/components/admin/admin-route"
import { AdminLayout } from "@/components/layout/admin-layout"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js" // Import generic client for Admin ops
import { UserDetailView } from "@/components/admin/user-detail-view"
import { redirect } from "next/navigation"
import { CreditScoreService } from "@/lib/services/credit-score-service"

export const dynamic = "force-dynamic"

export default async function AdminUserDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient()

  // 1. Fetch Profile (using RLS context)
  const { data: user } = await supabase.from("profiles").select("*").eq("id", params.id).single()

  if (!user) {
    redirect("/admin/users")
  }

  // 2. Fetch Auth User Data (using Admin Client)
  // We need this for Last Login, Banned Status, and Email verification status
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.admin.getUserById(params.id)

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
      .from("withdrawal_password_audit")
      .select("*")
      .eq("user_id", params.id)
      .order("timestamp", { ascending: false })
      .limit(20),
    supabase
      .from("user_withdrawal_secrets")
      .select("*")
      .eq("user_id", params.id)
      .single(),
    supabase
      .from("admin_audit_logs")
      .select("*")
      .eq("target_user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(20)
  ])

  // Destructure properly
  const transactions = allData[0].data || []
  const trades = allData[1].data || []
  const tickets = allData[2].data || []
  const auditLogs = allData[3].data || []
  const secret = allData[4].data || null
  const adminAuditLogs = allData[5].data || []

  // Combine logs for cleaner view, or pass separate
  // We'll pass adminAuditLogs separately or merge them if the view supports it.
  // For now, let's keep existing structure but add admin logs if helpful. 
  // UserDetailView expects `auditLogs` for withdrawal password. We'll stick to that for now.

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
          user={user}
          authUser={authUser} // Pass Auth User Data
          transactions={transactions}
          trades={trades}
          tickets={tickets}
          creditHistory={creditHistory}
          auditLogs={auditLogs}
          secret={secret}
        />
      </AdminLayout>
    </AdminRoute>
  )
}
