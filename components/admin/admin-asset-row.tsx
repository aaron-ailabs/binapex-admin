"use client"

import { useState, ChangeEvent } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Save, Loader2 } from "lucide-react"

interface Asset {
  id: string
  symbol: string
  name: string
  payout_rate: number
  is_active: boolean
}

interface AdminAssetRowProps {
  asset: Asset
}

export function AdminAssetRow({ asset }: AdminAssetRowProps) {
  const supabase = createClient()
  const [payoutRate, setPayoutRate] = useState(asset.payout_rate || 85) // Default to 85 if null
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (val >= 0 && val <= 100) {
      setPayoutRate(val)
      setHasChanges(true)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("assets")
        .update({ payout_rate: payoutRate })
        .eq("id", asset.id)

      if (error) throw error

      toast.success(`Updated ${asset.symbol} payout rate to ${payoutRate}%`)
      setHasChanges(false)
    } catch (error: any) {
      console.error("Update error:", error)
      toast.error("Failed to update payout rate")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      <td className="p-4">
        <div className="font-medium text-white">{asset.symbol}</div>
        <div className="text-xs text-gray-500 md:hidden">{asset.name}</div>
      </td>
      <td className="p-4 text-gray-400 hidden md:table-cell">{asset.name}</td>
      <td className="p-4">
        <div className="flex items-center gap-2 max-w-[150px]">
          <div className="relative w-full">
            <Input
              type="number"
              min="0"
              max="100"
              value={payoutRate}
              onChange={handleChange}
              className="bg-black/20 border-white/10 pr-8"
            />
            <span className="absolute right-3 top-2.5 text-xs text-gray-500">%</span>
          </div>
        </div>
      </td>
      <td className="p-4 text-right">
        {hasChanges && (
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
        )}
      </td>
    </tr>
  )
}
