import { AdminRoute } from "@/components/admin/admin-route"
import { AdminLayout } from "@/components/layout/admin-layout"
import { createClient } from "@/lib/supabase/server"
import { PlatformBankList } from "@/components/admin/platform-bank-list"

export const dynamic = "force-dynamic"

export default async function AdminBankAccountsPage() {
  const supabase = await createClient()

  const { data: accounts } = await supabase
    .from("platform_bank_accounts")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Platform Bank Accounts</h1>
            <p className="text-gray-400 mt-1">Manage bank accounts displayed to users for deposits</p>
          </div>
          <PlatformBankList accounts={accounts || []} />
        </div>
      </AdminLayout>
    </AdminRoute>
  )
}
