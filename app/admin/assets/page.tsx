import { createClient } from "@/lib/supabase/server"
import { AdminLayout } from "@/components/layout/admin-layout"
import { AdminRoute } from "@/components/admin/admin-route"
import { AdminAssetRow } from "@/components/admin/admin-asset-row"
import { GlassCard } from "@/components/ui/glass-card"

export const dynamic = "force-dynamic"

export default async function AdminAssetsPage() {
  const supabase = await createClient()

  // Fetch all assets
  const { data: assets, error } = await supabase
    .from("assets")
    .select("*")
    .order("symbol", { ascending: true })

  if (error) {
    console.error("Error fetching assets:", error)
  }

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Asset Management</h1>
          </div>

          {error ? (
            <div className="text-red-500">Error loading assets. Please try again.</div>
          ) : (
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-gray-400 uppercase font-mono text-xs hidden md:table-header-group">
                    <tr>
                      <th className="p-4">Asset</th>
                      <th className="p-4 hidden md:table-cell">Name</th>
                      <th className="p-4">Payout Rate</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {assets?.map((asset: any) => (
                      <AdminAssetRow key={asset.id} asset={asset} />
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </div>
      </AdminLayout>
    </AdminRoute>
  )
}
