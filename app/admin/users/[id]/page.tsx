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

  const { data: user } = await supabase.from("profiles").select("*").eq("id", params.id).single()

  if (!user) {
    redirect("/admin/users")
  }

  const [{ data: transactions }, { data: trades }, { data: tickets }] = await Promise.all([
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
  ])

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
          transactions={transactions || []}
          trades={trades || []}
          tickets={tickets || []}
          creditHistory={creditHistory}
        />
      </AdminLayout>
    </AdminRoute>
  )
}
