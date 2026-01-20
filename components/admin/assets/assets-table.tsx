"use client"

import { useState } from "react"
import { AdminAssetRow } from "@/components/admin/admin-asset-row"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface AssetsTableProps {
  assets: any[]
}

export function AssetsTable({ assets }: AssetsTableProps) {
  const [page, setPage] = useState(1)
  // TODO: Switch to server pagination if assets > 500.
  const pageSize = 50
  const totalPages = Math.ceil(assets.length / pageSize)

  const paginatedAssets = assets.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">
      <GlassCard className="overflow-hidden border-border p-0">
        <div className="overflow-x-auto relative max-h-[600px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/80 backdrop-blur-md sticky top-0 z-10 text-gray-500 font-mono text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Asset</th>
                <th className="px-6 py-3 hidden md:table-cell">Name</th>
                <th className="px-6 py-3">Payout Rate</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedAssets.map((asset) => (
                <AdminAssetRow key={asset.id} asset={asset} />
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
