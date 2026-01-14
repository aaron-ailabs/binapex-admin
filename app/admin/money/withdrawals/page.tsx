import { AdminLayout } from "@/components/layout/admin-layout"
import { WithdrawalsTable } from "@/components/admin/money/withdrawals-table"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function WithdrawalsPage() {
    const supabase = await createClient()

    // Fetch withdrawals
    const { data: withdrawals } = await supabase
        .from("withdrawals")
        .select("*, profiles(email)")
        .order("created_at", { ascending: false })
        .limit(100)

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Withdrawals</h1>
                    <p className="text-muted-foreground mt-1">Process outgoing fund requests and audit history.</p>
                </div>
                <WithdrawalsTable data={withdrawals || []} />
            </div>
        </AdminLayout>
    )
}
