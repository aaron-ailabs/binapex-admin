import { AdminLayout } from "@/components/layout/admin-layout"
import { UsersTable } from "@/components/admin/users/users-table"
import { adminListUsers } from "@/lib/admin-rpc"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  // Fetch initial users list (server-side) using secure RPC wrapper
  const { data: users, error } = await adminListUsers(1, 50, null)

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
