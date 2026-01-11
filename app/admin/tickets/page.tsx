import { AdminRoute } from "@/components/admin/admin-route"
import { AdminLayout } from "@/components/layout/admin-layout"
import { createClient } from "@/lib/supabase/server"
import { AdminTicketDesk } from "@/components/admin/admin-ticket-desk"

export const dynamic = "force-dynamic"

export default async function AdminTicketsPage() {
  const supabase = await createClient()

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false })

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Support Desk</h1>
            <p className="text-muted-foreground mt-1">Manage support tickets and respond to users</p>
          </div>
          <AdminTicketDesk tickets={tickets || []} />
        </div>
      </AdminLayout>
    </AdminRoute>
  )
}
