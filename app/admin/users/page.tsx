import { AdminRoute } from "@/components/admin/admin-route"
import { AdminLayout } from "@/components/layout/admin-layout"
import { UserManagementTable } from "@/components/admin/user-management-table"
import { getAdminUsersList } from "@/app/actions/admin/get-users"
import { RefreshUsersButton } from "@/components/admin/refresh-users-button"

export default async function AdminUsersPage() {
  const users = await getAdminUsersList()

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground mt-1">Manage user accounts, tiers, and permissions</p>
            </div>
            <RefreshUsersButton />
          </div>
          <UserManagementTable users={users} />
        </div>
      </AdminLayout>
    </AdminRoute>
  )
}
