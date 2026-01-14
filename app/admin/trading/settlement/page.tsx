import { AdminLayout } from "@/components/layout/admin-layout"
import { TradeSettlementView } from "@/components/admin/trading/trade-settlement-view"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function TradeSettlementPage() {
    const supabase = await createClient()

    // Initial Fetch: Active Trades (Open)
    const { data: activeTrades } = await supabase
        .from("trades")
        .select("*, profiles(email)")
        .eq("status", "open")
        .order("created_at", { ascending: false })

    // Initial Fetch: Settlement Logs (History)
    // We utilize the corrected RPC function here
    const { data: settlementLogs, error: logsError } = await supabase.rpc("get_settlement_logs", {
        p_outcome_filter: null, // 'all'
        p_limit: 100
    })

    // Fallback if RPC fails or returns no data
    const logs = settlementLogs || []

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Trade Settlement</h1>
                    <p className="text-muted-foreground mt-1">Manage active positions and review settlement audits.</p>
                </div>

                <TradeSettlementView
                    initialActiveTrades={activeTrades || []}
                    initialSettlementLogs={logs}
                />
            </div>
        </AdminLayout>
    )
}
