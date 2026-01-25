import { createClient } from "@/lib/supabase/server"
import { AdminLayout } from "@/components/layout/admin-layout"
import { AdminRoute } from "@/components/admin/admin-route"
import { AssetsTable } from "@/components/admin/assets/assets-table"
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
            <AssetsTable assets={assets || []} />
          )}
        </div>
      </AdminLayout>
    </AdminRoute>
  )
}
