import { AdminRoute } from "@/components/admin/admin-route"
import { AdminLayout } from "@/components/layout/admin-layout"
import { createClient } from "@/lib/supabase/server"
import { BankAccountManager } from "@/components/admin/bank-account-manager"

export const dynamic = "force-dynamic"

export default async function AdminBankAccountsPage() {
  const supabase = await createClient()

  const { data: bankAccounts } = await supabase
    .from("platform_bank_accounts")
    .select("*")
    .order("display_order", { ascending: true })

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Platform Bank Accounts</h1>
            <p className="text-muted-foreground mt-1">Manage bank accounts for user deposits</p>
          </div>
          <BankAccountManager accounts={bankAccounts || []} />
        </div>
      </AdminLayout>
    </AdminRoute>
  )
}
