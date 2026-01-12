
import { AdminLayout } from "@/components/layout/admin-layout"
import { AdminRoute } from "@/components/admin/admin-route"
import { TradeSettlementTable } from "@/components/admin/trade-settlement-table"
import { TradeSettlementHistoryTable } from "@/components/admin/trade-settlement-history-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = "force-dynamic"

export default function AdminTradesPage() {
  return (
    <AdminRoute>
      <AdminLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-white">Trade Management</h1>
            <p className="text-gray-400 text-sm">Monitor open positions and audit settled trade history.</p>
          </div>

          <Tabs defaultValue="active" className="w-full">
            <TabsList className="bg-black/20 border border-white/10">
              <TabsTrigger value="active" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                Active Trades
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                Trade History
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-6">
              <TradeSettlementTable />
            </TabsContent>
            <TabsContent value="history" className="mt-6">
              <TradeSettlementHistoryTable />
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </AdminRoute>
  )
}
