
import { AdminLayout } from "@/components/layout/admin-layout"
import { AdminRoute } from "@/components/admin/admin-route"
import { TradeSettlementTable } from "@/components/admin/trade-settlement-table"

export default function AdminTradesPage() {
  return (
    <AdminRoute>
      <AdminLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-white">Trade Settlement</h1>
            <p className="text-gray-400 text-sm">Monitor and settle pending binary options trades manually.</p>
          </div>

          <TradeSettlementTable />
        </div>
      </AdminLayout>
    </AdminRoute>
  )
}
