import { AdminLayout } from "@/components/layout/admin-layout"
import { DepositsTable } from "@/components/admin/money/deposits-table"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function DepositsPage() {
    const supabase = await createClient()

    // Fetch deposits
    const { data: deposits } = await supabase
        .from("transactions") // Assuming deposits are in transactions with type='deposit'
        .select("*, profiles(email)")
        .eq("type", "deposit")
        .order("created_at", { ascending: false })
        .limit(100)

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Deposits</h1>
                    <p className="text-muted-foreground mt-1">Review and manage incoming fund requests.</p>
                </div>
                <DepositsTable data={deposits || []} />
            </div>
        </AdminLayout>
    )
}
