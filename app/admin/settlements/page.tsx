import { AdminRoute } from "@/components/admin/admin-route"
import { AdminLayout } from "@/components/layout/admin-layout"
import { TradeSettlementHistoryTable } from "@/components/admin/trade-settlement-history-table"

export const dynamic = "force-dynamic"

export default function AdminSettlementsPage() {
  return (
    <AdminRoute>
      <AdminLayout>
        <TradeSettlementHistoryTable />
      </AdminLayout>
    </AdminRoute>
  )
}

