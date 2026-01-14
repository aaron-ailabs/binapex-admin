import { AdminLayout } from "@/components/layout/admin-layout"
import { UsersTable } from "@/components/admin/users/users-table"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const supabase = await createClient()

  // Fetch initial users list (server-side)
  // We fetch a bit more than usual to populate the table initially
  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">View and manage all user accounts, KYC status, and permissions.</p>
        </div>

        {/* We pass initial data to the client component which handles search/filter/pagination locally or via server actions */}
        <UsersTable initialData={users || []} />
      </div>
    </AdminLayout>
  )
}
